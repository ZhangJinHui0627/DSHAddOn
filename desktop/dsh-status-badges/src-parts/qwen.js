
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
    function dotColor(r) {
      if (r === null) return "#64748b";
      if (r <= 0.1) return "#ef4444";
      return "#10b981";
    }
    function countdown(iso) {
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
      return dotColor(ratioOf(sel));
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
      const pillRef = useRef(null);
      const popRef = useRef(null);
      const [pos, setPos] = useState({ top: 0, left: 0 });

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
        const onDown = (e) => {
          if (pillRef.current && pillRef.current.contains(e.target)) return;
          if (popRef.current && popRef.current.contains(e.target)) return;
          setOpen(false);
        };
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("pointerdown", onDown, true);
        document.addEventListener("keydown", onKey);
        return () => {
          document.removeEventListener("pointerdown", onDown, true);
          document.removeEventListener("keydown", onKey);
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
        return head + " · 券" + (sel.no ? " " + sel.no : "") + " · 余额 " + money(sel.balance) + " / 面值 " + money(sel.nominal) + "，失效 " + (sel.expiry || "?") + "（还剩 " + countdown(sel.expiry) + "）";
      }).join("\n") + "\n上次成功：" + ago(st.at) + "，每 " + curInterval + " 分钟刷新";

      const openPop = () => {
        if (pillRef.current) {
          const b = pillRef.current.getBoundingClientRect();
          setPos({ top: b.bottom + 6, left: Math.max(8, Math.min(b.left, (win.innerWidth || 1200) - 356)) });
        }
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
        ref: pillRef,
        title: title,
        style: Object.assign({}, pillStyle, { opacity: stale ? 0.65 : 1 }),
        onClick: openPop,
      }, kids);

      if (!open) return pill;

      const blocks = accs.map((acc, i) => {
        const rows = [];
        const sel = acc.selected || null;
        const r = ratioOf(sel);
        if (sel) {
          rows.push(["券号", sel.no || sel.id]);
          rows.push(["余额", money(sel.balance) + " / " + money(sel.nominal) + "（" + Math.round((r ?? 0) * 100) + "%）"]);
          rows.push(["状态", sel.status + (acc.ok === false ? "（数据可能过期）" : "")]);
          rows.push(["失效", (sel.expiry || "?") + "（还剩 " + countdown(sel.expiry) + "）"]);
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

      const pop = h("div", { ref: popRef, style: Object.assign({}, popStyle, { top: pos.top, left: pos.left }) },
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

      return h(React.Fragment, null, pill, pop);
    }

    function apply(ctx) {
      ctx.slots.inject("conversation.session.header.actions", () =>
        ctx.slots.register(
          { name: "conversation.session.header.actions", id: "qwen-voucher-badge", order: 12 },
          VoucherBadge
        ));
    }
    exports.apply = apply;
    exports.inject = ["slots"];
    exports.name = "dsh-qwen-voucher-client";
