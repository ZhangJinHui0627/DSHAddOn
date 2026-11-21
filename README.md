# DSHAddOn

一组自用的 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）扩展。**自己创作或实质改动过的插件**（源码在 `desktop/`），**第三方插件**只记录原作网址（见 [desktop/THIRD-PARTY.md](desktop/THIRD-PARTY.md)），不收源码。

## 目录

```
desktop/                     桌面端 DSH 插件（自有 / 改动源码）
├── dsh-status-badges/       五合一顶栏状态徽章（含千问代金券、WorkBuddy 双区积分）
├── dsh-claude-model-picker/ Claude 风格的模型选择器（移植）
└── THIRD-PARTY.md           第三方插件原作网址与安装方式清单

mobile/                      手机端（DSH Go）
├── dsh-go/                  安装工具包（APK 分发 / adb / 配对）
└── local-token-ledger/      DSH Go 原生插件：token 总账与费用估算
```

## 桌面端插件

### dsh-status-badges · 1.4.0

五个对话顶栏状态徽章合为一个插件，每个可单独开关（设置 → 顶栏胶囊）：

| 胶囊 | 内容 | 数据来源 |
| --- | --- | --- |
| Antigravity 额度 | Gemini / Claude / GPT-OSS 的 5 小时与每周水位 | `/plugins/agy-link/status` |
| 千问代金券 | 千问 AI 平台代金券余额（如 `¥100.41`），点开看券号与有效期 | 本插件宿主侧直连阿里云 BSS `QueryCashCoupons`（HMAC-SHA1，零依赖） |
| WorkBuddy 积分 | **国内 / 国际双区合计**（`CN 560.04 │ GL 119.71`），详情分栏列各账号；国际区按 accountId 去重 | `/plugins/dsh-connect-workbuddy/account-credits?region=cn|global` |
| Codex 额度 | Codex 订阅用量窗口 | `codex-subscription/usage` RPC（需装回 dsh-codex-subscription） |
| ZCode 额度 | **ZCode 账号池按模型聚合**的剩余 token（如 `GLM-5.3-Flash 4.69亿`），跨账号按 planName 求和 | `/api/zcode-start-plan/summary` + `balance?id=` |

- 数据缺失时胶囊**不再消失**，显示灰色占位（悬停看原因）；开关关闭的除外
- 详情弹层经 `createPortal` 挂到 `body`，z-index 2147483002，修复 0.2.2-rc.5 顶栏点击失效
- 由 `dsh-agy-quota-badge`、`dsh-qwen-voucher`、`dsh-workbuddy-credits`、`dsh-codex-quota-badge`（均 MIT）聚合演化而来

### dsh-claude-model-picker · 1.0.0

Claude Code 风格的模型选择器：座位触发器、分组模型列表（倍率徽章 + 说明）、搜索、推理等级。移植自 [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style) 的选择器部分（MIT），不引入其余主题架构。

## 手机端

### local-token-ledger · 1.1.0

DSH Go 手机 App 的**原生插件**：输入框上方显示本机 token 用量，累计 / 今日 / 本对话三组轮播，逐模型用量与参考单价（USD / 百万 token），缺价模型自动查公开目录。只读本机会话记录，不发送对话内容。

### dsh-go · 安装工具包

DSH Go（Android）辅助脚本（APK 约 190 MB 超过单文件限制，从[上游 Releases](https://github.com/ccch1mneyyy/dsh-go/releases/latest) 下载）：

| 文件 | 作用 |
| --- | --- |
| `serve-apk.mjs` | 局域网提供 APK 下载，含大小与 SHA-256 |
| `install-adb.bat` | USB / 无线 adb 安装 |
| `watch-and-install.ps1` | 等设备出现后自动安装 |
| `pair-host.mjs` | 渲染本机配对二维码 |

## 安装

桌面端（`desktop` profile 由 Electron 独占，命令行装不了）：

```
设置 → 插件 → 添加插件 → 填本仓库子目录的绝对路径
```

其它 profile：

```sh
dsh plugin --profile web add link:"<插件目录的绝对路径>"
```

装完重启 DSH 生效。

## 原则

- **第三方插件不收源码**，只记录原作网址：见 [desktop/THIRD-PARTY.md](desktop/THIRD-PARTY.md)
- 本目录源码均为自己创作或实质改动；引用上游的部分在各自 README 开头注明
- 涉及价格、额度、余额的数字都是**参考值**，以服务商官方账单为准
- 许可 MIT，除非子目录另有 LICENSE

## 许可

MIT

