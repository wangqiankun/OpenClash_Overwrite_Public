// Stash iOS 定时任务：读取活动连接增量，按域名和代理节点上报。
// cron.argument 需为 JSON：{"api":"http://127.0.0.1:9090","apiSecret":"...","reportToken":"..."}
const DEFAULT_API = "http://127.0.0.1:9090";
const REPORT_URL = "https://traffic.991886.xyz/api/report";
const STATE_KEY = "stash-traffic-collector-v1";
const MIN_REPORT_BYTES = 10240;

// 将异步 HTTP 回调封装为 Promise，便于按顺序采样和提交。
function request(options) {
  return new Promise((resolve, reject) => {
    $httpClient.get(options, (error, response, data) => {
      if (error) return reject(new Error(error));
      resolve({ response, data });
    });
  });
}

// 规范化连接目标，优先使用 Stash 提供的域名，缺失时退回目的地址。
function connectionDomain(connection) {
  const metadata = connection.metadata || {};
  const value = metadata.host || metadata.destinationHost || metadata.destinationIP || "";
  return String(value).trim().toLowerCase().replace(/\.$/, "").slice(0, 253);
}

// 累加连接计数器相对上次采样的正向增量。
function addDelta(target, key, dl, ul) {
  const item = target[key] || { dl: 0, ul: 0 };
  item.dl += dl;
  item.ul += ul;
  target[key] = item;
}

// 按手机本地时区生成日期，和现有路由器采集器的日统计口径一致。
function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// 仅展示字段名和类型，帮助核对不同 Stash 版本的响应结构，不记录字段值。
function connectionShape(value, depth = 0) {
  if (value === null) return "null";
  if (depth >= 2) return Array.isArray(value) ? "array" : typeof value;
  if (Array.isArray(value)) return value.length ? [connectionShape(value[0], depth + 1)] : [];
  if (typeof value !== "object") return typeof value;
  const shape = {};
  for (const key of Object.keys(value)) shape[key] = connectionShape(value[key], depth + 1);
  return shape;
}

// 从当前快照提取代理链末端节点及流量变化，排除直连和拒绝连接。
function collect(connections, state) {
  const current = {};
  const totals = state.totals || {};
  const skipped = { missingId: 0, missingDomain: 0, missingChains: 0, excludedNode: 0, invalidCounters: 0 };
  for (const connection of connections) {
    const id = String(connection.id || "");
    const chains = Array.isArray(connection.chains) ? connection.chains : [];
    const domain = connectionDomain(connection);
    // 分别计数缺失字段；同一连接可能同时缺少多个必要字段。
    if (!id) skipped.missingId++;
    if (!domain) skipped.missingDomain++;
    if (!chains.length) skipped.missingChains++;
    if (!id || !domain || !chains.length) continue;

    const node = String(chains[0] || "").trim();
    if (!node || ["DIRECT", "REJECT", "GLOBAL"].includes(node.toUpperCase())) {
      skipped.excludedNode++;
      continue;
    }
    const groups = chains.slice(1).filter(g => g && !["DIRECT", "REJECT", "GLOBAL"].includes(String(g).toUpperCase()));
    const group = groups.length ? String(groups[groups.length - 1]).trim().slice(0, 64) : "";
    // Stash 返回含 total 的统计对象；同时兼容 Clash 的数字累计计数器。
    const download = connection.download;
    const upload = connection.upload;
    const dl = Number(download && typeof download === "object" ? download.total : (download || 0));
    const ul = Number(upload && typeof upload === "object" ? upload.total : (upload || 0));
    if (!Number.isFinite(dl) || !Number.isFinite(ul) || dl < 0 || ul < 0) {
      skipped.invalidCounters++;
      continue;
    }

    current[id] = { domain, node, group, dl, ul };
    const previous = state.connections && state.connections[id];
    const deltaDl = Math.max(0, dl - (previous ? previous.dl : 0));
    const deltaUl = Math.max(0, ul - (previous ? previous.ul : 0));
    if (deltaDl || deltaUl) addDelta(totals, `${domain}\n${node}\n${group}`, deltaDl, deltaUl);
  }
  state.connections = current;
  state.totals = totals;
  console.log(`连接过滤：缺少 ID ${skipped.missingId}，缺少目标 ${skipped.missingDomain}，缺少代理链 ${skipped.missingChains}，直连/拒绝/空节点 ${skipped.excludedNode}，无效计数器 ${skipped.invalidCounters}`);
  if (connections.length && !Object.keys(current).length) {
    console.log(`连接字段结构（仅类型）: ${JSON.stringify(connectionShape(connections[0]))}`);
  }
  return state;
}

// 主流程：采样、持久化，再上报达到阈值的数据；失败时保留累计量供下次重试。
async function main() {
  const startedAt = Date.now();
  let stage = "读取配置";
  // 在任何网络请求前留下版本标记，区分脚本未加载和执行中途超时。
  console.log("Stash 流量采集启动 v1.3");
  try {
    const config = typeof $argument === "string" ? JSON.parse($argument) : ($argument || {});
    if (!config.apiSecret || !config.reportToken) throw new Error("缺少 apiSecret 或 reportToken 配置");

    const stored = $persistentStore.read(STATE_KEY);
    const state = stored ? JSON.parse(stored) : { connections: {}, totals: {} };
    const api = String(config.api || DEFAULT_API).replace(/\/$/, "");
    stage = "读取 Stash API";
    console.log("正在读取 /connections（超时 10 秒）");
    const result = await request({
      url: `${api}/connections`,
      headers: { Authorization: `Bearer ${config.apiSecret}` },
      timeout: 10
    });
    console.log(`Stash API HTTP ${result.response && result.response.status}`);
    if (!result.response || result.response.status !== 200) throw new Error(`Stash API HTTP ${result.response && result.response.status}`);

    const snapshot = typeof result.data === "string" ? JSON.parse(result.data) : result.data;
    const connections = Array.isArray(snapshot) ? snapshot : snapshot.connections;
    if (!Array.isArray(connections)) throw new Error("/connections 响应缺少 connections 数组");
    collect(connections, state);
    // 仅记录数量，不输出域名、节点、接口地址或鉴权参数。
    console.log(`活动连接 ${connections.length}，有效代理连接 ${Object.keys(state.connections).length}`);

    const records = [];
    const keysToDelete = [];
    for (const [key, value] of Object.entries(state.totals)) {
      if (value.dl + value.ul < MIN_REPORT_BYTES) continue;
      const parts = key.split("\n");
      const domain = parts[0];
      const node = parts[1];
      const group = parts[2] || "";
      records.push({ domain, node, group, dl: value.dl, ul: value.ul });
      keysToDelete.push(key);
    }
    // 先保存采样结果，崩溃或离线时下次仍可续传。
    $persistentStore.write(JSON.stringify(state), STATE_KEY);
    if (!records.length) {
      const pending = Object.values(state.totals);
      const bytes = pending.reduce((total, value) => total + value.dl + value.ul, 0);
      console.log(`本次未上报：累计 ${pending.length} 条、${bytes} 字节，每条需达到 ${MIN_REPORT_BYTES} 字节`);
      return;
    }

    stage = "上传流量";
    console.log(`准备上报 ${records.length} 条记录（超时 15 秒）`);
    const payload = JSON.stringify({
      source: "stash",
      date: localDate(),
      records
    });
    const uploaded = await new Promise((resolve, reject) => {
      $httpClient.post({
        url: REPORT_URL,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Stash-iOS-Traffic-Collector/1.0",
          Authorization: `Bearer ${config.reportToken}`
        },
        body: payload,
        timeout: 15
      }, (error, response, data) => {
        if (error) return reject(new Error(error));
        resolve({ response, data });
      });
    });
    if (!uploaded.response || uploaded.response.status !== 200) {
      throw new Error(`上报 HTTP ${uploaded.response && uploaded.response.status}`);
    }

    // 成功后清除已经提交的域名节点累计量。
    for (const key of keysToDelete) delete state.totals[key];
    $persistentStore.write(JSON.stringify(state), STATE_KEY);
    console.log(`已上报 ${records.length} 条 Stash 流量记录`);
  } catch (error) {
    console.log(`Stash 流量采集失败: [${stage}] ${error.message || error}`);
  } finally {
    console.log(`Stash 流量采集结束，耗时 ${Date.now() - startedAt} 毫秒`);
    $done();
  }
}

main();
