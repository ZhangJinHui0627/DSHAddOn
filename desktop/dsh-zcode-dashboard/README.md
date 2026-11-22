# dsh-zcode-dashboard

ZCode 账号池仪表盘 — 把 [dsh-zcode-startplan](https://github.com/venshell/dsh-zcode-startplan)（原作者 venshell）的账号池管理界面提升到 DSH 的**设置页**与**侧栏**，无需再进原插件详情页。

## 为什么需要它

原插件的账号池/额度管理面板只挂在 `plugins.bundle.config`（key=dsh-zcode-startplan）——只有打开原插件详情页才能看到。本插件复用同一套 UI 与同一套 API，把面板提升到：

1. **设置页**：`settings.section`（order 26）— 「ZCode 账号池」图形面板；
2. **本插件详情页**：`plugins.bundle.config`（key=dsh-zcode-dashboard）；
3. **侧栏入口**：`sidebar.panellist`（order 3）+ `main` 全页 — 侧栏点「ZCode 账号池」直达。

## 安全边界

- **纯 UI 壳**：零新增 HTTP 路由、零凭据处理、零本地敏感存储；
- 所有数据交互同源 fetch 原插件的 `/api/zcode-start-plan/*`（安全边界由原插件承担：仅 loopback、响应无凭据、写操作参数校验）；
- 全程 React `createElement` 渲染，无 `innerHTML` / `dangerouslySetInnerHTML`；
- 移除账号、清除限流等破坏性操作沿用原插件的二次确认交互；
- 原插件未安装/停用时，面板显示明确错误而不是静默失败。

## 依赖

- DSH >= 0.2.0（desktop profile 实测 0.2.2-rc.5）
- **必须保持 dsh-zcode-startplan 启用**（数据面提供方）

## 致谢

UI 组件（`AccountCard`/`TotalQuota`/`Toggle`/`AddAccountSection`/`ClaimSection` 等）移植自 dsh-zcode-startplan，版权归原作者所有；本插件仅做挂载位置提升，未改动任何业务逻辑。
