# shared-utils.md — 工具函数顶层化决策记录（1.4.1 重构）

| 符号 | 原定义位置 | 顶层采用版本 | 差异说明 |
| --- | --- | --- | --- |
| ago(ms) | qwen/wb/codex 各一份 | **wb 版**（含"天前"分支，语义最全） | qwen 版缺"天前"；codex 版用 var 且缺"天前" |
| countdown(ms) | qwen/wb/codex 各一份 | **wb 版**（入参为毫秒时间戳） | ⚠ qwen 版签名不同：入参是 ISO 字符串（Date.parse）。qwen 内部改名 localCountdownIso 保留 |
| dotColor(pct) | qwen/codex 各一份 | **codex 版**（三段：≤20红/≤50琥珀/绿） | ⚠ qwen 版是特殊两段式（≤0.1 红 / 其余绿，用户 11-04 明确要求）。qwen 内部改名 qwenDotColor 保留 |
| fmt(n) | 仅 wb | wb 版原样提升 | toFixed(2) |
| stamp(ms) | 仅 wb | wb 版原样提升 | YYYY-MM-DD HH:MM |
| pillStyle | qwen/wb | wb 版（含 boxShadow/userSelect，与 qwen 一致） | 一致（wb 版多两个字段，取 wb） |
| popStyle | qwen/wb | wb 版（zIndex 2147483002 portal 版） | qwen 版 zIndex 旧值，取 wb |
| fmtPct / windowLabel | 仅 codex | 留在 codex 内（独有） | — |
| zFmtTokens 等 | 仅 zcode | 留在 zcode 内（独有） | — |

结论：顶层共享 ago/countdown(ms)/stamp/fmt/dotColor(pct)/pillStyle/popStyle；
qwen 的 ISO 版 countdown → localCountdownIso，两段式 dotColor → qwenDotColor（模块内改名保留）。