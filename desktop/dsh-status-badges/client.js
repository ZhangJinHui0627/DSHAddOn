window.__ModuleLoader__.load({
  id: "dsh-status-badges",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const useSyncExternalStore = React.useSyncExternalStore;
    const h = React.createElement;

    const STATE_URL = "/plugins/dsh-status-badges/state";
    const DEFAULTS = { agy: true, qwen: true, workbuddy: true, codex: true, zcode: true };

    var snapshot = { agy: true, qwen: true, workbuddy: true, codex: true, zcode: true };
    var listeners = new Set();
    function subscribe(fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
    function getSnapshot() { return snapshot; }
    function publish(next) {
      var changed = false;
      for (var k in DEFAULTS) {
        if (typeof next[k] === "boolean" && next[k] !== snapshot[k]) changed = true;
      }
      if (!changed) return;
      var copy = {};
      for (var k2 in DEFAULTS) copy[k2] = typeof next[k2] === "boolean" ? next[k2] : snapshot[k2];
      snapshot = copy;
      listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    function loadSwitches() {
      fetch(STATE_URL, { headers: { accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && typeof j === "object") publish(j); })
        .catch(function () {});
    }

    function useSwitches() {
      return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    }

    /** 四枚胶囊的占位态：内层组件因数据未就绪/查询失败返回 null 时用它顶上，
     *  保证顶栏永远有四枚，不会因为某一路查询失败而整枚消失。 */
    const PLACEHOLDER_LABELS = { agy: "Antigravity —", qwen: "千问 AI 平台 —", workbuddy: "WorkBuddy —", codex: "Codex —", zcode: "ZCode —" };
    const PLACEHOLDER_TITLES = {
      agy: "Antigravity 额度：数据尚未就绪或读取失败，正在等待下一次刷新",
      qwen: "千问代金券：数据尚未就绪或读取失败，正在等待下一次刷新",
      workbuddy: "WorkBuddy 积分：数据尚未就绪或读取失败，正在等待下一次刷新",
      codex: "Codex 额度：数据尚未就绪或读取失败，正在等待下一次刷新",
      zcode: "ZCode 额度：数据尚未就绪或读取失败，正在等待下一次刷新"
    };
    function badgePlaceholder(key) {
      return React.createElement(
        "button",
        {
          type: "button", disabled: true, className: "agy-btn",
          title: PLACEHOLDER_TITLES[key] || "", "aria-busy": "true",
          style: {
            background: "var(--agy-bg-header, var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06)))",
            border: "1px solid var(--agy-border-card, var(--dsw-alias-border-l1, rgba(255,255,255,0.12)))",
            borderRadius: "999px", padding: "3px 12px", fontSize: "11.5px", fontWeight: 600, lineHeight: 1.5,
            color: "var(--agy-text-primary, var(--dsw-alias-label-primary, inherit))",
            display: "inline-flex", alignItems: "center", gap: "6px",
            boxShadow: "var(--agy-shadow-sm, 0 1px 2px rgba(0,0,0,0.05))",
            opacity: 0.62, cursor: "default", whiteSpace: "nowrap", flexShrink: 0, outline: "none"
          }
        },
        React.createElement("span", { style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#94a3b8", flexShrink: 0 } }),
        PLACEHOLDER_LABELS[key] || key
      );
    }

    /* ══════ 共享工具块（1.4.1 顶层化）：五个胶囊统一引用 ══════ */
    function fmt(n) {
      const v = Number(n);
      if (!Number.isFinite(v)) return "-";
      return v.toFixed(2);
    }
    function ago(ms) {
      if (!ms) return "从未成功";
      const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
      if (s < 60) return s + " 秒前";
      const m = Math.floor(s / 60);
      if (m < 60) return m + " 分钟前";
      const hh = Math.floor(m / 60);
      if (hh < 24) return hh + " 小时前";
      return Math.floor(hh / 24) + " 天前";
    }
    function countdown(ms) {
      const t = Number(ms);
      if (!Number.isFinite(t) || t <= 0) return "?";
      const left = t - Date.now();
      if (left <= 0) return "已过期";
      const mins = Math.ceil(left / 60000);
      const d = Math.floor(mins / 1440);
      const hh = Math.floor((mins % 1440) / 60);
      if (d > 0) return d + "天" + hh + "小时";
      const mm = mins % 60;
      if (hh > 0) return hh + "小时" + mm + "分";
      return mm + "分钟";
    }
    function stamp(ms) {
      const t = Number(ms);
      if (!Number.isFinite(t) || t <= 0) return "?";
      const d = new Date(t);
      const p = (n) => (n < 10 ? "0" + n : "" + n);
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    }
    function dotColor(pct) {
      if (!Number.isFinite(pct)) return "#94a3b8";
      if (pct <= 20) return "#ef4444";
      if (pct <= 50) return "#f59e0b";
      return "#10b981";
    }
    const pillStyle = {
      background: "var(--agy-bg-header, var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06)))",
      border: "1px solid var(--agy-border-card, var(--dsw-alias-border-l1, rgba(255,255,255,0.12)))",
      borderRadius: "999px",
      cursor: "pointer",
      padding: "3px 12px",
      fontSize: "11.5px",
      fontWeight: 600,
      lineHeight: 1.5,
      color: "var(--agy-text-primary, var(--dsw-alias-label-primary, inherit))",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      boxShadow: "var(--agy-shadow-sm, 0 1px 2px rgba(0,0,0,0.05))",
      userSelect: "none",
      whiteSpace: "nowrap",
      flexShrink: 0,
      outline: "none",
    };
    const popStyle = {
      position: "absolute",
      top: "calc(100% + 6px)",
      zIndex: 10000,
      width: "340px",
      background: "var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b))",
      border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25))",
      borderRadius: "10px",
      boxShadow: "0 10px 28px rgba(0,0,0,.35)",
      padding: "10px 12px",
      fontSize: "12px",
      color: "var(--dsw-alias-label-primary, inherit)",
      cursor: "default",
    };
    // ===== agy =====
    var agyModule = (function (useSwitches, placeholder) {

    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { useState, useEffect, useRef, createElement: h } = React;
    const win = typeof window !== "undefined" ? window : globalThis;
    const base = win.location?.origin ?? "";

    const STATUS_CACHE_KEY = "dsh_agy_status_cache";
    const QUOTA_INTERVAL_KEY = "dsh_agy_quota_interval";
    const LAST_REFRESH_KEY = "dsh_agy_quota_last_refresh";
    const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 分钟

    function getSavedInterval() {
      try {
        const val = parseInt(win.localStorage?.getItem(QUOTA_INTERVAL_KEY) ?? "", 10);
        if (Number.isFinite(val) && val >= 30000) return val;
      } catch {}
      return DEFAULT_INTERVAL_MS;
    }

    function setSavedInterval(ms) {
      try {
        win.localStorage?.setItem(QUOTA_INTERVAL_KEY, String(ms));
      } catch {}
    }

    function getLastRefreshTime() {
      try {
        const val = parseInt(win.localStorage?.getItem(LAST_REFRESH_KEY) ?? "", 10);
        if (Number.isFinite(val)) return val;
      } catch {}
      return 0;
    }

    function setLastRefreshTime(ts) {
      try {
        win.localStorage?.setItem(LAST_REFRESH_KEY, String(ts));
      } catch {}
    }

    function loadInitialStatus() {
      try {
        const raw = win.localStorage?.getItem(STATUS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch {}
      return null;
    }

    async function fetchStatus() {
      try {
        const init = {};
        if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
          init.signal = AbortSignal.timeout(5000);
        }
        const res = await win.fetch?.(base + "/plugins/agy-link/status", init);
        if (!res || !res.ok) return null;
        const data = await res.json();
        if (data) {
          try {
            win.localStorage?.setItem(STATUS_CACHE_KEY, JSON.stringify(data));
          } catch {}
        }
        return data;
      } catch {
        return null;
      }
    }

    async function triggerUpstreamRefresh(accountId) {
      try {
        const body = accountId ? { id: accountId } : {};
        const res = await win.fetch?.(base + "/plugins/agy-link/pool/refresh-quota", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        setLastRefreshTime(Date.now());
        if (!res || !res.ok) return false;
        return true;
      } catch {
        return false;
      }
    }

    function formatResetCountdown(resetTimeStr) {
      if (!resetTimeStr) return "";
      try {
        const target = new Date(resetTimeStr).getTime();
        const diffMs = target - Date.now();
        if (Number.isNaN(target) || diffMs <= 0) return "已重置";
        const totalMins = Math.ceil(diffMs / 60000);
        const days = Math.floor(totalMins / 1440);
        const hours = Math.floor((totalMins % 1440) / 60);
        const mins = totalMins % 60;
        if (days > 0) return `${days}天 ${hours}小时后`;
        if (hours > 0) return `${hours}小时 ${mins}分后`;
        if (mins > 0) return `${mins}分钟后`;
        return "< 1分钟";
      } catch {
        return "";
      }
    }

    function getFractionColor(fraction) {
      if (typeof fraction !== "number" || !Number.isFinite(fraction)) return "#94a3b8";
      if (fraction <= 0.2) return "#ef4444";
      if (fraction <= 0.5) return "#f59e0b";
      return "#10b981";
    }

    function formatPair(quota) {
      if (!quota) return "--/--";
      const f5 = typeof quota.remainingFraction === "number" ? `${Math.max(0, Math.min(100, Math.round(quota.remainingFraction * 100)))}%` : "--";
      const fw = typeof quota.weeklyFraction === "number" ? `${Math.max(0, Math.min(100, Math.round(quota.weeklyFraction * 100)))}%` : "--";
      return `${f5}/${fw}`;
    }

    function renderQuotaRow(label, fraction, resetTime) {
      const hasVal = typeof fraction === "number" && Number.isFinite(fraction);
      const pct = hasVal ? Math.max(0, Math.min(100, Math.round(fraction * 100))) : 0;
      const color = getFractionColor(fraction);
      const countdown = formatResetCountdown(resetTime);

      return h("div", {
        key: label,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginBottom: "8px"
        }
      }, [
        h("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "var(--dsw-alias-label-secondary, #a1a1aa)"
          }
        }, [
          h("span", null, label),
          h("span", {
            style: { fontWeight: 600, color }
          }, hasVal ? `${pct}%` : "--"),
          countdown ? h("span", {
            style: { fontSize: "10px", color: "var(--dsw-alias-label-caption, #71717a)" }
          }, countdown) : null
        ]),
        h("div", {
          style: {
            width: "100%",
            height: "4px",
            background: "var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.08))",
            borderRadius: "2px",
            overflow: "hidden"
          }
        }, [
          h("div", {
            style: {
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: "2px",
              transition: "width 0.3s ease"
            }
          })
        ])
      ]);
    }

    function AgyQuotaBadge() {
      const rootRef = useRef(null);
      const [status, setStatus] = useState(loadInitialStatus);
      const [isOpen, setIsOpen] = useState(false);
      const [isRefreshing, setIsRefreshing] = useState(false);
      const [intervalMs, setIntervalMs] = useState(getSavedInterval);
      const [, setSecondsTick] = useState(0);

      // 定时轮询本地 status 及上游更新检测
      useEffect(() => {
        let mounted = true;
        const checkStatusAndRefresh = async () => {
          const st = await fetchStatus();
          if (!mounted) return;
          if (st) setStatus(st);

          const lastRef = getLastRefreshTime();
          const currentInt = getSavedInterval();
          if (Date.now() - lastRef >= currentInt) {
            const pool = (st || status)?.pool;
            const accounts = pool?.accounts ?? [];
            const rawId = pool?.activeAccountId ?? pool?.primaryAccountId;
            const activeAcc = rawId ? accounts.find(a => a.id === rawId) : accounts[0];
            await triggerUpstreamRefresh(activeAcc?.id);
            const fresh = await fetchStatus();
            if (mounted && fresh) setStatus(fresh);
          }
        };

        checkStatusAndRefresh();
        const timer = setInterval(checkStatusAndRefresh, 15000);
        return () => {
          mounted = false;
          clearInterval(timer);
        };
      }, []);

      // 面板打开时的 1 秒刷新倒计时与相对时间
      useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setSecondsTick(s => s + 1), 1000);
        return () => clearInterval(timer);
      }, [isOpen]);

      // 点击外部与 Esc 关闭 Popover
      useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
          if (rootRef.current && !rootRef.current.contains(e.target)) {
            setIsOpen(false);
          }
        };
        const handleKeyDown = (e) => {
          if (e.key === "Escape") setIsOpen(false);
        };
        win.addEventListener("mousedown", handleOutsideClick, true);
        win.addEventListener("keydown", handleKeyDown, true);
        return () => {
          win.removeEventListener("mousedown", handleOutsideClick, true);
          win.removeEventListener("keydown", handleKeyDown, true);
        };
      }, [isOpen]);

      // 解析当前生效账号与配额
      const pool = status?.pool;
      const accounts = pool?.accounts ?? [];
      const rawActiveId = pool?.activeAccountId ?? pool?.lastActiveAccountId ?? pool?.activeAccountIds?.google ?? pool?.primaryAccountId;
      const activeAcc = rawActiveId !== void 0 ? accounts.find((a) => a.id === rawActiveId) : accounts[0];

      if (!activeAcc || !activeAcc.quotas) {
        // 无账号或无配额数据时静默不显，不破坏顶栏
        return null;
      }

      const google = activeAcc.quotas.google;
      // Claude 与 GPT 共享同一配额池（Antigravity 官方称为 Claude and GPT models），
      // 两组数据完全一致，合并展示以避免重复与胶囊过长。
      const claudeGpt = activeAcc.quotas.anthropic || activeAcc.quotas.openai;

      // 提取配额组：Gemini + Claude/GPT 共享池
      const modelItems = [];
      if (google) {
        modelItems.push({ name: "Gemini", quota: google });
      }
      if (claudeGpt) {
        modelItems.push({ name: "Claude and GPT", quota: claudeGpt });
      }

      if (modelItems.length === 0) {
        return null;
      }

      // 形态 2：全称 + 5 小时/周配额双水位全景展示
      // 例如：Gemini 92%/75% · Claude and GPT 6%/53%
      const badgeText = modelItems.map(item => `${item.name} ${formatPair(item.quota)}`).join(" · ");

      // 点的颜色：取所有可用 5h 剩余中最低者报警
      const valid5h = modelItems
        .map(i => i.quota?.remainingFraction)
        .filter(v => typeof v === "number" && Number.isFinite(v));
      const minFraction = valid5h.length > 0 ? Math.min(...valid5h) : 1;
      const dotColor = getFractionColor(minFraction);

      const handleManualRefresh = async (e) => {
        e.stopPropagation();
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
          await triggerUpstreamRefresh(activeAcc.id);
          const fresh = await fetchStatus();
          if (fresh) setStatus(fresh);
        } finally {
          setIsRefreshing(false);
        }
      };

      const handleIntervalChange = (ms) => {
        setIntervalMs(ms);
        setSavedInterval(ms);
      };

      const lastRefTs = getLastRefreshTime();
      const ageSecs = lastRefTs > 0 ? Math.max(0, Math.floor((Date.now() - lastRefTs) / 1000)) : null;
      const ageText = ageSecs === null ? "尚未抓取" : ageSecs < 60 ? `${ageSecs} 秒前` : `${Math.floor(ageSecs / 60)} 分钟前`;

      const intervals = [
        { label: "1分", ms: 1 * 60 * 1000 },
        { label: "5分", ms: 5 * 60 * 1000 },
        { label: "10分", ms: 10 * 60 * 1000 },
        { label: "30分", ms: 30 * 60 * 1000 }
      ];

      return h("div", {
        ref: rootRef,
        style: {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "0px"
        }
      }, [
        // 顶部常驻胶囊按钮（全称双水位全景）
        h("button", {
          key: "badge-btn",
          type: "button",
          className: "agy-btn",
          title: `Antigravity 全景额度 (5h/周)\n` +
            modelItems.map(i => `${i.name}: ${formatPair(i.quota)}`).join("\n") +
            `\n点击查看各模型重置倒计时与刷新控制`,
          onClick: () => setIsOpen(open => !open),
          style: {
            background: "var(--agy-bg-header, var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06)))",
            border: "1px solid var(--agy-border-card, var(--dsw-alias-border-l1, rgba(255,255,255,0.12)))",
            borderRadius: "999px",
            cursor: "pointer",
            padding: "3px 12px",
            fontSize: "11.5px",
            fontWeight: 600,
            lineHeight: 1.5,
            color: "var(--agy-text-primary, var(--dsw-alias-label-primary, inherit))",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "var(--agy-shadow-sm, var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,0.05)))",
            userSelect: "none",
            whiteSpace: "nowrap",
            outline: "none"
          }
        }, [
          h("span", {
            key: "dot",
            style: {
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: dotColor,
              flexShrink: 0
            }
          }),
          h("span", { key: "text" }, badgeText)
        ]),

        // 下拉浮层详情面板 (Popover)
        isOpen ? h("div", {
          key: "popover",
          style: {
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 10000,
            minWidth: "310px",
            background: "var(--dsw-alias-bg-layer-2, #18181b)",
            border: "1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.12))",
            borderRadius: "10px",
            padding: "14px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
            color: "var(--dsw-alias-label-primary, #f4f4f5)",
            fontSize: "12px",
            fontFamily: "inherit",
            cursor: "default"
          }
        }, [
          // 头部账号说明
          h("div", {
            key: "header",
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.08))",
              paddingBottom: "8px",
              marginBottom: "10px"
            }
          }, [
            h("div", { style: { fontWeight: 600, fontSize: "13px" } }, "Antigravity 全景配额"),
            h("div", {
              style: {
                fontSize: "11px",
                color: "var(--dsw-alias-label-tertiary, #a1a1aa)",
                maxWidth: "150px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }
            }, activeAcc.email || activeAcc.alias || "主账号")
          ]),

          // Gemini 组
          google ? h("div", { key: "gemini-group", style: { marginBottom: "12px" } }, [
            h("div", {
              style: {
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--dsw-alias-label-secondary, #d4d4d8)",
                marginBottom: "6px"
              }
            }, "Gemini 模型"),
            renderQuotaRow("5 小时配额", google.remainingFraction, google.resetTime),
            renderQuotaRow("每周配额", google.weeklyFraction, google.weeklyResetTime)
          ]) : null,

          // Claude and GPT 组（对齐 Antigravity 官方：两者共享同一配额池）
          claudeGpt ? h("div", { key: "claude-gpt-group", style: { marginBottom: "12px" } }, [
            h("div", {
              style: {
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--dsw-alias-label-secondary, #d4d4d8)",
                marginBottom: "6px"
              }
            }, "Claude and GPT 模型"),
            renderQuotaRow("5 小时配额", claudeGpt.remainingFraction, claudeGpt.resetTime),
            renderQuotaRow("每周配额", claudeGpt.weeklyFraction, claudeGpt.weeklyResetTime)
          ]) : null,

          // 底部控制区：刷新间隔切换与手动刷新按钮
          h("div", {
            key: "footer",
            style: {
              borderTop: "1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.08))",
              paddingTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }
          }, [
            h("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }
            }, [
              h("span", {
                style: { fontSize: "11px", color: "var(--dsw-alias-label-secondary, #a1a1aa)" }
              }, "刷新间隔"),
              h("div", {
                style: {
                  display: "inline-flex",
                  background: "var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.06))",
                  borderRadius: "6px",
                  padding: "2px"
                }
              }, intervals.map(item => {
                const isSelected = intervalMs === item.ms;
                return h("button", {
                  key: item.label,
                  type: "button",
                  onClick: () => handleIntervalChange(item.ms),
                  style: {
                    border: "none",
                    borderRadius: "4px",
                    padding: "2px 7px",
                    fontSize: "10.5px",
                    cursor: "pointer",
                    background: isSelected ? "var(--dsw-alias-interactive-bg-active, #3b82f6)" : "transparent",
                    color: isSelected ? "#fff" : "var(--dsw-alias-label-tertiary, #a1a1aa)",
                    fontWeight: isSelected ? 600 : 400
                  }
                }, item.label);
              }))
            ]),
            h("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "2px"
              }
            }, [
              h("span", {
                style: { fontSize: "10.5px", color: "var(--dsw-alias-label-caption, #71717a)" }
              }, `更新于 ${ageText}`),
              h("button", {
                type: "button",
                disabled: isRefreshing,
                onClick: handleManualRefresh,
                style: {
                  border: "1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.15))",
                  borderRadius: "6px",
                  padding: "3px 10px",
                  fontSize: "11px",
                  cursor: isRefreshing ? "not-allowed" : "pointer",
                  background: "var(--dsw-alias-interactive-bg-base, rgba(255,255,255,0.08))",
                  color: "var(--dsw-alias-label-primary, #fff)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }
              }, isRefreshing ? "刷新中..." : "立即刷新")
            ])
          ])
        ]) : null
      ]);
    }

    function apply(ctx, switches) {
      ctx.slots.inject("conversation.session.header.actions", () => {
        return ctx.slots.register({
          name: "conversation.session.header.actions",
          id: "agy-quota-badge",
          order: 11,
          label: "Antigravity Quota"
        }, function AgySlot(props) {
          const curSwitches = useSwitches();
          if (curSwitches && curSwitches.agy === false) return null;
          var el = AgyQuotaBadge(props);
          return el === null ? placeholder("agy") : el;
        });
      });
    }
      return { apply: apply };
    })(useSwitches, badgePlaceholder);

    // ===== qwen =====
    var qwenModule = (function (useSwitches, placeholder) {

    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const win = globalThis;
    const base = win.location?.origin ?? "";
    const STATUS = base + "/plugins/dsh-qwen-voucher/status";
    const REFRESH = base + "/plugins/dsh-qwen-voucher/refresh";
    const PREFS = base + "/plugins/dsh-qwen-voucher/prefs";
    const POLL_MS = 30000;
    const LABEL_PREFIX = "千问AI平台可用 ";
    const INTERVALS = [5, 10, 30];
    const SEG_GAP = 10;

    function money(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return "-";
      return "¥" + n.toFixed(2);
    }
    function ratioOf(sel) {
      if (!sel || !(sel.nominal > 0)) return null;
      return Math.max(0, Math.min(1, sel.balance / sel.nominal));
    }
    function qwenDotColor(r) {
      if (r === null) return "#64748b";
      if (r <= 0.1) return "#ef4444";
      return "#10b981";
    }
    function localCountdownIso(iso) {
      if (!iso) return "";
      const t = Date.parse(iso);
      if (!Number.isFinite(t)) return "";
      const ms = t - Date.now();
      if (ms <= 0) return "已失效";
      const mins = Math.ceil(ms / 60000);
      const d = Math.floor(mins / 1440);
      const hh = Math.floor((mins % 1440) / 60);
      if (d > 0) return d + "天" + hh + "小时";
      const mm = mins % 60;
      if (hh > 0) return hh + "小时" + mm + "分";
      return mm + "分钟";
    }
    function ago(ms) {
      if (!ms) return "从未成功";
      const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
      if (s < 60) return s + " 秒前";
      const m = Math.floor(s / 60);
      if (m < 60) return m + "分钟前";
      return Math.floor(m / 60) + " 小时前";
    }
    function accountsOf(st) {
      if (st && Array.isArray(st.accounts) && st.accounts.length) return st.accounts;
      if (!st) return [];
      return [{ label: "我的", ok: st.ok !== false, at: st.at ?? null, coupons: st.coupons || [], selected: st.selected || null, error: st.error ?? null }];
    }
    function segPrefix(acc, i) {
      return i === 0 ? LABEL_PREFIX : (acc.label || "同学") + " ";
    }
    function segText(acc, i) {
      const prefix = segPrefix(acc, i);
      if (!acc || acc.configured === false) return prefix + "未配置";
      const sel = acc.selected || null;
      if (!sel) return prefix + (acc.error ? "读取失败" : "无可用");
      return prefix + money(sel.balance);
    }
    function segDot(acc) {
      if (!acc || acc.ok === false) return "#94a3b8";
      const sel = acc.selected || null;
      if (!sel) return "#64748b";
      return qwenDotColor(ratioOf(sel));
    }

    const pillStyle = {
      background: "var(--agy-bg-header, var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06)))",
      border: "1px solid var(--agy-border-card, var(--dsw-alias-border-l1, rgba(255,255,255,0.12)))",
      borderRadius: "999px",
      cursor: "pointer",
      padding: "3px 12px",
      fontSize: "11.5px",
      fontWeight: 600,
      lineHeight: 1.5,
      color: "var(--agy-text-primary, var(--dsw-alias-label-primary, inherit))",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      boxShadow: "var(--agy-shadow-sm, var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,0.05)))",
      userSelect: "none",
      whiteSpace: "nowrap",
      outline: "none",
      flexShrink: 0,
    };
    const popStyle = {
      position: "fixed",
      zIndex: 2147483002,
      width: "340px",
      background: "var(--dsw-alias-bg-layer-1, #fff)",
      border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25))",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.18)",
      padding: "10px 12px",
      fontSize: "12px",
      color: "var(--dsw-alias-label-primary, inherit)",
    };
    const rowStyle = { display: "flex", gap: "8px", margin: "3px 0" };
    const kStyle = { opacity: 0.6, flex: "0 0 64px" };
    const vStyle = { flex: 1, wordBreak: "break-all" };
    const btnBase = {
      padding: "2px 9px",
      borderRadius: "999px",
      fontSize: "11px",
      cursor: "pointer",
      lineHeight: 1.6,
      border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3))",
      background: "transparent",
      color: "inherit",
    };

    function VoucherBadge() {
      const [st, setSt] = useState(null);
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const [saving, setSaving] = useState(null);
      const [, tick] = useState(0);
      const rootRef = useRef(null);

      useEffect(() => {
        let alive = true;
        const load = () => {
          fetch(STATUS, { headers: { accept: "application/json" } })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
            .then((j) => { if (alive) setSt(j); })
            .catch(() => {});
        };
        load();
        const t = setInterval(load, POLL_MS);
        const cd = setInterval(() => tick((n) => n + 1), 30000);
        return () => { alive = false; clearInterval(t); clearInterval(cd); };
      }, []);

      useEffect(() => {
        if (!open) return;
        const handleOutsideClick = (e) => {
          if (rootRef.current && !rootRef.current.contains(e.target)) {
            setOpen(false);
          }
        };
        const handleKeyDown = (e) => {
          if (e.key === "Escape") setOpen(false);
        };
        win.addEventListener("mousedown", handleOutsideClick, true);
        win.addEventListener("keydown", handleKeyDown, true);
        return () => {
          win.removeEventListener("mousedown", handleOutsideClick, true);
          win.removeEventListener("keydown", handleKeyDown, true);
        };
      }, [open]);

      if (st === null) return null;
      const accs = accountsOf(st);
      if (!accs.length) {
        return h("button", { type: "button", className: "agy-btn", style: pillStyle, title: "Qwen voucher badge" },
          h("span", { style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#64748b" } }),
          h("span", null, "千问券 未配置"));
      }
      const stale = st.ok === false;
      const curInterval = INTERVALS.includes(Number(st.refreshMinutes)) ? Number(st.refreshMinutes) : 30;
      const title = accs.map((acc, i) => {
        const sel = acc.selected || null;
        const head = segPrefix(acc, i).trim();
        if (!sel) return head + (acc.error ? "：读取失败 " + acc.error : "：无可用券");
        return head + " · 券" + (sel.no ? " " + sel.no : "") + " · 余额 " + money(sel.balance) + " / 面值 " + money(sel.nominal) + "，失效 " + (sel.expiry || "?") + "（还剩 " + localCountdownIso(sel.expiry) + "）";
      }).join("\n") + "\n上次成功：" + ago(st.at) + "，每 " + curInterval + " 分钟刷新";

      const openPop = () => {
        setOpen((v) => !v);
      };
      const doRefresh = () => {
        setBusy(true);
        fetch(REFRESH, { method: "POST" })
          .then((r2) => (r2.ok ? r2.json() : Promise.reject(new Error("HTTP " + r2.status))))
          .then((j) => setSt(j))
          .catch(() => {})
          .finally(() => setBusy(false));
      };
      const setIntervalMinutes = (m) => {
        if (m === curInterval) return;
        setSaving(m);
        fetch(PREFS, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshMinutes: m }) })
          .then((r2) => (r2.ok ? r2.json() : Promise.reject(new Error("HTTP " + r2.status))))
          .then((j) => setSt(j))
          .catch(() => {})
          .finally(() => setSaving(null));
      };

      const kids = [];
      accs.forEach((acc, i) => {
        if (i > 0) kids.push(h("span", { key: "gap" + i, style: { display: "inline-block", width: SEG_GAP + "px" } }));
        kids.push(h("span", { key: "dot" + i, style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: segDot(acc) } }));
        kids.push(h("span", { key: "txt" + i }, segText(acc, i)));
      });
      const pill = h("button", {
        type: "button",
        className: "agy-btn",
        title: title,
        style: Object.assign({}, pillStyle, { opacity: stale ? 0.65 : 1 }),
        onClick: openPop,
      }, kids);

      const blocks = accs.map((acc, i) => {
        const rows = [];
        const sel = acc.selected || null;
        const r = ratioOf(sel);
        if (sel) {
          rows.push(["券号", sel.no || sel.id]);
          rows.push(["余额", money(sel.balance) + " / " + money(sel.nominal) + "（" + Math.round((r ?? 0) * 100) + "%）"]);
          rows.push(["状态", sel.status + (acc.ok === false ? "（数据可能过期）" : "")]);
          rows.push(["失效", (sel.expiry || "?") + "（还剩 " + localCountdownIso(sel.expiry) + "）"]);
          if (sel.products) rows.push(["适用", sel.products]);
          if (sel.scenarios) rows.push(["场景", sel.scenarios]);
        }
        const others = (acc.coupons || []).filter((c) => sel && c.no !== sel.no);
        if (others.length) rows.push(["其他券", others.map((c) => c.no + " " + money(c.balance) + "/" + money(c.nominal)).join("；")]);
        if (acc.error) rows.push(["错误", String(acc.error).slice(0, 160)]);
        return h("div", {
          key: i,
          style: i < accs.length - 1
            ? { marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.2))" }
            : null,
        },
          h("div", { style: { fontWeight: 700, marginBottom: "6px" } },
            segPrefix(acc, i).trim() + " · 优惠券可用余额" + (acc.ok === false ? "（离线快照）" : "")),
          rows.map((rw, k) => h("div", { key: k, style: rowStyle },
            h("span", { style: kStyle }, rw[0]),
            h("span", { style: vStyle }, rw[1]))));
      });

      const pop = h("div", {
        style: Object.assign({}, popStyle, {
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 10000,
          width: "340px",
        })
      },
        blocks,
        h("div", { style: rowStyle },
          h("span", { style: kStyle }, "上次"),
          h("span", { style: vStyle }, "成功于 " + ago(st.at))),
        st.error ? h("div", { style: rowStyle },
          h("span", { style: kStyle }, "错误"),
          h("span", { style: vStyle }, String(st.error).slice(0, 160))) : null,
        h("div", { style: { marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" } },
          h("span", { style: { fontSize: "11px", opacity: 0.6 } }, "刷新间隔"),
          INTERVALS.map((m) => h("button", {
            key: m,
            type: "button",
            disabled: saving !== null,
            onClick: () => setIntervalMinutes(m),
            style: Object.assign({}, btnBase, m === curInterval ? {
              borderColor: "var(--dsw-alias-state-business-primary, #3b82f6)",
              background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 14%, transparent)",
              fontWeight: 700,
            } : null),
          }, (saving === m ? "…" : m + " 分"))),
          h("button", {
            type: "button",
            disabled: busy,
            onClick: doRefresh,
            style: Object.assign({}, btnBase, { marginLeft: "auto" }),
          }, busy ? "刷新中…" : "立即刷新")));

      return h("div", {
        ref: rootRef,
        style: {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }
      }, [
        pill,
        open ? pop : null
      ]);
    }

    function apply(ctx, switches) {
      ctx.slots.inject("conversation.session.header.actions", () =>
        ctx.slots.register(
          { name: "conversation.session.header.actions", id: "qwen-voucher-badge", order: 12 },
          function QwenSlot(props) {
            const curSwitches = useSwitches();
            if (curSwitches && curSwitches.qwen === false) return null;
            var el = VoucherBadge(props);
            return el === null ? placeholder("qwen") : el;
          }
        ));
    }
      return { apply: apply };
    })(useSwitches, badgePlaceholder);

    // ===== wb =====
    var wbModule = (function (useSwitches, placeholder) {

    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const win = globalThis;
    const base = win.location?.origin ?? "";
    const USAGE = base + "/plugins/dsh-connect-workbuddy/usage?region=global";
    const CREDITS_CN = base + "/plugins/dsh-connect-workbuddy/account-credits?region=cn";
    const CREDITS_GL = base + "/plugins/dsh-connect-workbuddy/account-credits?region=global";
    const DUAL_CACHE_KEY = "dsh-workbuddy-dual-cache-v1";
    function fetchJson(url) {
      return fetch(url, { cache: "no-store", headers: { accept: "application/json" } }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    }
    /** 拉两个区的 account-credits；国外区按 accountId 去重（多投影取第一条）。 */
    function fetchDualCredits() {
      return Promise.all([fetchJson(CREDITS_CN).catch(function () { return null; }), fetchJson(CREDITS_GL).catch(function () { return null; })]).then(function (rs) {
        function fold(j) {
          if (!j || !Array.isArray(j.accounts)) return { total: null, accounts: [] };
          const seen = new Set();
          const accounts = [];
          let sum = 0;
          for (const a of j.accounts) {
            const c = Number(a && a.credits);
            if (!Number.isFinite(c)) continue;
            if (a.id && seen.has(a.id)) continue;
            if (a.id) seen.add(a.id);
            sum += c;
            accounts.push({ name: String((a && a.accountName) || a.id || "?"), credits: c, expiringSoon: Number(a && a.expiringSoon) || 0, nearestExpiryMs: Number(a && a.nearestExpiryMs) || null, selected: a.selected === true });
          }
          return { total: sum, accounts: accounts };
        }
        return { cn: fold(rs[0]), gl: fold(rs[1]), at: Date.now() };
      });
    }
    const CACHE_KEY = "dsh-workbuddy-credits-cache-v1";
    const MINUTES_KEY = "dsh-workbuddy-credits-minutes-v1";
    const INTERVALS = [5, 10, 30];
    const DEFAULT_MINUTES = 5;

    function num(v) {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }

    function snapshot(j) {
      const c = j && j.credits ? j.credits : null;
      return {
        at: Date.now(),
        minutes: DEFAULT_MINUTES,
        credits: c
          ? {
              total: num(c.total),
              expiringSoon: num(c.expiringSoon),
              nearestExpiryMs: num(c.nearestExpiryMs) || null,
              packages: Array.isArray(c.packages)
                ? c.packages.map((p) => ({
                    name: String(p.packageName || "套餐"),
                    remain: num(p.remain),
                    size: num(p.size),
                    monthly: p.monthly === true,
                    expiresAtMs: num(p.expiresAtMs) || null,
                  }))
                : [],
            }
          : null,
        accountName: String(j.accountName || ""),
        domain: String(j.domain || ""),
        status: String(j.status || ""),
        error: j.creditsError ? String(j.creditsError) : null,
        rejected: j.credentialRejected === true,
      };
    }

    function readCache() {
      try {
        const raw = win.localStorage ? win.localStorage.getItem(CACHE_KEY) : null;
        if (!raw) return null;
        const j = JSON.parse(raw);
        if (!j || typeof j !== "object" || !j.at) return null;
        return j;
      } catch (e) {
        return null;
      }
    }
    function writeCache(s) {
      try {
        if (win.localStorage) win.localStorage.setItem(CACHE_KEY, JSON.stringify(s));
      } catch (e) {
        /* quota or private mode: the badge still works, just without cross-tab dedupe */
      }
    }
    function readMinutes() {
      try {
        const m = Number(win.localStorage ? win.localStorage.getItem(MINUTES_KEY) : NaN);
        return INTERVALS.indexOf(m) >= 0 ? m : DEFAULT_MINUTES;
      } catch (e) {
        return DEFAULT_MINUTES;
      }
    }



    const rowStyle = { display: "flex", gap: "8px", margin: "3px 0" };
    const kStyle = { opacity: 0.6, flex: "0 0 74px" };
    const vStyle = { flex: 1, wordBreak: "break-all" };
    const btnBase = {
      padding: "2px 9px",
      borderRadius: "999px",
      fontSize: "11px",
      cursor: "pointer",
      lineHeight: 1.6,
      border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3))",
      background: "transparent",
      color: "inherit",
    };

    function WorkBuddyCreditsBadge() {
      const [snap, setSnap] = useState(null);
      const [dual, setDual] = useState(null);
      const [minutes, setMinutesState] = useState(readMinutes);
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const [missing, setMissing] = useState(false);
      const [failAt, setFailAt] = useState(0);
      const [refreshTick, setRefreshTick] = useState(0);
      const [, tick] = useState(0);
      const rootRef = useRef(null);

      useEffect(
        function () {
          let alive = true;
          const force = refreshTick > 0;
          const cached = readCache();
          if (!force && cached && Date.now() - cached.at < minutes * 60000) {
            setSnap(cached);
            try { const d = JSON.parse(win.localStorage.getItem(DUAL_CACHE_KEY) || "null"); if (d && d.at) setDual(d); } catch (e) { /* ignore */ }
            setMissing(false);
            setBusy(false);
            return function () {
              alive = false;
            };
          }
          fetchDualCredits().then(function (d) { if (alive && d && (d.cn.total !== null || d.gl.total !== null)) { setDual(d); try { if (win.localStorage) win.localStorage.setItem(DUAL_CACHE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } } });
          fetch(USAGE, { cache: "no-store", headers: { accept: "application/json" } })
            .then(function (r) {
              if (r.status === 404) {
                if (alive) {
                  setMissing(true);
                  setBusy(false);
                }
                return null;
              }
              if (!r.ok) throw new Error("HTTP " + r.status);
              return r.json();
            })
            .then(function (j) {
              if (!alive || j === null) return;
              const s = snapshot(j);
              s.minutes = minutes;
              writeCache(s);
              setSnap(s);
              setMissing(false);
              setFailAt(0);
              setBusy(false);
            })
            .catch(function () {
              if (!alive) return;
              const c = readCache();
              if (c) setSnap(c);
              setFailAt(Date.now());
              setBusy(false);
            });
          return function () {
            alive = false;
          };
        },
        [minutes, refreshTick]
      );

      useEffect(
        function () {
          const id = setInterval(function () {
            setRefreshTick(function (n) {
              return n + 1;
            });
          }, Math.max(1, minutes) * 60000);
          return function () {
            clearInterval(id);
          };
        },
        [minutes]
      );

      useEffect(function () {
        const id = setInterval(function () {
          tick(function (n) {
            return n + 1;
          });
        }, 30000);
        return function () {
          clearInterval(id);
        };
      }, []);

      useEffect(
        function () {
          if (!open) return undefined;
          const handleOutsideClick = function (e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
              setOpen(false);
            }
          };
          const handleKeyDown = function (e) {
            if (e.key === "Escape") setOpen(false);
          };
          win.addEventListener("mousedown", handleOutsideClick, true);
          win.addEventListener("keydown", handleKeyDown, true);
          return function () {
            win.removeEventListener("mousedown", handleOutsideClick, true);
            win.removeEventListener("keydown", handleKeyDown, true);
          };
        },
        [open]
      );

      if (missing) return null;

      const credits = snap && snap.credits ? snap.credits : null;
      const stale = (snap && snap.error) || failAt > 0;
      const hasDual = dual && (dual.cn.total !== null || dual.gl.total !== null);
      const label = hasDual
        ? "WorkBuddy CN " + (dual.cn.total !== null ? fmt(dual.cn.total) : "-") + "  │  GLOBAL " + (dual.gl.total !== null ? fmt(dual.gl.total) : "-")
        : snap
          ? credits
            ? "WorkBuddy " + fmt(credits.total)
            : snap.rejected
              ? "WorkBuddy 登录失效"
              : "WorkBuddy 无读数"
          : failAt
            ? "WorkBuddy 读取失败"
            : null;
      if (label === null) return null;

      const color = !snap ? "#94a3b8" : snap.rejected ? "#ef4444" : stale ? "#f59e0b" : "#10b981";
      const title = snap
        ? "WorkBuddy Global" +
          (snap.accountName ? " · " + snap.accountName : "") +
          (credits ? "\n剩余 " + fmt(credits.total) + " 积分" : "") +
          (credits && credits.nearestExpiryMs ? "\n最近到期 " + stamp(credits.nearestExpiryMs) + "（还剩 " + countdown(credits.nearestExpiryMs) + "）" : "") +
          "\n上次成功：" + ago(snap.at) +
          (stale ? "\n最近一次读取失败，显示上次快照" : "")
        : "WorkBuddy credits badge";

      const openPop = function () {
        setOpen(function (v) {
          return !v;
        });
      };
      const doRefresh = function () {
        setBusy(true);
        setRefreshTick(function (n) {
          return n + 1;
        });
      };
      const pickMinutes = function (m) {
        if (m === minutes) return;
        try {
          if (win.localStorage) win.localStorage.setItem(MINUTES_KEY, String(m));
        } catch (e) {
          /* ignore */
        }
        setMinutesState(m);
      };

      const pill = h(
        "button",
        {
          type: "button",
          className: "agy-btn",
          title: title,
          style: Object.assign({}, pillStyle, { opacity: stale ? 0.7 : 1 }),
          onClick: openPop,
        },
        h("span", {
          style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color },
        }),
        hasDual
          ? h("span", { style: { display: "inline-flex", alignItems: "center", gap: "10px" } },
              h("span", null, "WorkBuddy CN " + (dual.cn.total !== null ? fmt(dual.cn.total) : "-")),
              h("span", { style: { opacity: 0.35, padding: "0 2px" }, "aria-hidden": "true" }, "│"),
              h("span", null, "GLOBAL " + (dual.gl.total !== null ? fmt(dual.gl.total) : "-"))
            )
          : h("span", null, label)
      );

      if (!open) return pill;

      const rows = [];
      rows.push(["账户", snap && snap.accountName ? snap.accountName : "-"]);
      rows.push(["区域", "Global" + (snap && snap.domain ? "（" + snap.domain + "）" : "")]);
      rows.push(["总剩余", credits ? fmt(credits.total) + " 积分" : "-"]);
      if (credits) {
        rows.push(["3 天内过期", credits.expiringSoon > 0 ? fmt(credits.expiringSoon) : "无"]);
        rows.push([
          "最近到期",
          credits.nearestExpiryMs
            ? stamp(credits.nearestExpiryMs) + "（还剩 " + countdown(credits.nearestExpiryMs) + "）"
            : "无",
        ]);
      }
      rows.push(["上次成功", ago(snap && snap.at)]);
      if (snap && snap.error) rows.push(["错误", String(snap.error).slice(0, 150)]);
      if (!snap && failAt) rows.push(["错误", "连接器路由无响应（HTTP 失败）"]);

      const pkgRows =
        credits && credits.packages.length
          ? credits.packages.map(function (p, i) {
              return h(
                "div",
                {
                  key: "pkg-" + i,
                  style: { display: "flex", gap: "8px", margin: "2px 0", opacity: 0.85 },
                },
                h(
                  "span",
                  { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                  p.name
                ),
                h("span", { style: { fontVariantNumeric: "tabular-nums" } }, fmt(p.remain) + " / " + fmt(p.size)),
                h(
                  "span",
                  { style: { width: "64px", textAlign: "right", opacity: 0.6, fontVariantNumeric: "tabular-nums" } },
                  p.monthly ? "每月刷新" : p.expiresAtMs ? countdown(p.expiresAtMs) : ""
                )
              );
            })
          : null;

      const pop = h(
        "div",
        {
          style: Object.assign({}, popStyle, {
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 10000,
            width: "360px",
          })
        },
        h(
          "div",
          { style: { fontWeight: 700, marginBottom: "6px" } },
          (hasDual ? "WorkBuddy 积分 · 国内 / 国际" : "WorkBuddy Global · 积分余额") + (stale ? "（离线快照）" : "")
        ),
        hasDual ? h("div", { style: { marginBottom: "8px" } },
          ["cn", "gl"].map(function (rg) {
            const zone = dual[rg];
            const name = rg === "cn" ? "国内版 CN" : "国际版 Global";
            return h("div", { key: rg, style: { marginBottom: "8px" } },
              h("div", { style: { fontWeight: 700, fontSize: "11.5px", opacity: 0.75, marginBottom: "3px" } }, name + " 合计 " + (zone.total !== null ? fmt(zone.total) : "-")),
              zone.accounts.length ? zone.accounts.map(function (a, i) {
                return h("div", { key: i, style: { display: "flex", gap: "8px", margin: "2px 0", opacity: 0.85 } },
                  h("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (a.selected ? "● " : "") + a.name),
                  h("span", { style: { fontVariantNumeric: "tabular-nums" } }, fmt(a.credits)),
                  h("span", { style: { width: "70px", textAlign: "right", opacity: 0.6 } }, a.nearestExpiryMs ? countdown(a.nearestExpiryMs) : "")
                );
              }) : h("div", { style: { opacity: 0.6, fontSize: "11px" } }, "无账号数据")
            );
          })
        ) : null,
        rows.map(function (rw, i) {
          return h(
            "div",
            { key: "row-" + i, style: rowStyle },
            h("span", { style: kStyle }, rw[0]),
            h("span", { style: vStyle }, rw[1])
          );
        }),
        pkgRows
          ? h(
              "div",
              { style: { marginTop: "6px", paddingTop: "6px", borderTop: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.2))" } },
              h("div", { style: { opacity: 0.6, marginBottom: "2px" } }, "套餐明细"),
              pkgRows
            )
          : null,
        h(
          "div",
          { style: { marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" } },
          h("span", { style: { fontSize: "11px", opacity: 0.6 } }, "刷新间隔"),
          INTERVALS.map(function (m) {
            return h(
              "button",
              {
                key: "int-" + m,
                type: "button",
                onClick: function () {
                  pickMinutes(m);
                },
                style: Object.assign(
                  {},
                  btnBase,
                  m === minutes
                    ? {
                        borderColor: "var(--dsw-alias-state-business-primary, #3b82f6)",
                        background:
                          "color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 14%, transparent)",
                        fontWeight: 700,
                      }
                    : null
                ),
              },
              m + " 分"
            );
          }),
          h(
            "button",
            { type: "button", disabled: busy, onClick: doRefresh, style: Object.assign({}, btnBase, { marginLeft: "auto" }) },
            busy ? "刷新中…" : "立即刷新"
          )
        )
      );

      return h("div", {
        ref: rootRef,
        style: {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }
      }, [
        pill,
        open ? pop : null
      ]);
    }

    function apply(ctx, switches) {
      ctx.slots.inject("conversation.session.header.actions", function () {
        return ctx.slots.register(
          { name: "conversation.session.header.actions", id: "workbuddy-credits-badge", order: 13 },
          function WorkBuddySlot(props) {
            const curSwitches = useSwitches();
            if (curSwitches && curSwitches.workbuddy === false) return null;
            var el = WorkBuddyCreditsBadge(props);
            return el === null ? placeholder("workbuddy") : el;
          }
        );
      });
    }
      return { apply: apply };
    })(useSwitches, badgePlaceholder);

    // ===== codex =====
    var codexModule = (function (useSwitches, placeholder) {
    var win = globalThis;

    function rpcCall(connection, endpoint, payload) {
      var rpc = connection && connection.rpc;
      if (!rpc || typeof rpc.call !== "function") return Promise.reject(new Error("connection.rpc unavailable"));
      var controller = typeof AbortController === "function" ? new AbortController() : undefined;
      return rpc.call("/api", "codex-subscription/" + endpoint, payload || {}, controller && controller.signal)
        .then(function (response) {
          var result = response && response.result !== undefined ? response.result : response;
          if (result && result.ok === false) {
            throw new Error((result.error && result.error.message) || "rpc error");
          }
          return result && result.value !== undefined ? result.value : result;
        });
    }

    function windowsOf(usage) {
      var limits = usage && Array.isArray(usage.rateLimits) ? usage.rateLimits : [];
      var main = null;
      for (var i = 0; i < limits.length; i += 1) {
        if (limits[i] && limits[i].id === "codex") { main = limits[i]; break; }
      }
      if (main === null && limits.length > 0) main = limits[0];
      var list = main && Array.isArray(main.windows) ? main.windows : [];
      return list
        .filter(function (w) {
          return w && Number.isFinite(Number(w.remainingPercent)) && Number(w.remainingPercent) >= 0 && Number(w.remainingPercent) <= 100;
        })
        .map(function (w) {
          return {
            remainingPercent: Number(w.remainingPercent),
            windowSeconds: Number(w.windowSeconds) || 0,
            resetsAt: Number.isFinite(Number(w.resetsAt)) ? Number(w.resetsAt) : null,
          };
        })
        .sort(function (a, b) { return a.windowSeconds - b.windowSeconds; });
    }

    function fmtPct(v) {
      var n = Number(v);
      return Number.isFinite(n) ? Math.round(n) + "%" : "-";
    }


    function windowLabel(seconds) {
      var s = Number(seconds);
      if (!Number.isFinite(s) || s <= 0) return "窗口";
      var h = Math.round(s / 3600);
      if (h < 24) return h + "h";
      var d = Math.round(h / 24);
      return d + "d";
    }



    function CodexQuotaBadge(props) {
      var React = require("react");
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var ctx = props.__ctx;
      var doc = win.document;

      var s1 = useState(null);
      var snap = s1[0], setSnap = s1[1];
      var s2 = useState(false);
      var open = s2[0], setOpen = s2[1];
      var s3 = useState(0);
      var tick = s3[0], setTick = s3[1];
      var s4 = useState(0);
      var nonce = s4[0], setNonce = s4[1];
      var rootRef = useRef(null);

      useEffect(function () {
        var alive = true;
        var connection = ctx && typeof ctx.get === "function" ? ctx.get("connection") : null;
        function load() {
          rpcCall(connection, "usage", {})
            .then(function (usage) {
              if (!alive) return;
              var wins = windowsOf(usage);
              setSnap({
                at: Date.now(),
                windows: wins,
                credits: usage && usage.credits ? usage.credits : null,
                planType: usage && usage.planType ? String(usage.planType) : "",
                error: null,
              });
            })
            .catch(function (error) {
              if (!alive) return;
              setSnap(function (prev) {
                if (prev && prev.windows && prev.windows.length > 0) {
                  return { at: prev.at, windows: prev.windows, credits: prev.credits, planType: prev.planType, error: String((error && error.message) || error) };
                }
                return { at: null, windows: [], credits: null, planType: "", error: String((error && error.message) || error) };
              });
            });
        }
        load();
        var poll = win.setInterval(load, 60 * 1000);
        var cd = win.setInterval(function () { setTick(function (n) { return n + 1; }); }, 30000);
        return function () {
          alive = false;
          win.clearInterval(poll);
          win.clearInterval(cd);
        };
      }, [nonce]);

      useEffect(function () {
        if (!open) return undefined;
        function handleOutsideClick(e) {
          if (rootRef.current && !rootRef.current.contains(e.target)) {
            setOpen(false);
          }
        }
        function onKey(e) { if (e.key === "Escape") setOpen(false); }
        win.addEventListener("mousedown", handleOutsideClick, true);
        win.addEventListener("keydown", onKey);
        return function () {
          win.removeEventListener("mousedown", handleOutsideClick, true);
          win.removeEventListener("keydown", onKey);
        };
      }, [open]);

      if (snap === null) return null;
      var wins = snap.windows || [];
      if (wins.length === 0 && !snap.error) return null;

      var shortWin = wins.length > 0 ? wins[0] : null;
      var longWin = wins.length > 1 ? wins[wins.length - 1] : null;
      var label = wins.length === 0
        ? "Codex 读取失败"
        : wins.length === 1
          ? "Codex " + fmtPct(shortWin.remainingPercent)
          : "Codex " + windowLabel(shortWin.windowSeconds) + " " + fmtPct(shortWin.remainingPercent) + " · " + windowLabel(longWin.windowSeconds) + " " + fmtPct(longWin.remainingPercent);
      var stale = Boolean(snap.error);
      var color = stale ? "#f59e0b" : dotColor(shortWin ? shortWin.remainingPercent : NaN);

      var pillStyle = {
        background: "var(--agy-bg-header, var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06)))",
        border: "1px solid var(--agy-border-card, var(--dsw-alias-border-l1, rgba(255,255,255,0.12)))",
        borderRadius: "999px",
        cursor: "pointer",
        padding: "3px 12px",
        fontSize: "11.5px",
        fontWeight: 600,
        lineHeight: 1.5,
        color: "var(--agy-text-primary, var(--dsw-alias-label-primary, inherit))",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "var(--agy-shadow-sm, var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,0.05)))",
        userSelect: "none",
        whiteSpace: "nowrap",
        outline: "none",
        flexShrink: 0,
        opacity: stale ? 0.7 : 1,
      };

      var pill = h("button", {
        type: "button",
        className: "agy-btn",
        title: wins.length === 0 ? String(snap.error || "") : wins.map(function (w) {
          return windowLabel(w.windowSeconds) + " 窗口剩余 " + fmtPct(w.remainingPercent) + (w.resetsAt ? "，重置 " + countdown(w.resetsAt) : "");
        }).join("\n") + "\n上次成功：" + ago(snap.at),
        style: pillStyle,
        onClick: function () {
          setOpen(function (v) { return !v; });
        },
      },
        h("span", { style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color } }),
        h("span", null, label));

      var rows = wins.map(function (w) {
        return h("div", { key: "w" + w.windowSeconds, style: { display: "flex", gap: "8px", margin: "3px 0" } },
          h("span", { style: { opacity: 0.6, flex: "0 0 54px" } }, windowLabel(w.windowSeconds)),
          h("span", { style: { flex: 1 } },
            h("span", { style: { display: "inline-block", width: "120px", height: "6px", borderRadius: "3px", background: "var(--dsw-alias-border-l1, rgba(128,128,128,.25))", verticalAlign: "middle", marginRight: "8px", overflow: "hidden" } },
              h("span", { style: { display: "block", width: Math.max(0, Math.min(100, w.remainingPercent)) + "%", height: "100%", background: dotColor(w.remainingPercent) } })),
            h("span", null, "剩 " + fmtPct(w.remainingPercent))),
          h("span", { style: { width: "86px", textAlign: "right", opacity: 0.65 } }, w.resetsAt ? countdown(w.resetsAt) : ""));
      });

      var popStyle = {
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 10000,
        width: "360px",
        background: "var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b))",
        border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25))",
        borderRadius: "10px",
        boxShadow: "0 10px 28px rgba(0,0,0,.35)",
        padding: "10px 12px",
        fontSize: "12px",
        color: "var(--dsw-alias-label-primary, inherit)",
        cursor: "default",
      };

      var pop = h("div", { style: popStyle },
        h("div", { style: { fontWeight: 700, marginBottom: "6px" } }, "Codex 订阅 · 额度" + (stale ? "（上次快照）" : "")),
        rows,
        snap.planType ? h("div", { style: { marginTop: "4px", opacity: 0.7 } }, "套餐：" + snap.planType) : null,
        h("div", { style: { marginTop: "4px", opacity: 0.7 } }, "上次成功：" + ago(snap.at)),
        snap.error ? h("div", { style: { marginTop: "4px", color: "#ef4444", wordBreak: "break-all" } }, String(snap.error).slice(0, 160)) : null,
        h("div", { style: { marginTop: "8px", display: "flex", gap: "6px" } },
          h("button", {
            type: "button",
            style: { padding: "2px 9px", borderRadius: "999px", fontSize: "11px", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3))", background: "transparent", color: "inherit" },
            onClick: function () { setSnap(null); setNonce(function (n) { return n + 1; }); },
          }, "立即刷新")));

      return h("div", {
        ref: rootRef,
        style: {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }
      }, [
        pill,
        open ? pop : null
      ]);
    }

      function apply(ctx, switches) {
        ctx.slots.inject("conversation.session.header.actions", function () {
          return ctx.slots.register(
            { name: "conversation.session.header.actions", id: "codex-quota-badge", order: 14 },
            function CodexQuotaBadgeSlot(props) {
              const curSwitches = useSwitches();
              if (curSwitches && curSwitches.codex === false) return null;
              var el = CodexQuotaBadge(Object.assign({}, props, { __ctx: ctx }));
              return el === null ? placeholder("codex") : el;
            }
          );
        });
      }

      return { apply: apply };
    })(useSwitches, badgePlaceholder);



    // ===== zcode =====
    var zcodeModule = (function (useSwitches, placeholder) {
    var win2 = globalThis;
    var ZBASE = (globalThis.location && globalThis.location.origin) || "";
    var ZSUMMARY = ZBASE + "/api/zcode-start-plan/summary";
    var ZBALANCE = ZBASE + "/api/zcode-start-plan/balance?id=";
    var ZCACHE_KEY = "dsh-zcode-quota-cache-v1";

    function zFmtTokens(n) {
      const v = Number(n);
      if (!Number.isFinite(v)) return "-";
      const abs = Math.abs(v);
      if (abs >= 1e8) return (v / 1e8).toFixed(2).replace(/\.?0+$/, "") + "亿";
      if (abs >= 1e4) return (v / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
      return String(Math.round(v));
    }
    function zNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

    /** 聚合：跨账号按 planName（模型）求和 remaining/total。过滤无名/未知/企业账号。 */
    function zAggregate(accounts) {
      const byModel = new Map();
      for (const a of accounts || []) {
        const b = a && a.balance;
        if (!b || b.enterprise === true) continue;
        const buckets = Array.isArray(b.buckets) && b.buckets.length ? b.buckets : [b];
        for (const bk of buckets) {
          if (!bk) continue;
          const rawName = (bk && bk.showName) || b.planName;
          if (!rawName || typeof rawName !== "string") continue;
          const name = rawName.trim();
          if (!name || name === "未知模型" || name.toLowerCase() === "unknown") continue;
          const rem = zNum(bk.remaining !== undefined ? bk.remaining : b.remaining);
          const tot = zNum(bk.total !== undefined ? bk.total : b.total);
          if (rem <= 0 && tot <= 0) continue;

          const cur = byModel.get(name) || { remaining: 0, total: 0, expiresAt: null };
          cur.remaining += rem;
          cur.total += tot;
          const exp = Number(bk.expiresAt) || Number(b.expiresAt) || 0;
          if (exp && (!cur.expiresAt || exp < cur.expiresAt)) cur.expiresAt = exp;
          byModel.set(name, cur);
        }
      }
      return Array.from(byModel.entries())
        .filter(function (kv) {
          const name = kv[0];
          const info = kv[1];
          return name && name !== "未知模型" && (info.remaining > 0 || info.total > 0);
        })
        .map(function (kv) {
          return { model: kv[0], remaining: kv[1].remaining, total: kv[1].total, expiresAt: kv[1].expiresAt };
        });
    }

    function zReadCache() {
      try {
        const j = JSON.parse(win2.localStorage.getItem(ZCACHE_KEY) || "null");
        if (j && Array.isArray(j.models)) {
          j.models = j.models.filter(function (m) {
            return m && m.model && m.model !== "未知模型" && (zNum(m.remaining) > 0 || zNum(m.total) > 0);
          });
        }
        return j && j.models ? j : null;
      } catch (e) {
        return null;
      }
    }
    function zWriteCache(d) { try { win2.localStorage.setItem(ZCACHE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }

    function ZcodeQuotaBadge() {
      const { useState, useEffect, useRef } = React;
      const h = React.createElement;
      const [models, setModels] = useState(function () {
        const c = zReadCache();
        return c && c.models ? c.models : null;
      });
      const [at, setAt] = useState(function () {
        const c = zReadCache();
        return c && c.at ? c.at : 0;
      });
      const [err, setErr] = useState(null);
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const [, tick] = useState(0);
      const rootRef = useRef(null);

      const load = function () {
        setBusy(true);
        fetch(ZSUMMARY, { cache: "no-store", headers: { accept: "application/json" } })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (j) {
            const accounts = (j && j.accounts) || [];
            return Promise.all(accounts.map(function (a) {
              return fetch(ZBALANCE + encodeURIComponent(a.id), { cache: "no-store", headers: { accept: "application/json" } })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (bj) { return bj && bj.ok ? { id: a.id, nickname: a.nickname, balance: bj.balance } : { id: a.id, nickname: a.nickname, balance: null }; })
                .catch(function () { return { id: a.id, nickname: a.nickname, balance: null }; });
            }));
          })
          .then(function (withBalance) {
            const models2 = zAggregate(withBalance);
            const doc = { models: models2, accounts: withBalance, at: Date.now() };
            setModels(models2); setAt(doc.at); setErr(null); setBusy(false);
            zWriteCache(doc);
          })
          .catch(function (e) {
            const c = zReadCache();
            if (c) { setModels(c.models); setAt(c.at); }
            setErr(String((e && e.message) || e)); setBusy(false);
          });
      };

      useEffect(function () { load(); }, []);
      useEffect(function () { const id = win2.setInterval(load, 5 * 60000); return function () { win2.clearInterval(id); }; }, []);
      useEffect(function () { const id = win2.setInterval(function () { tick(function (n) { return n + 1; }); }, 30000); return function () { win2.clearInterval(id); }; }, []);

      useEffect(function () {
        if (!open) return undefined;
        const handleOutsideClick = function (e) {
          if (rootRef.current && !rootRef.current.contains(e.target)) {
            setOpen(false);
          }
        };
        const onKey = function (e) { if (e.key === "Escape") setOpen(false); };
        win2.addEventListener("mousedown", handleOutsideClick, true);
        win2.addEventListener("keydown", onKey);
        return function () {
          win2.removeEventListener("mousedown", handleOutsideClick, true);
          win2.removeEventListener("keydown", onKey);
        };
      }, [open]);

      if (models === null) return null;
      if (models.length === 0 && !err) return null;

      const stale = Boolean(err);
      const label = models.length === 0 ? "ZCode 无额度" : "ZCode " + models.map(function (m) { return m.model + " " + zFmtTokens(m.remaining); }).join(" · ");
      const pct = models.length && models[0].total > 0 ? models[0].remaining / models[0].total : NaN;
      const color = !Number.isFinite(pct) ? "#94a3b8" : pct <= 0.2 ? "#ef4444" : pct <= 0.5 ? "#f59e0b" : "#10b981";

      const openPop = function () {
        setOpen(function (v) { return !v; });
      };

      const pill = h("button", { type: "button", className: "agy-btn",
        title: models.map(function (m) { return m.model + ": " + zFmtTokens(m.remaining) + " / " + zFmtTokens(m.total) + (m.expiresAt ? " · " + stamp(m.expiresAt) + "到期" : ""); }).join("\n") + (err ? "\n最近读取失败：" + err : ""),
        style: Object.assign({}, pillStyle, { opacity: stale ? 0.7 : 1 }),
        onClick: openPop },
        h("span", { style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color } }),
        h("span", null, label)
      );

      const pop = h("div", {
        style: Object.assign({}, popStyle, {
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          zIndex: 10000,
          width: "360px",
          background: "var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b))",
          boxShadow: "0 10px 28px rgba(0,0,0,.35)",
        })
      },
        h("div", { style: { fontWeight: 700, marginBottom: "6px" } }, "ZCode 账号池 · 按模型聚合" + (stale ? "（离线快照）" : "")),
        models.map(function (m, i) {
          const p = m.total > 0 ? m.remaining / m.total : null;
          return h("div", { key: i, style: { margin: "4px 0" } },
            h("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
              h("span", { style: { flex: 1, fontWeight: 600 } }, m.model),
              h("span", { style: { fontVariantNumeric: "tabular-nums" } }, zFmtTokens(m.remaining) + " / " + zFmtTokens(m.total)),
              h("span", { style: { width: "70px", textAlign: "right", opacity: 0.6 } }, m.expiresAt ? countdown(m.expiresAt) : "")
            ),
            p !== null ? h("div", { style: { height: "5px", borderRadius: "3px", background: "var(--dsw-alias-border-l1, rgba(128,128,128,.25))", marginTop: "3px", overflow: "hidden" } },
              h("div", { style: { width: Math.max(0, Math.min(100, p * 100)) + "%", height: "100%", background: dotColor(p * 100) } })) : null
          );
        }),
        err ? h("div", { style: { marginTop: "6px", color: "#ef4444", fontSize: "11px", wordBreak: "break-all" } }, String(err).slice(0, 150)) : null,
        h("div", { style: { marginTop: "6px", opacity: 0.7 } }, "上次成功：" + ago(at) + " · 每 5 分钟刷新"),
        h("div", { style: { marginTop: "8px", display: "flex", gap: "6px" } },
          h("button", { type: "button", style: { padding: "2px 9px", borderRadius: "999px", fontSize: "11px", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3))", background: "transparent", color: "inherit" }, onClick: function () { load(); } }, busy ? "刷新中…" : "立即刷新")
        )
      );

      return h("div", {
        ref: rootRef,
        style: {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }
      }, [
        pill,
        open ? pop : null
      ]);
    }

      function apply(ctx, switches) {
        ctx.slots.inject("conversation.session.header.actions", function () {
          return ctx.slots.register(
            { name: "conversation.session.header.actions", id: "zcode-quota-badge", order: 15 },
            function ZcodeQuotaBadgeSlot(props) {
              const curSwitches = useSwitches();
              if (curSwitches && curSwitches.zcode === false) return null;
              var el = ZcodeQuotaBadge(Object.assign({}, props, { __ctx: ctx }));
              return el === null ? placeholder("zcode") : el;
            }
          );
        });
      }

      return { apply: apply };
    })(useSwitches, badgePlaceholder);

    // ---- settings panel: one row per badge, each with a live switch ----

    const BADGE_ROWS = [
      { key: "agy", label: "Antigravity 额度", hint: "Gemini / Claude / GPT-OSS 的 5 小时与每周额度" },
      { key: "qwen", label: "千问代金券", hint: "阿里云 BSS 代金券余额" },
      { key: "workbuddy", label: "WorkBuddy 积分", hint: "WorkBuddy 账户剩余积分" },
      { key: "codex", label: "Codex 额度", hint: "Codex 订阅的用量窗口" },
      { key: "zcode", label: "ZCode 额度", hint: "账号池按模型聚合的剩余 token" }
    ];

    function saveSwitches(patch) {
      publish(Object.assign({}, snapshot, patch));
      try {
        fetch(STATE_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch)
        }).catch(function () {});
      } catch (e) { /* offline: keep the optimistic state */ }
    }

    function SwitchRow(props) {
      const h = React.createElement;
      const on = props.on;
      return h("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 0",
          borderBottom: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.16))"
        }
      },
        h("div", { style: { flex: 1, minWidth: 0 } },
          h("div", { style: { fontSize: "13px", fontWeight: 600 } }, props.label),
          h("div", { style: { fontSize: "11.5px", opacity: 0.6, marginTop: "2px" } }, props.hint)
        ),
        h("button", {
          type: "button",
          role: "switch",
          "aria-checked": on ? "true" : "false",
          onClick: function () { props.onToggle(); },
          style: {
            position: "relative",
            width: "38px",
            height: "21px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            background: on ? "var(--dsw-alias-brand-primary, #10b981)" : "var(--dsw-alias-border-l2, rgba(128,128,128,.45))",
            transition: "background .15s ease"
          }
        },
          h("span", {
            style: {
              position: "absolute",
              top: "2px",
              left: on ? "19px" : "2px",
              width: "17px",
              height: "17px",
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,.25)",
              transition: "left .15s ease"
            }
          })
        )
      );
    }

    function StatusBadgesSettings() {
      const h = React.createElement;
      const sw = useSwitches();
      return h("div", { style: { padding: "4px 2px 8px" } },
        h("div", { style: { fontSize: "13px", fontWeight: 600, marginBottom: "2px" } }, "顶栏胶囊"),
        h("div", { style: { fontSize: "11.5px", opacity: 0.6, marginBottom: "10px" } },
          "关掉的胶囊不再显示，开关立即生效并记住。"),
        BADGE_ROWS.map(function (row) {
          return h(SwitchRow, {
            key: row.key,
            label: row.label,
            hint: row.hint,
            on: !!sw[row.key],
            onToggle: function () {
              var patch = {};
              patch[row.key] = !sw[row.key];
              saveSwitches(patch);
            }
          });
        })
      );
    }

    function apply(ctx) {
      agyModule.apply(ctx, snapshot);
      qwenModule.apply(ctx, snapshot);
      wbModule.apply(ctx, snapshot);
      codexModule.apply(ctx, snapshot);
      zcodeModule.apply(ctx, snapshot);
      loadSwitches();

      try {
        ctx.slots.inject("settings.section", function () {
          return ctx.slots.register({
            name: "settings.section",
            id: "status-badges",
            order: 36,
            label: function () { return "顶栏胶囊"; }
          }, StatusBadgesSettings);
        });
      } catch (e) { /* older host without settings.section: badges still work */ }
    }

    exports.apply = apply;
    exports.inject = ["slots", "connection"];
    exports.name = "dsh-status-badges-client";
    return module.exports;
  },
});
