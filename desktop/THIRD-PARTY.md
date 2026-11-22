# 第三方插件（不在本仓库维护）

以下插件是**别人写的**，本仓库只记录原作地址，不保存源码。直接从原作渠道安装：

| 插件 | 原作地址 | 安装 | 说明 |
| --- | --- | --- | --- |
| dsh-codex-effort-slider | https://github.com/Microqian2th/dsh-codex-effort-slider | `dsh plugin --profile desktop add dsh-codex-effort-slider`（已发布 npm，当前 1.1.9） | Codex 风格推理等级滑条。本仓库曾提交过 1.1.4 fork（MIT），现已按上游优先原则移除源码，改动内容见原作仓库。 |
| dsh-codex-slider-bridge | 原作已删库；本机版本 0.2.0 保存于 `~/.dsh/profiles/desktop/vendor/dsh-codex-slider-bridge-0.2.0.tgz` | 本地 tgz 安装 | 让上面的滑条能驱动 Codex 订阅模型菜单。上游 README 声明 MIT。 |
| dsh-codex-subscription | https://www.npmjs.com/package/dsh-codex-subscription | `dsh plugin --profile desktop add dsh-codex-subscription@3.2.27` | Codex/ChatGPT 订阅接入 DSH（WSL043 等）。按 npm 包安装，不收源码。 |
| dsh-connect-workbuddy | https://github.com/dingminhua/dsh-connect-workbuddy | `dsh plugin --profile desktop add dsh-connect-workbuddy`（npm） | WorkBuddy 模型接入 DSH，只读积分概览。 |
| dsh-agy-link | https://github.com/（AGY 桥接插件原作） | npm 安装 | AGY (Google Antigravity) 接入 DSH。 |
| dshmarket | https://github.com/dsh-market/dsh-market | `dsh plugin --profile desktop add dshmarket` | DSH 插件市场 UI。 |
| @liustack/modlens | https://github.com/liustack/modlens | npm 安装 | 视觉桥接：给纯文本模型看图能力。 |
| @michengai/dsh-skills-manager | https://github.com/MichengAI/dsh-skills-manager | npm 安装 | Agent Skills 统一管理。 |
| dsh-zcode-startplan | https://github.com/venshell/dsh-zcode-startplan | npm 安装 | ZCode/智谱 Start Plan 账号池（本插件 dsh-status-badges 的 ZCode 胶囊数据来源）。**dsh-zcode-dashboard 的账号池 UI 组件（AccountCard/TotalQuota/Toggle/AddAccountSection/ClaimSection）移植自其 client.js，数据面 API 完全复用原插件。** |
| ds-harness-remote / dsh-phone-remote / dsh-js-reverse-plugin / @anysearch/anysearch-dsh / dsh-claude-model-picker | 各自 npm / GitHub 原作 | npm 或面板安装 | 远程访问、手机远程、JS 逆向辅助、聚合搜索、Claude 风格模型选择器等第三方插件。 |

> 原则：**别人写的插件，源码不进本仓库**，只记录原作网址和安装方式。由我创作或改动（含 fork 后实质修改）的插件，源码进 `desktop/` 目录。

