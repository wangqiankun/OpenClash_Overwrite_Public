# OpenClash 配置与网络规则

本公开仓库提供 OpenClash/Mihomo 配置、覆写和规则。安装说明、订阅注入方式和 Sub-Store 节点标签规范见本文。私有源码位于 Homelab Toolkit 的 `configs/openclash/`；对外的 `Yaml/`、`Overwrite/` 和 `Rules/` 下载路径保持不变。

## OpenClash 快速使用

适用于 OpenClash **v0.47.006 及以上**，覆写配置使用 Mihomo Meta 核心。

1. 在 OpenClash 添加 HTTP 类型的覆写模块，并填写以下公开地址：

   `https://gh-proxy.991886.xyz/https://raw.githubusercontent.com/wangqiankun/OpenClash_Overwrite_Public/refs/heads/main/Overwrite/overwrite.conf`
2. 按需设置环境变量 `EN_KEY`，值为你自己的订阅或 Sub-Store 聚合订阅地址。该值会注入 YAML 中名为 `Sub-store` 的 proxy provider；不要将真实订阅地址提交到仓库。
3. 应用配置后，在 OpenClash 中检查配置加载状态和策略组是否符合预期。

YAML 中的自定义规则覆盖 AI、加密货币、直连、下载、Emby、IP 检测和代理域名/IP。具体规则以[公开配置](https://github.com/wangqiankun/OpenClash_Overwrite_Public/blob/main/Yaml/config.yaml)及其 [`Rules/`](https://github.com/wangqiankun/OpenClash_Overwrite_Public/tree/main/Rules) 为准。

## 节点标签与策略组联动规范（Sub-Store）

通过在 Sub-Store 维护节点时使用简易中括号标签（如 `[AI]VMISS-US`），Sub-Store 配合脚本操作符可自动将其转换为**零宽隐形 Unicode 字符**追加在节点末尾。

**特性效果**：
- **面板卡片 100% 纯净**：节点名称展示为原始干净文本（如 `VMISS-US`），肉眼完全看不到任何 Emoji 或中括号；
- **OpenClash 精准识别**：Mihomo 内核通过隐形字符正则精准将节点归入对应策略组。

| 节点输入标签 | 隐形 Unicode 编码 | 自动归入的 OpenClash 策略组 | 说明 |
| :--- | :--- | :--- | :--- |
| **`[AI]`** | `\u200b` | **AI 策略组** | 优先进入 AI 商业服务组 |
| **`[Emby]`** 或 **`[Media]`** | `\u200d` | **Emby 策略组**、**YouTube 策略组** | 适合流媒体看剧、原生解锁的节点 |
| **`[YouTube]`** | `\u200d` | **YouTube 策略组** | 油管专属节点 |
| **`[TG]`** 或 **`[Telegram]`** | `\u2062` | **Telegram 策略组** | 电报专用节点 |
| **`[Traffic]`** 或 **`[流量]`** | `\u200c` | **流量节点**、**流量节点自动** | 0.1x~0.5x 低倍率/大流量节点 |
| **`[自建]`** 或 **`[Self]`** | `\u2060` | **自建节点** | 自建 VPS、微林、落地节点 |
| **`[前置]`** 或 **`[Relay]`** | `\u2061` | **前置节点** | 自建入口/中转前置节点 |
| **`[HK]`** / **`[SG]`** / **`[JP]`** / **`[US]`** | - | **香港策略** / **狮城策略** / **日本策略** / **美国策略** | 地区核心策略组与测速组 |
| **`[Flower]`** / **`[LXY]`** / **`[Bocchi]`** | - | 对应地区的供应商自动测速组 | 区分供应商测速与主备容灾 |

> **提示**：策略组同时兼容隐形字符与历史中括号标签。

## 公共发布范围

本仓库只接收源仓库明确列入发布白名单的 OpenClash 配置、规则、Stash 采集器和说明文档。不要在公开内容或私有源仓库中加入订阅链接、API Token、证书、`.env` 或本地账号文件。
