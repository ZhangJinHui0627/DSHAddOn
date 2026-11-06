
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
          useSwitches();
          if (!switches.agy) return null;
          return AgyQuotaBadge(props);
        });
      });
    }