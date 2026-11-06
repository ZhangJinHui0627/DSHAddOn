
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const win = globalThis;
    const base = win.location?.origin ?? "";
    const USAGE = base + "/plugins/dsh-connect-workbuddy/usage?region=global";
    const CACHE_KEY = "dsh-workbuddy-credits-cache-v1";
    const MINUTES_KEY = "dsh-workbuddy-credits-minutes-v1";
    const INTERVALS = [5, 10, 30];
    const DEFAULT_MINUTES = 5;

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
      zIndex: 9998,
      width: "360px",
      background: "var(--dsw-alias-bg-layer-1, #fff)",
      border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25))",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.18)",
      padding: "10px 12px",
      fontSize: "12px",
      color: "var(--dsw-alias-label-primary, inherit)",
    };
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
      const [minutes, setMinutesState] = useState(readMinutes);
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const [missing, setMissing] = useState(false);
      const [failAt, setFailAt] = useState(0);
      const [refreshTick, setRefreshTick] = useState(0);
      const [, tick] = useState(0);
      const pillRef = useRef(null);
      const popRef = useRef(null);
      const [pos, setPos] = useState({ top: 0, left: 0 });

      useEffect(
        function () {
          let alive = true;
          const force = refreshTick > 0;
          const cached = readCache();
          if (!force && cached && Date.now() - cached.at < minutes * 60000) {
            setSnap(cached);
            setMissing(false);
            setBusy(false);
            return function () {
              alive = false;
            };
          }
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
          const onDown = function (e) {
            if (pillRef.current && pillRef.current.contains(e.target)) return;
            if (popRef.current && popRef.current.contains(e.target)) return;
            setOpen(false);
          };
          const onKey = function (e) {
            if (e.key === "Escape") setOpen(false);
          };
          document.addEventListener("pointerdown", onDown, true);
          document.addEventListener("keydown", onKey);
          return function () {
            document.removeEventListener("pointerdown", onDown, true);
            document.removeEventListener("keydown", onKey);
          };
        },
        [open]
      );

      if (missing) return null;

      const credits = snap && snap.credits ? snap.credits : null;
      const stale = (snap && snap.error) || failAt > 0;
      const label = snap
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
        if (pillRef.current) {
          const b = pillRef.current.getBoundingClientRect();
          setPos({ top: b.bottom + 6, left: Math.max(8, Math.min(b.left, (win.innerWidth || 1200) - 376)) });
        }
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
          ref: pillRef,
          title: title,
          style: Object.assign({}, pillStyle, { opacity: stale ? 0.7 : 1 }),
          onClick: openPop,
        },
        h("span", {
          style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color },
        }),
        h("span", null, label)
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
        { ref: popRef, style: Object.assign({}, popStyle, { top: pos.top, left: pos.left }) },
        h(
          "div",
          { style: { fontWeight: 700, marginBottom: "6px" } },
          "WorkBuddy Global · 积分余额" + (stale ? "（离线快照）" : "")
        ),
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

      return h(React.Fragment, null, pill, pop);
    }

    function apply(ctx, switches) {
      ctx.slots.inject("conversation.session.header.actions", function () {
        return ctx.slots.register(
          { name: "conversation.session.header.actions", id: "workbuddy-credits-badge", order: 13 },
          function WorkBuddySlot(props) {
            if (!switches.workbuddy) return null;
            return WorkBuddyCreditsBadge(props);
          }
        );
      });
    }