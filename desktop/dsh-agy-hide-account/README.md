# dsh-agy-hide-account

隐藏 DSH 对话顶栏那枚冗余的 `● AGY · 主账号 (系统登录)` 胶囊。

## 为什么单独做一个插件

直接改 `dsh-agy-link` 的构建产物也能隐藏它，但插件一升级就被还原。本插件与 `dsh-agy-link`
**完全解耦**：不 import 它的代码、不读它的配置、不改它的文件，只在内核层面做遮蔽。

## 实现方式（CSS + DOM 标记）

1. 注入一条全局样式：`[data-agy-hide-account="1"] { display: none !important }`；
2. 找出 `button[class*="agy-btn"]` 中**文本以 `AGY` 开头**的那一枚（agy-link 渲染的是
   `AGY` / `AGY (n)` / `AGY · <别名>`），给它的父元素打上标记属性；
3. 用 `MutationObserver` 监听 DOM 变化并重新扫描，因此切账号、切模型、重渲染都不会漏。

按**文本前缀**识别而不是按类名或 DOM 结构，所以：旁边那枚以模型名开头的额度胶囊不受影响；
agy-link 改版只要还叫 `AGY...` 就仍然有效。

## 影响面

- 只隐藏顶栏那枚按钮，**Antigravity 管理控制台、设置面板、账号池、额度刷新全部照常**；
- 卸载后立即恢复显示（标记属性与样式表在 dispose 时一并清除）。

## 安装

```
dsh plugin --profile desktop add file:<本目录打出的 tgz>
```

## 卸载

```
dsh plugin --profile desktop remove dsh-agy-hide-account
```
