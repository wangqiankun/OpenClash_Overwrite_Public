# OpenClash 配置与网络工具

本仓库以 OpenClash/Mihomo 配置为核心，同时维护代理流量监控、Emby 下载器及若干更新和运维脚本。公共仓库只同步明确列入白名单的配置与规则文件；各模块的代码位置和入口见下表。

## 功能模块

| 模块 | 功能 | 访问入口 / 使用方式 | 主要文件 |
| --- | --- | --- | --- |
| OpenClash 666OS DNS 配置 | Mihomo Meta 核心参数、DNS 与嗅探覆写、666OS 配置下载及 Sub-Store 订阅注入 | [公共配置仓库](https://github.com/wangqiankun/OpenClash_Overwrite_Public) · [问题反馈](https://github.com/wangqiankun/OpenClash_Overwrite_Public/issues) · [覆写模块地址](https://gh-proxy.991886.xyz/https://raw.githubusercontent.com/wangqiankun/OpenClash_Overwrite_Public/refs/heads/main/Overwrite/666OS-dns.conf) | [`Overwrite/666OS-dns.conf`](Overwrite/666OS-dns.conf)、[`Yaml/666OS-DNS-Conf.yaml`](Yaml/666OS-DNS-Conf.yaml) |
| 自定义分流规则 | AI、加密货币、直连域名/IP、下载、Emby、IP 检测和代理域名规则 | 由 666OS YAML 中的 rule provider 加载 | [`Rules/`](Rules/) |
| 代理流量监控 | OpenWrt 与 Stash 采集代理连接流量，Worker 接收并展示统计 | [监控面板](https://traffic.991886.xyz)；OpenWrt 采集端向 `/api/report` 上报 | 源仓库脚本 `scripts/traffic-worker.js`、`scripts/openclash-traffic-collector.py`、`scripts/stash-traffic-collector.js` |
| Emby Downloader | 在 NAS 上搜索 Emby 媒体、创建下载队列、查看进度并断点续传；支持模拟播放器抓取直连媒体任务 | 在 fnOS Docker 项目启动后访问 `http://飞牛局域网IP:8088`（端口可自行调整） | 源仓库目录 `emby-downloader/`，详细用法见其中的 `README.md` |
| Sub-Store 运维 | 检查、更新或回滚 GCP 上的 Sub-Store 服务，并维护自动更新 | [Sub-Store](https://substore.991886.xyz)；更新前使用脚本的 `--check` 检查 | 源仓库脚本 `scripts/gcp-update-substore.sh`、`scripts/gcp-install-substore-auto-update.sh` |
| 配置发布与运维 | 校验 OpenClash 配置、比较路由器运行配置、发布公共配置；另含 Emby 更新和 Debian 网启预置生成工具 | 本地脚本入口，执行前先查看脚本帮助及环境要求；`deploy-openclash.sh` 默认只校验和推送，需显式 `--deploy` 才会更新路由器 | 源仓库目录 `scripts/`；发布白名单文件 `scripts/public-files.json` |

## OpenClash 快速使用

适用于 OpenClash **v0.47.006 及以上**，覆写配置使用 Mihomo Meta 核心。

1. 在 OpenClash 添加 HTTP 类型的覆写模块，使用上表中的“覆写模块地址”。
2. 按需设置环境变量 `EN_KEY`，值为你自己的订阅或 Sub-Store 聚合订阅地址。该值会注入 YAML 中名为 `Sub-store` 的 proxy provider；不要将真实订阅地址提交到仓库。
3. 应用配置后，在 OpenClash 中检查配置加载状态和策略组是否符合预期。

666OS YAML 中的自定义规则覆盖 AI、加密货币、直连、下载、Emby、IP 检测和代理域名/IP。具体规则以 [`Yaml/666OS-DNS-Conf.yaml`](Yaml/666OS-DNS-Conf.yaml) 与 [`Rules/`](Rules/) 为准。

## 模块说明

### 代理流量监控

面板地址为 [traffic.991886.xyz](https://traffic.991886.xyz)。OpenWrt 采集程序和 Stash JavaScript 扩展分别负责采集并向 Worker 上报；Worker 提供统计查询接口。上报凭据由运行环境配置，不能写入公开配置或 README。

### Emby Downloader

该工具以 Docker Compose 运行，默认 Web 端口为 `8088`，下载目录默认映射到项目目录下的 `downloads/`。部署步骤、客户端模拟、抓取接口和限制详见源仓库 `emby-downloader/README.md`。首次使用请在可信的局域网或 VPN 中部署，并按该说明自行设置抓取接口密钥。

### Sub-Store

在线入口为 [substore.991886.xyz](https://substore.991886.xyz)。维护脚本支持状态检查、更新和指定镜像回滚；安装自动更新任务及运行更新操作前，请先阅读对应脚本参数。README 仅记录入口，不代表已触发服务变更。

### 公共发布范围

公共仓库由源仓库的 `scripts/public-files.json` 控制白名单，同步 666OS 配置、规则、Stash 采集脚本和本 README。Emby Downloader、Worker 后端、更新脚本及其他运维工具属于源仓库内容，不会随公共配置仓库发布。不要提交订阅链接、API Token、证书、`.env` 或本地账号文件。

## 本地检查

仓库没有单独的编译步骤。修改配置或代码后，可运行 CI 使用的检查：

```bash
python -B scripts/validate-openclash.py
python -B -m unittest discover -s tests -p 'test_*.py'
python -B -m unittest discover -s emby-downloader -p 'test_*.py'
node --test tests/*.mjs
for script in scripts/*.sh scripts/vps/*.sh; do bash -n "$script"; done
git diff --check
```

配置校验需要 Python 与 PyYAML；Emby 和 Node 测试分别需要项目环境中可用的 Python、Node.js。发布工作流会在推送到 `main` 时运行这些检查，通过后再同步白名单内容到公共仓库。
