# dsh-claude-model-picker

一个**独立的本地 DSH 插件**，只移植 [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style)
的「选择模型」（model picker）部分，不引入该主题的其它功能与架构。

> 参考源码：GitHub `Nwflower/dsh-claude-style@master`（MIT）。数据文件
> `data/model-descriptions.json`、`data/prices.json` 直接取自该仓库
> `packages/client/data/` 与 `packages/host/data/`，版权归原作者所有，随本插件
> 以 MIT 许可再分发。实现为参照重写（无构建步骤、无第三方依赖）。

## 功能

- **composer 内的座位（seat）**：隐藏宿主原模型按钮，绘制自己的触发器，显示当前模型名
  （官方 deepseek-flash 带 1017 标签）。
- **一级卡片**：官方 / 账号供应商优先，按供应商分组（组名分隔线）；每行 =
  模型名 + 价格倍率徽标 + 一行灰色描述 + 选中勾选；点击行通过宿主
  modelDirectories.select({provider, model}) 切换模型。
- **更多模型 → 二级卡片**：搜索框（模型名 / id / 供应商名过滤）+ 全量分组列表
  （按 id 排序）+ 空态。
- **推理档位**：当前模型有 reasoning.efforts 时显示档位行，可切换
  reasoningEffort。
- **描述文案**：families(67) / tiers(4) 规则，按 模型 id → 显示名 依次匹配，
  中英双语，回退宿主自身的 description。
- **倍率徽标**：优先用模型条目自带的倍率字段；否则按 prices.json 的
  catalog / aliases 价格行推算相对倍率（以官方 deepseek-flash 缓存未命中
  CNY 价为 1 基准）。数据源自带，运行时**不联网**。
- 亮 / 暗配色跟随宿主 --dsw-alias-* 变量；弹层随窗口 resize / scroll 重定位。

## 宿主契约

- 客户端：window.__ModuleLoader__.load 外壳，exports.apply(ctx)；
  ctx.slots.inject('conversation.input.right', ...) 挂载；
  ctx.modelDirectories.directoryFor(sessionId) 的 store.getSnapshot/subscribe
  与 select 完成读写；会话切换自动重订阅；卸载恢复宿主 DOM。
- 宿主半：ctx.inject(['webServer'], ...) 注册两个只读 JSON 路由
  （/plugins/dsh-claude-model-picker/model-descriptions.json 与 prices.json）。

## 安装（需用户单独授权）

1. 在目标 profile 的 package.json 添加依赖，例如 web profile：
   "dsh-claude-model-picker": "link:<本仓库路径>/desktop/dsh-claude-model-picker"。
2. 将该插件 cordis.patch.yml 的 insert 条目并入 profile 的 cordis.patch.yml。
3. 重建 web bundle 并刷新页面（或重启 DeepSeek Harness 应用）。

## 验证

- node --check client.js / node --check index.js
- node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))" 及两个 data JSON 同理
- 冒烟脚本：模拟 __ModuleLoader__ 与最小 DOM，调用 exports.apply 不抛异常

## 许可

MIT。数据文件与实现思路来自 Nwflower/dsh-claude-style（MIT），见上。
peakrate 的时钟判断、品牌 SVG lockup、字体、主题皮肤等未移植。
