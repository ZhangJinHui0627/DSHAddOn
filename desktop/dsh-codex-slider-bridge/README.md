# dsh-codex-slider-bridge

让 `dsh-codex-effort-slider` 的推理等级滑条能挂到 `dsh-codex-subscription` 自己的模型菜单上，并顺带把一次运行的事实写到磁盘上供排查。

## 为什么需要它

- `dsh-codex-effort-slider` 用 DOM 语义定位「推理等级」那一行，但它要求菜单根面板**恰好两行** `button[role=menuitem]`。
- 选中 GPT 模型时，菜单由 `dsh-codex-subscription` 的 `CodexModelSelect` 渲染，根面板是模型 / 推理等级 / 速度 / 输出详略，**三到四行**。
- 守卫不通过，滑条就不注入。写路径本身是通的：两边都走 `modelDirectories.directory.select({ provider, model, reasoningEffort })`。

## 它做什么

1. 观察 `body` 的 childList 变化，找到打开的 Codex 模型菜单。
2. 把除「模型」「推理等级」之外的单元格 `role` 临时改成 `button`，让菜单对滑条呈现为两行（`codexModelSelectCell` 的 `data-*` 标记保留原意）。
3. 在菜单里制造一次 childList 变化，触发滑条重新扫描并挂载（滑条只监听 childList，改属性它看不见）。
4. 把这一次的事实（菜单行、桥接动作、滑条是否挂上、`/codex-subscription` RPC 是否可调）POST 到宿主，落在 `$DSH_HOME/dsh-codex-slider-bridge/report.json`。

## 边界

- 只认带 `.codexModelSelectCell` 的菜单，官方两行菜单一律不碰。
- 找不到「推理等级」单元格就什么都不做（fail-open）。
- 不改任何第三方包；卸载即恢复原样。

## 宿主端点

- `GET  /plugins/dsh-codex-slider-bridge/report` 最近一次探针报告
- `POST /plugins/dsh-codex-slider-bridge/report` 写入一份报告
