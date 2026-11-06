/* build: inject=[slots] - bundle revision bump */
window.__ModuleLoader__.load({
  id: 'dsh-claude-model-picker',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    var SLOT = 'conversation.input.right';
    var ENTRY = 'dsh-claude-model-picker';
    var STYLE_ID = 'dsh-claude-model-picker-style';
    var PREFIX = 'dsh-cmp-';
    var ROUTE = '/plugins/dsh-claude-model-picker/';
    var OFFICIAL = 'deepseek-official';
    var ACCOUNT = 'deepseek-account';
    var CHECK_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>';
    var CHEVRON_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';
    var EMPTY = Object.freeze({ current: null, groups: [], status: 'idle', error: null });

    // ---------- copy ----------
    var COPY = {
      zh: {
        select: '选择模型', trigger: '选择模型，当前 {model}', loading: '正在加载模型…',
        empty: '没有可用的模型。', account: 'DeepSeek 账号', more: '更多模型',
        search: '搜索模型', clear: '清除搜索', searchEmpty: '没有匹配的模型。',
        effort: '推理档位', effortDefault: '默认', noEffort: '当前模型未声明推理档位',
        rateTitle: '相对价格倍率'
      },
      en: {
        select: 'Select model', trigger: 'Select model, currently {model}', loading: 'Loading models…',
        empty: 'No models available.', account: 'DeepSeek Account', more: 'More models',
        search: 'Search models', clear: 'Clear search', searchEmpty: 'No matching models.',
        effort: 'Reasoning effort', effortDefault: 'Default', noEffort: 'This model declares no reasoning levels',
        rateTitle: 'Relative price multiplier'
      }
    };
    function locale() {
      try {
        var l = (navigator.language || '').toLowerCase();
        return l.indexOf('zh') === 0 ? 'zh' : 'en';
      } catch (e) { return 'en'; }
    }
    function copy(key, vars) {
      var text = (COPY[locale()] || COPY.en)[key] || COPY.en[key] || key;
      if (vars) for (var k in vars) text = text.replace('{' + k + '}', vars[k]);
      return text;
    }

    // ---------- activation report ----------
    // The browser half cannot be inspected from the outside while it stays
    // silent, so every install stage is reported to the host half, which appends
    // it to $DSH_HOME/dsh-claude-model-picker/activation.log. A stage that never
    // arrives is the stage that failed.
    var LAST_CTX = null;
    var REPORTED = {};
    function report(stage, extra) {
      if (REPORTED[stage] === true) return;
      REPORTED[stage] = true;
      try {
        var payload = {
          stage: stage,
          at: new Date().toISOString(),
          href: String(location.href),
          hasCtx: LAST_CTX !== null,
          hasSlots: !!(LAST_CTX && LAST_CTX.slots),
          hasSessions: !!(LAST_CTX && LAST_CTX.sessions),
          hasModelDirectories: !!(LAST_CTX && LAST_CTX.modelDirectories)
        };
        if (extra) for (var k in extra) payload[k] = extra[k];
        // GET: the /plugins prefix belongs to the client-module route, which
        // answers GET/HEAD only — a POST never reaches this plugin.
        fetch(ROUTE + 'report?d=' + encodeURIComponent(JSON.stringify(payload)), {
          method: 'GET',
          cache: 'no-store'
        }).catch(function () {});
      } catch (e) { /* reporting must never break the plugin */ }
    }

    // Register with the option spellings this build might expect: `order` in
    // older builds, `priority` in the one whose duplicate-id message names it.
    function safeRegister(ctx, options, component) {
      var attempts = [options,
        { name: options.name, id: options.id, priority: 0, label: options.label, inject: options.inject },
        { name: options.name, id: options.id, label: options.label, inject: options.inject }];
      var last = null;
      for (var i = 0; i < attempts.length; i++) {
        try {
          var un = ctx.slots.register(attempts[i], component);
          if (un) { report("slot-registered", { slot: options.name, variant: i }); return un; }
        } catch (error) { last = error; }
      }
      report("slot-register-failed", { error: String((last && last.message) || last) });
      throw last || new Error("slots.register answered nothing");
    }

    // ---------- small helpers ----------
    function textOf(v) { return typeof v === 'string' ? v : (v === undefined || v === null ? '' : String(v)); }
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    }
    function byId(a, b) { var x = String(a.id), y = String(b.id); return x < y ? -1 : x > y ? 1 : 0; }
    function identity(id, name) {
      var a = textOf(id).toLowerCase(), b = textOf(name).toLowerCase();
      return (b === '' || b === a) ? [a] : [a, b];
    }
    function compileRules(list) {
      var out = [];
      for (var i = 0; i < (list || []).length; i++) {
        var r = list[i];
        if (!r || typeof r.match !== 'string') continue;
        try { out.push({ re: new RegExp(r.match, 'i'), text: r.text || null }); } catch (e) { /* skip bad rule */ }
      }
      return out;
    }
    function claimedBy(rules, candidates) {
      for (var c = 0; c < candidates.length; c++)
        for (var i = 0; i < rules.length; i++)
          if (rules[i].re.test(candidates[c])) return rules[i];
      return null;
    }

    // ---------- data documents (served by the host half) ----------
    var descriptions = null; // { families, tiers, fallback }
    var prices = null;       // { catalog, aliases, models }
    function loadJson(name, assign) {
      try {
        fetch(ROUTE + name, { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (doc) { if (doc && typeof doc === 'object') assign(doc); })
          .catch(function () {});
      } catch (e) {}
    }
    function loadData() {
      if (descriptions === null) loadJson('model-descriptions.json', function (doc) {
        descriptions = { families: compileRules(doc.families), tiers: compileRules(doc.tiers), fallback: doc.fallback || 'en' };
      });
      if (prices === null) loadJson('prices.json', function (doc) { prices = doc; });
    }
    function descriptionOf(groupId, model) {
      if (descriptions !== null) {
        var ids = identity(model.id, model.name);
        var provider = textOf(groupId).toLowerCase();
        var cands = provider === '' ? ids.slice() : [ids[0], provider + '/' + ids[0]].concat(ids.slice(1));
        var family = claimedBy(descriptions.families, cands);
        var rule = family || claimedBy(descriptions.tiers, ids);
        if (rule && rule.text) {
          var pair = rule.text;
          var value = pair[locale()] || pair[descriptions.fallback] || pair.en;
          if (value) return value;
        }
      }
      return typeof model.description === 'string' ? model.description : '';
    }

    // ---------- rate badge ----------
    // The host's catalog may carry its own multiplier. Otherwise the shipped
    // price snapshot gives a relative multiplier: the model's cache-miss CNY
    // price divided by the official DeepSeek Flash off-peak cache-miss price.
    function ownMultiplier(model) {
      if (!model || typeof model !== 'object') return null;
      var keys = ['priceMultiplier', 'creditMultiplier', 'multiplier', 'rateMultiplier', 'costMultiplier'];
      for (var i = 0; i < keys.length; i++) {
        var v = model[keys[i]];
        if (typeof v === 'number' && isFinite(v) && v >= 0) return v;
        if (typeof v === 'string' && /^\d*\.?\d+$/.test(v)) return parseFloat(v);
      }
      return null;
    }
    function baseline(doc) {
      try { return doc.models['deepseek-flash'].CNY.offPeak.cacheMiss; } catch (e) { return 1; }
    }
    function priceOf(doc, model) {
      if (!doc || !doc.catalog) return null;
      var id = textOf(model.id).toLowerCase();
      var raw = doc.catalog[id];
      if (raw === undefined && doc.aliases) {
        var alias = doc.aliases[id];
        if (alias !== undefined) raw = doc.catalog[String(alias).toLowerCase()];
      }
      if (raw === undefined) return null;
      var parts = String(raw).trim().split(/\s+/);
      var n = Number(parts[1]); // input (cache miss) CNY per 1M tokens
      return isFinite(n) && n > 0 ? n : null;
    }
    function rateBadge(groupId, model) {
      var own = ownMultiplier(model);
      var value = own;
      if (value === null && prices !== null) {
        var price = priceOf(prices, model);
        if (price !== null) value = price / baseline(prices);
      }
      if (value === null) return null;
      if (value === 0) return el('span', PREFIX + 'rate ' + PREFIX + 'rate-free', '免费');
      var digits = value < 0.1 ? 3 : 2;
      var text = '×' + value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
      var badge = el('span', PREFIX + 'rate', text);
      badge.title = copy('rateTitle') + ' ' + text;
      return badge;
    }

    // ---------- release tag / group name ----------
    function releaseTag(groupId, model) {
      return (groupId === OFFICIAL || groupId === ACCOUNT) && model.id === 'deepseek-flash' ? '1017' : null;
    }
    function groupName(groupId, name) {
      return groupId === ACCOUNT ? copy('account') : (name || groupId);
    }
    function leadingGroup(groups) {
      for (var i = 0; i < groups.length; i++) if (groups[i].id === OFFICIAL && groups[i].models.length > 0) return groups[i];
      for (var j = 0; j < groups.length; j++) if (groups[j].id === ACCOUNT && groups[j].models.length > 0) return groups[j];
      return null;
    }
    function levelOneSections(groups) {
      var out = [];
      var lead = leadingGroup(groups);
      if (lead !== null) out.push(lead);
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.models.length === 0 || g.id === OFFICIAL || (lead !== null && g.id === lead.id)) continue;
        out.push(g);
      }
      if (out.length === 0) for (var k = 0; k < groups.length; k++) if (groups[k].models.length > 0) out.push(groups[k]);
      return out;
    }
    function remainingGroups(groups, sections) {
      var shown = {}, out = [];
      for (var i = 0; i < sections.length; i++) shown[sections[i].id] = true;
      for (var j = 0; j < groups.length; j++) if (groups[j].models.length > 0 && !shown[groups[j].id]) out.push(groups[j]);
      return out;
    }
    // ---------- model catalog ----------
    // One directory per session. The host re-enumerates after every select,
    // so the last snapshot that could name a seat is kept across the gap.
    function createCatalog(ctx, schedule) {
      var dir = null, sessionId = null, unsub = null, lastGood = null, warmed = false;
      var providerListeners = [];
      var fixedSession = null;

      function currentSessionId() {
        if (fixedSession !== null) return fixedSession;
        var s = ctx.sessions;
        if (!s) return null;
        try {
          if (s.uiSession && s.uiSession.id !== undefined) return s.uiSession.id;
          if (s.list && typeof s.list.current === 'string') return s.list.current;
          if (typeof s.list === 'function') {
            var l = s.list();
            if (l && l.current !== undefined && l.current !== null) return l.current;
            if (Array.isArray(l) && l.length && typeof l[0] === 'string') return l[0];
          }
        } catch (e) {}
        return null;
      }
      function drop() { if (unsub) { try { unsub(); } catch (e) {} unsub = null; } }
      function directory() {
        var id = currentSessionId();
        if (id === null) { drop(); dir = null; sessionId = null; lastGood = null; return null; }
        if (sessionId === id && dir !== null) return dir;
        drop(); dir = null; sessionId = null; lastGood = null;
        try {
          if (ctx.modelDirectories && typeof ctx.modelDirectories.directoryFor === 'function')
            dir = ctx.modelDirectories.directoryFor(id);
        } catch (e) { dir = null; }
        sessionId = id;
        if (dir && typeof dir.store?.subscribe === 'function') {
          unsub = dir.store.subscribe(function () {
            for (var i = 0; i < providerListeners.length; i++) { try { providerListeners[i](); } catch (e) {} }
            if (schedule) schedule();
          });
        }
        return dir;
      }
      function fresh() {
        if (!dir || !dir.store) return null;
        try { return dir.store.getSnapshot(); } catch (e) { return null; }
      }
      function snapshot() {
        var answer = fresh();
        if (answer && answer.current !== null && answer.current !== undefined) { lastGood = answer; return answer; }
        return lastGood || answer;
      }
      function warm() {
        if (warmed || !dir || typeof dir.load !== 'function') return;
        warmed = true;
        try { var p = dir.load(); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (e) {}
      }
      function current(snap) {
        if (!snap || !snap.current) return null;
        for (var g = 0; g < (snap.groups || []).length; g++) {
          var group = snap.groups[g];
          if (group.id !== snap.current.provider) continue;
          for (var m = 0; m < (group.models || []).length; m++)
            if (group.models[m].id === snap.current.model) return { group: group, model: group.models[m] };
        }
        return null;
      }
      function effort(snap) {
        var active = current(snap);
        if (!active || !active.model.reasoning || !snap.current) return null;
        var reasoning = active.model.reasoning;
        var effective = snap.current.reasoningEffort !== undefined ? snap.current.reasoningEffort : reasoning.defaultEffort;
        var label = copy('effortDefault');
        if (effective !== undefined) {
          label = effective;
          for (var i = 0; i < (reasoning.efforts || []).length; i++)
            if (reasoning.efforts[i].id === effective) { label = reasoning.efforts[i].name; break; }
        }
        return { reasoning: reasoning, effective: effective, label: label };
      }
      function select(selection) {
        var d = directory();
        if (!d || typeof d.select !== 'function') return;
        try { var p = d.select(selection); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (e) {}
      }
      return {
        directory: directory, snapshot: snapshot, warm: warm, current: current,
        effort: effort, select: select,
        setSession: function (id) {
          var next = id || null;
          if (next === fixedSession) return;
          fixedSession = next;
          drop();
          dir = null; sessionId = null; lastGood = null; warmed = false;
        },
        reset: function () { drop(); dir = null; sessionId = null; lastGood = null; warmed = false; }
      };
    }
    // ---------- styles ----------
    var CSS = [
      '.dsh-cmp-seat{display:inline-flex;align-items:center;gap:4px;min-width:0;font:inherit}',
      '.dsh-cmp-btn{display:inline-flex;align-items:center;gap:6px;max-width:220px;padding:4px 9px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.24));border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.06));color:var(--dsw-alias-label-primary,#1f2937);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}',
      '.dsh-cmp-btn:hover{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.12))}',
      '.dsh-cmp-btn[disabled]{opacity:.55;cursor:default}',
      '.dsh-cmp-btn-label{overflow:hidden;text-overflow:ellipsis}',
      '.dsh-cmp-btn-label-loading{opacity:.6}',
      '.dsh-cmp-tag,.dsh-cmp-rate{flex:none;padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.10));color:var(--dsw-alias-label-secondary,#6b7280);font-size:10px;font-weight:650;line-height:15px;white-space:nowrap}',
      '.dsh-cmp-rate-free{background:rgba(16,185,129,.14);color:#059669}',
      '.dsh-cmp-card{position:fixed;z-index:2147483000;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;padding:6px;min-width:260px;max-width:min(360px,calc(100vw - 16px));max-height:calc(100vh - 80px);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.24));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2937);box-shadow:0 12px 34px rgba(0,0,0,.22);font:inherit;font-size:12px}',
      '.dsh-cmp-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}',
      '.dsh-cmp-foot{flex:none;display:flex;flex-direction:column;gap:2px;padding-top:4px;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.16))}',
      '.dsh-cmp-rule{display:flex;align-items:center;gap:8px;padding:7px 8px 3px;color:var(--dsw-alias-label-tertiary,#91888a);font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;user-select:none;cursor:default}',
      '.dsh-cmp-rule::after{content:"";flex:1;height:1px;background:var(--dsw-alias-border-l1,rgba(128,128,128,.18))}',
      '.dsh-cmp-option{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dsh-cmp-option:hover{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.10))}',
      '.dsh-cmp-option[aria-checked="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#d97757) 14%,transparent);color:var(--dsw-alias-brand-primary,#c05f43);font-weight:650}',
      '.dsh-cmp-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
      '.dsh-cmp-line{display:flex;align-items:center;gap:6px;min-width:0}',
      '.dsh-cmp-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600}',
      '.dsh-cmp-desc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#91888a);font-size:11px;line-height:15px}',
      '.dsh-cmp-check{flex:none;width:14px;height:14px;color:var(--dsw-alias-brand-primary,#d97757)}',
      '.dsh-cmp-check svg{display:block}',
      '.dsh-cmp-cell{display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;cursor:pointer}',
      '.dsh-cmp-cell:hover{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.10))}',
      '.dsh-cmp-chevron{opacity:.55;flex:none}',
      '.dsh-cmp-chevron svg{display:block}',
      '.dsh-cmp-search{box-sizing:border-box;width:100%;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.22));border-radius:8px;background:var(--dsw-specific-input-major,#fff);color:inherit;font:inherit;font-size:12px;outline:none}',
      '.dsh-cmp-search:focus{border-color:var(--dsw-alias-brand-primary,#d97757)}',
      '.dsh-cmp-status{padding:14px 8px;text-align:center;color:var(--dsw-alias-label-tertiary,#91888a)}',
      '.dsh-cmp-effort{display:flex;align-items:center;gap:8px;padding:6px 8px;color:var(--dsw-alias-label-secondary,#6b7280);font-size:11px}',
      '.dsh-cmp-effort b{margin-left:auto;color:var(--dsw-alias-label-primary,#1f2937);font-weight:650}',
      '.dsh-cmp-levels{display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 6px}',
      '.dsh-cmp-level{padding:3px 8px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.22));border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:11px;cursor:pointer}',
      '.dsh-cmp-level[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary,#d97757);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#d97757) 14%,transparent);color:var(--dsw-alias-brand-primary,#c05f43);font-weight:650}',
      '@media(prefers-color-scheme:dark){.dsh-cmp-card{background:var(--dsw-alias-bg-layer-1,rgba(30,30,34,.98));color:var(--dsw-alias-label-primary,#eee)}.dsh-cmp-search{background:var(--dsw-specific-input-major,#222)}}'
    ].join('\n');
    function installStyles() {
      var s = document.getElementById(STYLE_ID);
      if (s) { s.textContent = CSS; return function () { if (s.parentNode) s.parentNode.removeChild(s); }; }
      s = document.createElement('style'); s.id = STYLE_ID; s.textContent = CSS;
      document.head.appendChild(s);
      return function () { if (s.parentNode) s.parentNode.removeChild(s); };
    }
    // ---------- seat: hide the host's own model button ----------
    // The host draws one button carrying the model (and often the effort)
    // text; our slot component marks it by its text and hides it while the
    // picker is mounted. A MutationObserver re-marks after React swaps.
    function createSeatHider(anchor, getState) {
      var saved = new Map(), observer = null, disposed = false;
      function restore() {
        saved.forEach(function (display, node) { if (node && node.style) node.style.display = display; });
        saved.clear();
      }
      function scan() {
        if (disposed || !anchor.current) return;
        var composer = anchor.current;
        while (composer && composer.nodeType === 1 && composer.getAttribute('data-composer-card') === null) composer = composer.parentElement;
        if (!composer) return;
        var state = getState();
        var names = [];
        if (state && state.current && state.current.model && state.current.model.name) names.push(String(state.current.model.name));
        if (state && state.current && state.current.model && state.current.model.id) names.push(String(state.current.model.id));
        if (state && state.levels) for (var i = 0; i < state.levels.length; i++) names.push(String(state.levels[i].name || state.levels[i].id || ''));
        var buttons = composer.querySelectorAll('button[aria-haspopup="menu"]'), target = null;
        for (var b = 0; b < buttons.length; b++) {
          var text = String(buttons[b].textContent || '').replace(/\s+/g, ' ').trim();
          for (var n = 0; n < names.length; n++)
            if (names[n] && text.indexOf(names[n]) >= 0) { target = buttons[b]; break; }
          if (target) break;
        }
        saved.forEach(function (display, node) {
          if (node !== target) { if (node && node.style) node.style.display = display; saved.delete(node); }
        });
        if (target && !saved.has(target)) {
          saved.set(target, target.style.display || '');
          target.style.display = 'none';
        }
      }
      scan();
      if (window.MutationObserver && document.body) {
        observer = new MutationObserver(scan);
        observer.observe(document.body, { childList: true, subtree: true });
      }
      return function () {
        disposed = true;
        if (observer) observer.disconnect();
        restore();
      };
    }

    // ---------- popover placement ----------
    function place(card, anchor) {
      var r = anchor.getBoundingClientRect();
      var vw = window.innerWidth || 1200, vh = window.innerHeight || 800, margin = 12, gap = 6;
      var w = Math.min(card.offsetWidth || 300, vw - margin * 2);
      var below = vh - r.bottom - margin, above = r.top - margin;
      var openAbove = below < Math.min(260, card.offsetHeight || 260) && above > below;
      var maxH = Math.max(120, Math.min(card.offsetHeight || 420, openAbove ? above : below));
      var top = openAbove ? Math.max(margin, r.top - maxH - gap) : r.bottom + gap;
      if (top + maxH > vh - margin) top = Math.max(margin, vh - margin - maxH);
      var left = Math.max(margin, Math.min(r.left, vw - w - margin));
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      card.style.width = w + 'px';
      card.style.maxHeight = maxH + 'px';
    }
    // ---------- rows ----------
    function buildRow(group, model, selected, withDescription, onPick, catalog) {
      var item = el('button', PREFIX + 'option');
      item.type = 'button';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', selected ? 'true' : 'false');
      var text = el('span', PREFIX + 'text');
      var line = el('span', PREFIX + 'line');
      line.appendChild(el('span', PREFIX + 'name', model.name || model.id));
      var tag = releaseTag(group.id, model);
      if (tag !== null) line.appendChild(el('span', PREFIX + 'tag', tag));
      text.appendChild(line);
      var desc = withDescription ? descriptionOf(group.id, model) : '';
      if (desc) text.appendChild(el('span', PREFIX + 'desc', desc));
      item.appendChild(text);
      var rate = rateBadge(group.id, model);
      if (rate !== null) item.appendChild(rate);
      var check = el('span', PREFIX + 'check');
      check.innerHTML = selected ? CHECK_SVG : '';
      item.appendChild(check);
      item.addEventListener('click', function (e) { e.stopPropagation(); onPick(); });
      return item;
    }

    function buildGroupRule(name) { return el('div', PREFIX + 'rule', name || ''); }

    function buildMoreCell(openSub) {
      var cell = el('button', PREFIX + 'cell');
      cell.type = 'button';
      cell.setAttribute('role', 'menuitem');
      cell.appendChild(el('span', '', copy('more')));
      var chevron = el('span', PREFIX + 'chevron');
      chevron.innerHTML = CHEVRON_SVG;
      cell.appendChild(chevron);
      cell.addEventListener('click', function (e) { e.stopPropagation(); openSub(); });
      return cell;
    }

    // ---------- cards ----------
    function createCards(ctx, catalog, state, refresh) {
      var main = null, sub = null, mainOpen = false, subOpen = false;
      var subQuery = '';
      var anchor = { current: null }; // the model trigger
      var onClose = function () {};
      function closeAll() {
        if (main && main.parentNode) main.parentNode.removeChild(main);
        if (sub && sub.parentNode) sub.parentNode.removeChild(sub);
        main = null; sub = null; mainOpen = false; subOpen = false;
        onClose();
      }
      function position() {
        if (mainOpen && main && anchor.current) place(main, anchor.current);
        if (subOpen && sub && main) place(sub, main);
      }
      function outside(e) {
        if (main && main.contains(e.target)) return;
        if (sub && sub.contains(e.target)) return;
        if (anchor.current && anchor.current.contains(e.target)) return;
        closeAll();
      }
      function keydown(e) { if (e.key === 'Escape') closeAll(); }
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', keydown);
      window.addEventListener('resize', position);
      window.addEventListener('scroll', position, true);

      function openMain() {
        if (!anchor.current) return;
        if (subOpen) closeSub();
        catalog.warm();
        main = el('div', PREFIX + 'card');
        main.setAttribute('role', 'menu');
        var body = el('div', PREFIX + 'body');
        var foot = el('div', PREFIX + 'foot');
        main.appendChild(body);
        main.appendChild(foot);
        document.body.appendChild(main);
        mainOpen = true;
        renderMain();
        place(main, anchor.current);
      }
      function renderMain() {
        if (!main) return;
        var snap = catalog.snapshot();
        var groups = (snap && snap.groups) || [];
        var current = catalog.current(snap);
        var body = main.querySelector('.' + PREFIX + 'body');
        var foot = main.querySelector('.' + PREFIX + 'foot');
        body.textContent = ''; foot.textContent = '';
        var sections = levelOneSections(groups);
        var listed = 0;
        for (var g = 0; g < sections.length; g++) {
          var group = sections[g];
          body.appendChild(buildGroupRule(groupName(group.id, group.name)));
          var models = group.models.slice().sort(byId);
          for (var m = 0; m < models.length; m++) {
            var selected = current !== null && current.group.id === group.id && current.model.id === models[m].id;
            body.appendChild(buildRow(group, models[m], selected, true, (function (gid, mid) {
              return function () { catalog.select({ provider: gid, model: mid }); closeAll(); };
            })(group.id, models[m].id)));
            listed += 1;
          }
        }
        if (listed === 0) body.appendChild(el('div', PREFIX + 'status', copy('empty')));
        // effort row
        var effort = catalog.effort(snap);
        if (effort && effort.reasoning && (effort.reasoning.efforts || []).length > 0) {
          var levels = effort.reasoning.efforts;
          var row = el('div', PREFIX + 'effort');
          row.appendChild(el('span', '', copy('effort')));
          row.appendChild(el('b', '', effort.label));
          foot.appendChild(row);
          var box = el('div', PREFIX + 'levels');
          for (var i = 0; i < levels.length; i++) {
            (function (lv) {
              var b = el('button', PREFIX + 'level', lv.name || lv.id);
              b.type = 'button';
              b.setAttribute('aria-pressed', effort.effective === lv.id ? 'true' : 'false');
              b.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!snap.current) return;
                catalog.select({ provider: snap.current.provider, model: snap.current.model, reasoningEffort: lv.id });
                closeAll();
              });
              box.appendChild(b);
            })(levels[i]);
          }
          foot.appendChild(box);
        }
        var more = remainingGroups(groups, sections).length > 0 || groups.length > 1;
        if (more) foot.appendChild(buildMoreCell(openSub));
      }
      function closeSub() {
        if (sub && sub.parentNode) sub.parentNode.removeChild(sub);
        sub = null; subOpen = false;
      }
      function openSub() {
        if (!main) return;
        sub = el('div', PREFIX + 'card');
        sub.setAttribute('role', 'menu');
        var search = el('input', PREFIX + 'search');
        search.type = 'text';
        search.placeholder = copy('search');
        search.setAttribute('aria-label', copy('search'));
        search.value = subQuery;
        var body = el('div', PREFIX + 'body');
        sub.appendChild(search);
        sub.appendChild(body);
        document.body.appendChild(sub);
        subOpen = true;
        search.addEventListener('input', function () { subQuery = search.value; renderSub(); });
        search.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeAll(); } });
        renderSub();
        place(sub, main);
        try { search.focus({ preventScroll: true }); } catch (e) { search.focus(); }
      }
      function admits(group, model, query) {
        if (query === '') return true;
        return (textOf(model.name) + ' ' + textOf(model.id) + ' ' + textOf(group.name || group.id)).toLowerCase().indexOf(query) >= 0;
      }
      function renderSub() {
        if (!sub) return;
        var snap = catalog.snapshot();
        var groups = (snap && snap.groups) || [];
        var current = catalog.current(snap);
        var query = subQuery.trim().toLowerCase();
        var body = sub.querySelector('.' + PREFIX + 'body');
        body.textContent = '';
        var sections = query === '' ? (function () {
          var rest = remainingGroups(groups, levelOneSections(groups));
          return rest.length > 0 ? rest : groups;
        })() : groups;
        var listed = 0;
        for (var g = 0; g < sections.length; g++) {
          var group = sections[g];
          var found = group.models.slice().sort(byId).filter(function (m) { return admits(group, m, query); });
          if (found.length === 0) continue;
          body.appendChild(buildGroupRule(groupName(group.id, group.name)));
          for (var m = 0; m < found.length; m++) {
            var selected = current !== null && current.group.id === group.id && current.model.id === found[m].id;
            body.appendChild(buildRow(group, found[m], selected, false, (function (gid, mid) {
              return function () { catalog.select({ provider: gid, model: mid }); closeAll(); };
            })(group.id, found[m].id)));
            listed += 1;
          }
        }
        if (listed === 0) body.appendChild(el('div', PREFIX + 'status', query === '' ? copy('empty') : copy('searchEmpty')));
      }
      return {
        anchor: anchor,
        setOnClose: function (fn) { onClose = fn; },
        isOpen: function () { return mainOpen || subOpen; },
        toggle: function () { if (mainOpen || subOpen) closeAll(); else openMain(); },
        close: closeAll,
        refresh: function () { if (mainOpen) renderMain(); if (subOpen) renderSub(); position(); },
        dispose: function () {
          closeAll();
          document.removeEventListener('pointerdown', outside, true);
          document.removeEventListener('keydown', keydown);
          window.removeEventListener('resize', position);
          window.removeEventListener('scroll', position, true);
        }
      };
    }
    // ---------- React component ----------
    function Picker(props) {
      var ctx = props.__ctx, sessionId = props.sessionId;
      var React = require("react"), h = React.createElement;
      var catalogRef = React.useRef(null), cardsRef = React.useRef(null);
      var seatRef = React.useRef(null), triggerRef = React.useRef(null);
      var stateRef = React.useRef(null);
      var [, force] = React.useReducer(function (x) { return x + 1; }, 0);

      if (catalogRef.current === null) {
        catalogRef.current = createCatalog(ctx, function () {
          try { if (cardsRef.current) cardsRef.current.refresh(); } catch (e) {}
          try { force(); } catch (e) {}
        });
      }
      var cat = catalogRef.current;
      var sid = sessionId || null;
      if (typeof cat.setSession === "function") cat.setSession(sid);
      var subscribe = React.useCallback(function (fn) {
        var d = cat.directory(); cat.warm(); loadData();
        if (d && d.store && typeof d.store.subscribe === "function") return d.store.subscribe(fn);
        return function () {};
      }, [cat]);
      var getSnapshot = React.useCallback(function () { return cat.snapshot() || EMPTY; }, [cat]);
      var snap = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      var current = cat.current(snap);
      var effort = cat.effort(snap);
      var levels = effort && effort.reasoning ? (effort.reasoning.efforts || []) : [];
      stateRef.current = { current: current, levels: levels };

      React.useEffect(function () {
        if (cardsRef.current === null) cardsRef.current = createCards(ctx, cat, stateRef, force);
        var cards = cardsRef.current;
        cards.anchor.current = triggerRef.current;
        var stopHider = createSeatHider(triggerRef, function () { return stateRef.current; });
        return function () {
          stopHider();
          cards.dispose();
          cardsRef.current = null;
          cat.reset();
        };
      }, [cat, ctx]);

      React.useEffect(function () { cat.directory(); cat.warm(); loadData(); force(); }, [cat, sid]);

      var label = current ? (current.model.name || current.model.id) : copy("loading");
      var tag = current ? releaseTag(current.group.id, current.model) : null;
      return h(React.Fragment, null,
        h("span", { ref: seatRef, hidden: true, "aria-hidden": "true" }),
        h("button", {
          ref: triggerRef, type: "button", className: PREFIX + "btn",
          "aria-haspopup": "menu",
          "aria-expanded": cardsRef.current && cardsRef.current.isOpen() ? "true" : "false",
          "aria-label": copy("trigger", { model: label }) + (tag ? " " + tag : ""),
          onClick: function (e) {
            e.stopPropagation();
            if (cardsRef.current) cardsRef.current.toggle();
            force();
          }
        },
          h("span", { className: PREFIX + "btn-label" + (current ? "" : " " + PREFIX + "btn-label-loading") }, label),
          tag ? h("span", { className: PREFIX + "tag" }, tag) : null
        )
      );
    }

    // ---------- apply ----------
    function apply(ctx) {
      LAST_CTX = ctx;
      report("apply-enter", { slot: SLOT });
      try {
        installStyles();
        report("styles-installed");
      } catch (error) {
        report("styles-failed", { error: String((error && error.message) || error) });
      }
      try {
        loadData();
        report("data-requested");
      } catch (error) {
        report("data-failed", { error: String((error && error.message) || error) });
      }
      var off;
      // A slot that never answers is a distinct failure from one that throws.
      setTimeout(function () { report("inject-timeout", { slot: SLOT }); }, 3000);
      try {
        off = ctx.slots.inject(SLOT, function () {
          report("slot-injected", { slot: SLOT });
          var unregister;
          try {
            unregister = safeRegister(ctx, {
              name: SLOT, id: ENTRY, order: 40,
              label: function () { return copy("select"); },
              inject: function (sessionId) { return { sessionId: sessionId }; }
            }, function (props) {
              try {
                report("render", { hasSessionId: !!(props && props.sessionId) });
              } catch (e) { /* ignore */ }
              return require("react").createElement(Picker, Object.assign({}, props, { __ctx: ctx }));
            });
            report("slot-registered", { slot: SLOT });
          } catch (error) {
            report("slot-register-failed", { error: String((error && error.message) || error) });
            throw error;
          }
          return unregister;
        });
        report("inject-returned");
      } catch (error) {
        report("inject-failed", { error: String((error && error.message) || error) });
        try { console.error("[dsh-claude-model-picker] slot registration failed", error); } catch (e) {}
      }
      return function () {
        try { if (typeof off === "function") off(); } catch (e) { /* ignore */ }
      };
    }

    exports.name = "dsh-claude-model-picker-client";
    exports.inject = ["slots"];
    exports.apply = apply;
    return module.exports;
  },
});
