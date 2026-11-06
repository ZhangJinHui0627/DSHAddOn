# dsh-status-badges

> 本插件把四个独立徽章聚合为一个插件，代码来源：
> `dsh-agy-quota-badge`、`dsh-qwen-voucher`、`dsh-workbuddy-credits`、`dsh-codex-quota-badge`（均为 MIT）。
> 本仓库的改动主要是聚合、移动端窄屏适配与开关统一管理。
> 遵循上游 MIT 许可，版权归原作者所有。

三个对话顶栏状态胶囊合并成一个插件，各自带开关。

| 胶囊 | 数据来源 | 顺序 | 开关 |
| --- | --- | --- | --- |
| Antigravity 额度 | `/plugins/agy-link/status` | 11 | `agy` |
| 千问代金券余额 | 本插件宿主侧（阿里云 BSS） | 12 | `qwen` |
| WorkBuddy 积分 | `/plugins/dsh-connect-workbuddy/usage?region=global` | 13 | `workbuddy` |

> Codex 额度胶囊已拆到独立插件 `dsh-codex-quota-badge`。

## 为什么合并

原先三个胶囊分别由 `dsh-agy-quota-badge`、`dsh-qwen-voucher`、
`dsh-workbuddy-credits` 各自注册。合并后顶栏胶囊只有一个归属。

## 开关

开关状态存在 `$DSH_HOME/dsh-status-badges/badges.json`：

```json
{ "agy": true, "qwen": true, "workbuddy": true }
```

宿主侧路由：`GET/POST /plugins/dsh-status-badges/state`。关掉的胶囊不再渲染
（组件返回 `null`）。

## 千问数据

千问胶囊的余额由本插件宿主侧直接读取：阿里云 BSS `QueryCashCoupons`
（RPC v1、HMAC-SHA1、零第三方依赖）。凭据只存在
`$DSH_HOME/dsh-qwen-voucher/config.json`，仅用于给 business/sts.aliyuncs.com
签名，不会写进日志。相关路由仍沿用原路径：

- `GET  /plugins/dsh-qwen-voucher/status`
- `POST /plugins/dsh-qwen-voucher/refresh`
- `POST /plugins/dsh-qwen-voucher/prefs`

## 多账户（v1.3.0）

config.json 支持 `accounts` 数组：每项 `{ label, accessKeyId, accessKeySecret, couponNo }`。
宿主侧对每个账户独立签名查询 BSS `QueryCashCoupons`，状态按账户分组返回
（`state.accounts[]`，顶层 `coupons`/`selected` 保留为第一个账户以兼容旧客户端）。
胶囊仍是一枚 pill：内部按账户分段显示（首段文案"千问AI平台可用 ¥xx"，其余段为"label ¥xx"），
段间留 10px 间隔；弹窗按账户分块展示明细。无 `accounts` 字段时回退顶层旧字段（单账户），
旧版 qwenState.json 启动时自动迁移。

## 说明

三个组件的实现与原插件逐字一致，仅在槽位注册处加了一层开关判断；
每段代码包在独立作用域里，避免同名变量互相干扰。
