/* Same-origin presentation/context bridge. Business logic and canonical stores stay in each tool. */
(() => {
  if (new URLSearchParams(location.search).get("embedded") !== "1" || parent === window) return;
  document.documentElement.classList.add("gucc-embedded-tool");
  const send = (type, detail = {}) => parent.postMessage({type, ...detail}, location.origin);
  let following = false;
  const report = () => {
    const content = document.querySelector(".creator-shell, .shell");
    const height = Math.ceil((content ? content.getBoundingClientRect().bottom + scrollY : document.body.scrollHeight) + 45);
    if (Number.isFinite(height) && height >= 200) send("gucc:embedded-tool-height", {height});
    const el = document.activeElement;
    send("gucc:embedded-tool-state", {
      modal: !!document.querySelector("dialog[open]"),
      editing: !!el?.matches('textarea, input:not([type=button]):not([type=checkbox]):not([type=file]), [contenteditable=true]')
    });
  };
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === "gucc:embedded-tool-viewport") {
      document.documentElement.style.setProperty("--embed-visible-top", event.data.top + "px");
      document.documentElement.style.setProperty("--embed-visible-height", event.data.height + "px");
    }
    if (event.data?.type === "gucc:embedded-tool-context") {
      const C = window.GuccCreatorContext;
      if (C && C.key(window.GuccCreatorWorkspace?.context?.() || C.read()) !== C.key(event.data.ctx)) {
        following = true;
        try { C.set(event.data.ctx); } finally { following = false; }
      }
    }
  });
  window.addEventListener("gucc:creator-context-changed", event => {
    if (!following) send("gucc:embedded-tool-context", {ctx:event.detail});
  });
  const ready = () => {
    const mount = document.querySelector(".creator-shell, .shell") || document.body;
    if (typeof ResizeObserver === "function") new ResizeObserver(report).observe(mount);
    new MutationObserver(report).observe(document.body, {subtree:true, attributes:true, attributeFilter:["open"]});
    document.addEventListener("focusin", report);
    document.addEventListener("focusout", () => setTimeout(report, 0));
    window.addEventListener("resize", report, {passive:true});
    document.fonts?.ready?.then(report).catch(()=>{});
    send("gucc:embedded-tool-ready");
    report();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, {once:true});
  else ready();
})();
