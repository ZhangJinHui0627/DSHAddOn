window.__ModuleLoader__.load({
  id: "dsh-agy-hide-account",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const STYLE_ID = "dsh-agy-hide-account-style";
    const MARK = "data-agy-hide-account";
    const BTN_SELECTOR = 'button[class*="agy-btn"]';
    const CSS = "[" + MARK + '="1"]{display:none !important;}';

    /**
     * The pill we hide is the one whose label starts with "AGY" (agy-link renders
     * "AGY", "AGY (n)" or "AGY · <alias>"). The sibling quota pill starts with a
     * model name, so a text prefix test keeps them apart without depending on any
     * class name, DOM shape or plugin version.
     */
    function isAccountPill(el) {
      const text = (el.textContent || "").trim();
      if (!text.startsWith("AGY")) return false;
      return text.length <= 80;
    }

    function sweep() {
      const pills = document.querySelectorAll(BTN_SELECTOR);
      for (const pill of pills) {
        if (!isAccountPill(pill)) continue;
        const host = pill.parentElement || pill;
        host.setAttribute(MARK, "1");
      }
    }

    let observer = null;
    let flushTimer = null;

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      (document.head || document.documentElement).appendChild(style);
    }

    function scheduleSweep() {
      if (flushTimer !== null) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        sweep();
      }, 120);
    }

    function start() {
      ensureStyle();
      sweep();
      if (observer !== null) return;
      observer = new MutationObserver(scheduleSweep);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    function stop() {
      if (observer !== null) {
        observer.disconnect();
        observer = null;
      }
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      for (const el of document.querySelectorAll("[" + MARK + "]")) el.removeAttribute(MARK);
    }

    function apply(ctx) {
      ctx.effect(() => {
        if (typeof document === "undefined") return () => {};
        start();
        return stop;
      });
    }

    exports.apply = apply;
    exports.inject = [];
    exports.name = "dsh-agy-hide-account-client";
    return module.exports;
  },
});
