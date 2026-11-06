# DSHAddOn

一组自用的 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）扩展：**桌面端插件**改界面与交互，**手机端**放 DSH Go 的安装工具和一个原生 token 统计插件。

每个子目录都是独立可装的插件包，各自带 `package.json`、`cordis.patch.yml` 和 README，互不依赖，可以只装需要的那个。

## 目录

```
desktop/                     桌面端 DSH 插件
├── dsh-agy-hide-account/    隐藏冗余的 AGY 主账号胶囊
├── dsh-claude-model-picker/ Claude 风格的模型选择器
├── dsh-codex-effort-slider/ Codex 风格的推理等级滑条
├── dsh-codex-slider-bridge/ 让上面的滑条接到 Codex 订阅菜单
├── dsh-floating-model-selector/ 悬浮的模型与推理等级面板
├── dsh-qwen-voucher/        千问代金券余额胶囊
└── dsh-status-badges/       四合一状态徽章

mobile/
├── dsh-go/                  DSH Go 安装工具包（APK 分发 / adb 安装 / 配对）
└── local-token-ledger/      DSH Go 原生插件：token 总账与费用估算
```

## 桌面端插件

| 插件 | 版本 | 作用 |
| --- | --- | --- |
| [dsh-agy-hide-account](desktop/dsh-agy-hide-account/) | 0.1.0 | 隐藏对话顶栏那枚冗余的 `● AGY · 主账号` 胶囊。用 CSS + DOM 遮蔽实现，和 `dsh-agy-link` 解耦，插件升级不会被还原。 |
| [dsh-claude-model-picker](desktop/dsh-claude-model-picker/) | 1.0.0 | Claude Code 风格的模型选择器：座位触发器、分组模型列表（倍率徽章 + 说明）、搜索、推理等级。移植自 `Nwflower/dsh-claude-style` 的选择器部分，不引入其余主题架构。 |
| [dsh-codex-effort-slider](desktop/dsh-codex-effort-slider/) | 1.1.4 | 把输入框工具行的推理等级档位换成一条可拖动的连续滑条。是 `Microqian2th/dsh-codex-effort-slider`（MIT）的 fork，增加了移动端窄屏适配。 |
| [dsh-codex-slider-bridge](desktop/dsh-codex-slider-bridge/) | 0.2.0 | 桥接插件：让滑条驱动 `dsh-codex-subscription` 自己的模型菜单，并把一次运行的事实落盘，便于排查。 |
| [dsh-floating-model-selector](desktop/dsh-floating-model-selector/) | 1.0.3 | 可拖动、常驻展开的悬浮模型选择与推理等级面板。 |
| [dsh-qwen-voucher](desktop/dsh-qwen-voucher/) | 1.0.0 | 顶栏只读显示千问 AI 平台代金券余额；点开看券号、余额 / 面值、失效日期与倒计时，支持手动刷新。 |
| [dsh-status-badges](desktop/dsh-status-badges/) | 1.3.2 | 四个顶栏状态徽章合为一个插件：Antigravity 额度、千问代金券、WorkBuddy 积分、Codex 额度，每个可单独开关。由 `dsh-agy-quota-badge`、`dsh-qwen-voucher`、`dsh-workbuddy-credits`、`dsh-codex-quota-badge`（均 MIT）聚合而来。 |

## 手机端

### local-token-ledger · 1.1.0

DSH Go 手机 App 的**原生插件**，在输入框上方显示本机 token 用量，点开是明细面板：

- 在「累计 / 今日 / 本对话」三组之间轮播，每组带 token 数和估算费用
- 逐模型用量与**参考单价**（USD / 百万 token：缓存命中 / 输入 / 输出）；DeepSeek 官方模型额外使用官方人民币价与峰谷计价
- 缺价模型自动去 OpenRouter、models.dev、LiteLLM 等公开目录查价并缓存；查不到会在面板明确列出，不猜测价格
- 只读本机会话记录（`$DSH_HOME/sessions`），不发送对话内容、不读密钥

详见 [mobile/local-token-ledger/README.md](mobile/local-token-ledger/README.md)。价格仅供参考，不是官方账单。

### dsh-go · 安装工具包

DSH Go（Android）的辅助脚本，**不包含 APK 本体**（约 190 MB，超过 GitHub 单文件限制）：

| 文件 | 作用 |
| --- | --- |
| `serve-apk.mjs` | 在局域网内把 APK 提供给手机下载，启动时算好大小与 SHA-256 |
| `install-adb.bat` | 通过 USB / 无线 adb 安装 |
| `watch-and-install.ps1` | 等设备出现后自动安装 |
| `pair-host.mjs` | 渲染本机配对二维码 |
| `manifest.json` | 工具包清单：上游仓库、Releases 地址与脚本说明 |

APK 请从 [上游 Releases](https://github.com/ccch1mneyyy/dsh-go/releases/latest) 下载。

## 安装

以插件目录的绝对路径安装，桌面端用 `desktop` profile：

```sh
dsh plugin --profile desktop add link:"<插件的绝对路径>"
```

手机上的本机引擎用 `web` profile：

```sh
dsh plugin --profile web add link:"<插件的绝对路径>"
```

装完重启 DSH 生效。卸载把 `add` 换成 `remove` 并给出包名；改过 `lib/`、`index.js` 之类的代码后，也要重启引擎才会加载新版本。

## 说明

- 部分插件是 fork 或移植而来，来源与改动写在各自 README 开头，原始许可保留在各目录的 LICENSE 中；未单独标注的均为 MIT。
- 这些插件按自用需求开发，主要在 Windows 与 Android（proot 环境）上验证过，换环境可能需要小幅调整。
- 涉及价格、额度、余额的数字都是**参考值**，以服务商官方账单为准。

## 许可

MIT，除非某个子目录另有 LICENSE。
