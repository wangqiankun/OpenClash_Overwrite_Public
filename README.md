# OpenClash 公共配置使用说明

本项目公开发布的 [OpenClash 配置仓库](https://github.com/wangqiankun/OpenClash_Overwrite_Public) 提供 OpenClash/Mihomo 配置、覆写和域名/IP 规则。私有仓库源码位于 `configs/openclash/`；面向路由器和公共订阅的文件路径保持原样。

## 安装

适用于 OpenClash **v0.47.006 及以上**，覆写配置使用 Mihomo Meta 核心。

1. 在 OpenClash 中添加 HTTP 类型的覆写模块，使用原覆写地址：

   `https://gh-proxy.991886.xyz/https://raw.githubusercontent.com/wangqiankun/OpenClash_Overwrite_Public/refs/heads/main/Overwrite/overwrite.conf`

2. 按需设置 `EN_KEY`，值为你的订阅或 Sub-Store 聚合订阅地址。该值会注入 `Sub-store` proxy provider；不要将真实订阅地址提交到仓库。
3. 应用配置后，在 OpenClash 界面确认加载状态和策略组。

规则覆盖 AI、加密货币、直连、下载、Emby、IP 检测和代理域名/IP。实际规则以 [`Yaml/config.yaml`](https://github.com/wangqiankun/OpenClash_Overwrite_Public/blob/main/Yaml/config.yaml) 及 `Rules/Myself_*.list` 为准。AI 服务规则进入配置中声明的 AI 策略组。

## Sub-Store 节点标签

通过在 Sub-Store 节点名中使用 `[AI]`、`[Emby]`、`[Media]`、`[YouTube]`、`[TG]`、`[Traffic]`、`[自建]`、`[前置]` 等中括号标签，配合节点脚本操作符生成零宽 Unicode 标记，OpenClash 策略组可识别节点用途。地区标签 `[HK]`、`[SG]`、`[JP]`、`[US]` 与供应商标签 `[Flower]`、`[LXY]`、`[Bocchi]` 也与现有筛选兼容。

## 开发校验

从仓库根目录运行 `ops/openclash/validate.py` 检查规则格式、provider、策略组和 YAML。提交前确认规则源与目标策略组已声明。只有需要更新运行中的路由器时才显式使用部署脚本的 `--deploy` 参数；常规验证不会访问路由器。
