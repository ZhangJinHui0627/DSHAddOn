window.__ModuleLoader__.load({
  id: "dsh-codex-slider-bridge",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    require("react");
    const win = globalThis;
    const base = (win.location && win.location.origin) || "";
    const REPORT = base + "/plugins/dsh-codex-slider-bridge/report";
    const VERSION = "0.1.0";
    const EFFORT_LABELS = ["推理等级", "effort"];
    const EFFORT_ATTR = "data-dsh-bridge-effort";
    const BRIDGE_ROLE_ATTR = "data-dsh-bridge-role";
    const PROBE_DELAY_MS = 1400;

    function norm(text) {
      return String(text || "").replace(/\s+/g, "").toLowerCase();
    }
    function textOf(root, selector) {
      if (!root) return "";
      var el = root.querySelector(selector);
      return el ? String(el.textContent || "").trim() : "";
    }
    function cellLabel(cell) {
      return norm(textOf(cell, ".codexModelSelectCellLabel") || (cell.textContent || ""));
    }
    function cellSnapshot(cell, index) {
      return {
        index: index,
        label: textOf(cell, ".codexModelSelectCellLabel"),
        value: textOf(cell, ".codexModelSelectCellValue"),
        role: cell.getAttribute("role"),
        cls: String(cell.className || ""),
        bridged: cell.hasAttribute(BRIDGE_ROLE_ATTR),
        effort: cell.hasAttribute(EFFORT_ATTR),
      };
    }

    function findOpenCodexMenu(doc) {
      var seats = doc.querySelectorAll('button[aria-haspopup="menu"][aria-expanded="true"]');
      for (var i = 0; i < seats.length; i += 1) {
        var seat = seats[i];
        var menuId = seat.getAttribute("aria-controls");
        if (!menuId) continue;
        var menu = doc.getElementById(menuId);
        if (!menu) continue;
        var cells = menu.querySelectorAll(".codexModelSelectCell");
        if (cells.length >= 2) return { seat: seat, menu: menu, cells: cells };
      }
      return null;
    }

    function narrow(menu) {
      var cells = Array.prototype.slice.call(menu.querySelectorAll(".codexModelSelectCell"));
      var labels = cells.map(cellLabel);
      var effortIdx = -1;
      for (var i = 0; i < labels.length; i += 1) {
        if (EFFORT_LABELS.indexOf(labels[i]) >= 0) { effortIdx = i; break; }
      }
      if (effortIdx < 1) return { ok: false, reason: "no-effort-cell", labels: labels, cellCount: cells.length };
      var effortCell = cells[effortIdx];
      if (!effortCell.hasAttribute(EFFORT_ATTR)) effortCell.setAttribute(EFFORT_ATTR, "1");
      if (cells.length <= 2) return { ok: true, changed: false, reason: "already-two", labels: labels, effortIdx: effortIdx, cellCount: cells.length };
      var changed = false;
      var stripped = [];
      for (var j = 0; j < cells.length; j += 1) {
        if (j === 0 || j === effortIdx) continue;
        var cell = cells[j];
        if (cell.getAttribute("role") === "menuitem") {
          cell.setAttribute(BRIDGE_ROLE_ATTR, "1");
          cell.setAttribute("role", "button");
          changed = true;
          stripped.push(j);
        }
      }
      return {
        ok: true,
        changed: changed,
        reason: changed ? "narrowed" : "already-narrowed",
        labels: labels,
        effortIdx: effortIdx,
        cellCount: cells.length,
        stripped: stripped,
      };
    }

    function poke(doc, menu) {
      var node = doc.createElement("span");
      node.setAttribute("data-dsh-bridge-poke", "");
      node.style.cssText = "display:none;width:0;height:0;pointer-events:none";
      try { menu.appendChild(node); } catch (error) { return; }
      win.setTimeout(function () {
        try { node.remove(); } catch (error) { /* menu may already be gone */ }
      }, 20);
    }

    function summarize(value) {
      try {
        var text = JSON.stringify(value);
        if (typeof text !== "string") return String(value);
        return text.length > 1600 ? text.slice(0, 1600) + "..." : text;
      } catch (error) {
        return String(value);
      }
    }

    function withTimeout(promise, ms) {
      return Promise.race([
        promise,
        new Promise(function (_, reject) {
          win.setTimeout(function () { reject(new Error("timeout after " + ms + "ms")); }, ms);
        }),
      ]);
    }

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

    function rpcProbe(connection) {
      var out = { attempted: false };
      var rpc = connection && connection.rpc;
      if (!rpc || typeof rpc.call !== "function") {
        out.error = "connection.rpc unavailable";
        return Promise.resolve(out);
      }
      out.attempted = true;
      out.path = "/api + codex-subscription/status";
      return withTimeout(rpcCall(connection, "status", {}), 8000)
        .then(function (status) {
          out.status = summarize(status);
          return withTimeout(rpcCall(connection, "usage", {}), 8000);
        })
        .then(function (usage) {
          out.usage = summarize(usage);
          return out;
        })
        .catch(function (error) {
          out.error = String((error && error.message) || error);
          return out;
        });
    }

    function sendReport(payload) {
      try {
        return fetch(REPORT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        })
          .then(function (response) { return response.ok; })
          .catch(function () { return false; });
      } catch (error) {
        return Promise.resolve(false);
      }
    }

    function start(ctx) {
      var doc = win.document;
      if (!doc) return function () {};
      var timer = null;
      var disposed = false;
      var probeStarted = false;

      function schedule() {
        if (disposed || timer !== null) return;
        timer = win.setTimeout(function () {
          timer = null;
          scan();
        }, 40);
      }

      function scan() {
        if (disposed) return;
        var found = findOpenCodexMenu(doc);
        if (found === null) return;
        var before = Array.prototype.slice.call(found.menu.querySelectorAll(".codexModelSelectCell")).map(cellSnapshot);
        var result = narrow(found.menu);
        if (!result.ok) {
          if (!probeStarted && result.reason === "no-effort-cell") {
            probeStarted = true;
            runProbe(found, before, result);
          }
          return;
        }
        if (result.changed) poke(doc, found.menu);
        if (!probeStarted) {
          probeStarted = true;
          runProbe(found, before, result);
        }
      }

      function runProbe(found, before, result) {
        var samples = [];
        var attempts = 0;
        var maxAttempts = 12;

        function sample() {
          if (disposed) return;
          attempts += 1;
          var stillOpen = doc.documentElement && doc.documentElement.contains(found.menu);
          var cells = Array.prototype.slice.call(found.menu.querySelectorAll(".codexModelSelectCell"));
          var effortCell = found.menu.querySelector("[" + EFFORT_ATTR + "]");
          var row = effortCell || null;
          samples.push({
            attempt: attempts,
            menuStillOpen: stillOpen,
            inlineInMenu: Boolean(found.menu.querySelector(".ces-inline")),
            inlineInEffortCell: Boolean(row && row.querySelector(".ces-inline")),
            rowHeight: row ? (row.style.height || "") : null,
            rowFlexWrap: row ? (row.style.flexWrap || "") : null,
            rowChildren: row ? row.children.length : null,
            menuitemCount: found.menu.querySelectorAll('button[role="menuitem"]').length,
            cells: cells.map(function (cell) {
              return {
                label: textOf(cell, ".codexModelSelectCellLabel"),
                value: textOf(cell, ".codexModelSelectCellValue"),
                role: cell.getAttribute("role"),
                bridged: cell.hasAttribute(BRIDGE_ROLE_ATTR),
                effort: cell.hasAttribute(EFFORT_ATTR),
              };
            }),
          });
          var done = samples.length >= maxAttempts;
          if (!done && !stillOpen) done = true;
          if (!done) {
            win.setTimeout(sample, 500);
            return;
          }
          finish(samples);
        }

        function finish(all) {
          var everOpen = all.some(function (s) { return s.menuStillOpen; });
          var everInline = all.some(function (s) { return s.inlineInMenu || s.inlineInEffortCell; });
          var payload = {
            plugin: "dsh-codex-slider-bridge",
            version: VERSION,
            at: Date.now(),
            href: String((win.location && win.location.href) || ""),
            userAgent: String((win.navigator && win.navigator.userAgent) || ""),
            menu: {
              id: found.menu.id || null,
              ariaLabel: found.menu.getAttribute("aria-label") || null,
              cellCount: result.cellCount,
              menuitemCountAfterBridge: found.menu.querySelectorAll('button[role="menuitem"]').length,
            },
            bridge: result,
            cellsBefore: before,
            samples: all,
            verdict: {
              menuStayedOpenLongEnough: everOpen,
              sliderEverAttached: everInline,
              note: everInline
                ? "slider container appeared inside the codex menu"
                : everOpen
                  ? "menu stayed open but no .ces-inline container ever appeared"
                  : "menu closed before any sample could observe it; inconclusive",
            },
            composerFound: Boolean(found.seat.closest && found.seat.closest("[data-composer-card]")),
            seat: {
              haspopup: found.seat.getAttribute("aria-haspopup"),
              controls: found.seat.getAttribute("aria-controls"),
              text: String(found.seat.textContent || "").trim().slice(0, 120),
            },
          };
          rpcProbe(ctx.get("connection")).then(function (rpcResult) {
            payload.rpc = rpcResult;
            return sendReport(payload);
          });
        }

        win.setTimeout(sample, 300);
      }

      var Observer = win.MutationObserver;
      var observer = null;
      if (typeof Observer === "function") {
        observer = new Observer(schedule);
        observer.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
      }

      scan();

      win.__dshCodexBridge = {
        version: VERSION,
        scan: scan,
        report: function () {
          probeStarted = false;
          scan();
        },
      };

      return function () {
        disposed = true;
        if (timer !== null) {
          win.clearTimeout(timer);
          timer = null;
        }
        if (observer) {
          try { observer.disconnect(); } catch (error) { /* ignore */ }
        }
        try { delete win.__dshCodexBridge; } catch (error) { /* ignore */ }
      };
    }


    /* ─────────── 顶栏 Codex 余额胶囊 ─────────── */

    function fmtPct(v) {
      var n = Number(v);
      return Number.isFinite(n) ? Math.round(n) + "%" : "-";
    }
    function ago(ms) {
      if (!ms) return "从未成功";
      var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
      if (s < 60) return s + " 秒前";
      var m = Math.floor(s / 60);
      if (m < 60) return m + " 分钟前";
      var hh = Math.floor(m / 60);
      return hh < 24 ? hh + " 小时前" : Math.floor(hh / 24) + " 天前";
    }
    function windowLabel(seconds) {
      var s = Number(seconds);
      if (!Number.isFinite(s) || s <= 0) return "窗口";
      var h = Math.round(s / 3600);
      if (h < 24) return h + "h";
      var d = Math.round(h / 24);
      return d + "d";
    }
    function countdown(ms) {
      var t = Number(ms);
      if (!Number.isFinite(t) || t <= 0) return "";
      var left = t - Date.now();
      if (left <= 0) return "即将重置";
      var mins = Math.ceil(left / 60000);
      var d = Math.floor(mins / 1440);
      var hh = Math.floor((mins % 1440) / 60);
      if (d > 0) return d + "天" + hh + "小时";
      var mm = mins % 60;
      return hh > 0 ? hh + "小时" + mm + "分" : mm + "分钟";
    }
    function dotColor(pct) {
      if (!Number.isFinite(pct)) return "#94a3b8";
      if (pct <= 20) return "#ef4444";
      if (pct <= 50) return "#f59e0b";
      return "#10b981";
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
      var s5 = useState({ top: 0, left: 0 });
      var pos = s5[0], setPos = s5[1];
      var pillRef = useRef(null);
      var popRef = useRef(null);

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
        var poll = win.setInterval(load, 5 * 60000);
        var cd = win.setInterval(function () { setTick(function (n) { return n + 1; }); }, 30000);
        return function () {
          alive = false;
          win.clearInterval(poll);
          win.clearInterval(cd);
        };
      }, [nonce]);

      useEffect(function () {
        if (!open) return undefined;
        function onDown(e) {
          if (pillRef.current && pillRef.current.contains(e.target)) return;
          if (popRef.current && popRef.current.contains(e.target)) return;
          setOpen(false);
        }
        function onKey(e) { if (e.key === "Escape") setOpen(false); }
        doc.addEventListener("pointerdown", onDown, true);
        doc.addEventListener("keydown", onKey);
        return function () {
          doc.removeEventListener("pointerdown", onDown, true);
          doc.removeEventListener("keydown", onKey);
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
        ref: pillRef,
        title: wins.length === 0 ? String(snap.error || "") : wins.map(function (w) {
          return windowLabel(w.windowSeconds) + " 窗口剩余 " + fmtPct(w.remainingPercent) + (w.resetsAt ? "，重置 " + countdown(w.resetsAt) : "");
        }).join("\n") + "\n上次成功：" + ago(snap.at),
        style: pillStyle,
        onClick: function () {
          if (pillRef.current) {
            var b = pillRef.current.getBoundingClientRect();
            setPos({ top: b.bottom + 6, left: Math.max(8, Math.min(b.left, (win.innerWidth || 1200) - 376)) });
          }
          setOpen(function (v) { return !v; });
        },
      },
        h("span", { style: { display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color } }),
        h("span", null, label));

      if (!open) return pill;

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
        top: pos.top,
        left: pos.left,
      };

      return h(React.Fragment, null, pill,
        h("div", { ref: popRef, style: popStyle },
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
            }, "立即刷新"))));
    }

    function apply(ctx) {
      ctx.effect(function () {
        return start(ctx);
      }, "codex-slider-bridge: codex menu <> effort slider");
      try {
        ctx.slots.inject("conversation.session.header.actions", function () {
          return ctx.slots.register(
            { name: "conversation.session.header.actions", id: "codex-quota-badge", order: 14 },
            function CodexQuotaBadgeSlot(props) {
              return CodexQuotaBadge(Object.assign({}, props, { __ctx: ctx }));
            }
          );
        });
      } catch (error) {
        // 顶栏没有这一席也不该影响桥接本身
      }
    }

    exports.apply = apply;
    exports.inject = ["slots", "connection"];
    exports.name = "dsh-codex-slider-bridge-client";
    return module.exports;
  },
});
