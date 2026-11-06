# Token 总账 · local-token-ledger

在 dsh-go 手机原生界面显示**本机累计（全部）token 用量**、今日、本对话，以及**每个模型的参考单价和费用估算**。

## 界面

- **状态条**（输入框上方）：在「累计 Token + 估算费用」「今日 Token + 估算费用」「本对话 Token + 估算费用」三组之间轮播。每组停留约 6.5 秒，整段一次切换，由 App 的原生过渡动画完成；不再逐帧改写文字，避免带阴影的切换动画反复触发造成闪烁。间隔在 token-prices.json 的 strip.rotateMs 里可调。切换币种时状态条会立刻重算，不等下一轮。
- **明细面板**（点状态条或「全部功能」打开）：累计 / 今日 / 本对话指标、输入与缓存分项、按模型用量图、按模型+通道明细表、**逐模型参考单价表**、未计价模型提示，以及「刷新 / 重新查价 / 切 ¥/$」按钮。

## 数据

只读本机引擎会话记录（DSH_HOME/sessions 下 session.v*.jsonl.zstd）里的 assistant/message.usage。累计全部历史，不按日期截断。不读密钥、不读对话正文、不写回会话日志。

## 定价

- 内置 33 个模型的**参考价**，存于 DSH_HOME/dsh-go/token-prices.json。单位 USD / 百万 token，数组顺序 [缓存命中, 输入未命中, 输出]。
- DeepSeek 官方模型另带官方人民币单价（谷时 / 峰时）；其他模型人民币按 cnyPerUsd 汇率换算。
- **出现过的模型都已配参考价**：DeepSeek 官方价、OpenRouter / models.dev / LiteLLM 公开目录价，或近似参考价（hy4free 参考 tencent/hy4）。WorkBuddy 活动期可能免费，面板会注明「估价仅参考」。
- **新模型自动查价**：缺价模型会异步查 OpenRouter / models.dev / LiteLLM 的公开目录，把精简索引缓存到 token-price-catalog.json（默认 24 小时），查到的价写进 token-prices-auto.json；查不到会在面板「未查到价格的模型（未计入估价）」明确列出，不会猜一个价格。可在配置里关掉 autoLookup.enabled，或点面板「重新查价」。查询只读公开价格目录，不发送会话内容或密钥。

价格仅供参考，不是官方账单；订阅、赠送额度、促销可能让实际扣费为 0，但估算仍会显示。金额也不含未写入会话记录的调用。峰时按北京时间周一至周五 9–12、14–18 判断，未处理法定节假日。

## 配置

DSH_HOME/dsh-go/token-prices.json：可改 currency（CNY / USD）、cnyPerUsd、prices、aliases、peak、strip、autoLookup。改完约 15 秒生效；面板「切 ¥/$」会直接写回 currency。

DSH_HOME/dsh-go/token-prices-auto.json 和 token-price-catalog.json 是自动查价缓存，可安全删除，下次会重建。

## 安装

已装在本机 web profile（指向本目录的链接）。命令行重装：

    dsh plugin --profile web add /root/.dsh/dsh-go/plugins/local-token-ledger

lib/index.js 改动后要在 App 的「引擎」页重启引擎才生效。

## 许可

MIT
