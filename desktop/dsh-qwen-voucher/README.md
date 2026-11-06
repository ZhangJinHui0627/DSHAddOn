# dsh-qwen-voucher

在 DeepSeek Harness（DSH）对话顶栏显示一枚**千问 AI 平台代金券余额**胶囊，例如：

```
● 千问 AI 平台可用 ¥100.41
```

点击胶囊会展开详情：券号、余额/面值、失效日期与倒计时、上次刷新时间，并可手动刷新、切换自动刷新间隔（5 / 10 / 30 分钟）。

## 数据从哪来

阿里云 BSS `QueryCashCoupons`（RPC v1，HMAC-SHA1 签名，零第三方依赖）。
**浏览器侧不含任何凭据**：签名只在宿主进程内完成。

## 配置

在 `$DSH_HOME/dsh-qwen-voucher/config.json` 写入：

```json
{
  "accessKeyId": "",
  "accessKeySecret": "",
  "couponNo": "",
  "refreshMinutes": 30
}
```

- `couponNo` 留空表示自动挑选「可用且面值最大」的那张券。
- `refreshMinutes` 只接受 5 / 10 / 30。
- 建议用**只读 RAM 子账号**，仅授权 `bss:QueryCashCoupons`，不要用主账号 AK。

## 路由

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/plugins/dsh-qwen-voucher/status` | 当前快照 |
| POST | `/plugins/dsh-qwen-voucher/refresh` | 立即刷新 |
| POST | `/plugins/dsh-qwen-voucher/prefs` | 改刷新间隔 |

## 安装

```powershell
dsh plugin --profile <profile> add "file:<本包 tgz 的绝对路径>"
```

DSH Desktop 的 `desktop` profile 由 Electron 独占，命令行装不了：请在 **设置 → 插件 → 添加插件** 里填 tgz 的绝对路径，或把包解到 profile 的 `node_modules` 下并加进 `dsh.profile.bundles`。

装完**完全退出并重开 DSH**。

## 失败时的表现

- 未配置 AK/SK：胶囊显示「千问券 未配置」。
- 查询失败：胶囊保留上一次成功的快照，并在详情里显示错误原因。

## 隐私

胶囊只读取券的**余额与面值**，不涉及任何消费明细；凭据文件权限建议设为仅本人可读。
