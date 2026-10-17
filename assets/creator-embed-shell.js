/* Presentation-only embedding. The original Studio/Publisher logic and data stores remain unchanged. */
(() => {
  if (new URLSearchParams(location.search).get("embedded") !== "1") return;
  document.documentElement.classList.add("gucc-embedded-tool");
  const sendHeight = () => {
    const content = document.querySelector(".creator-shell, .shell");
    const height = Math.ceil((content?.getBoundingClientRect().height || document.body.scrollHeight) + 45);
    if (!Number.isFinite(height) || height < 200) return;
    window.parent?.postMessage({type:"gucc:embedded-tool-height",path:location.pathname,height},location.origin);
  };
  const ready=()=>{
    const mount=document.querySelector(".creator-shell, .shell")||document.body;
    if(typeof ResizeObserver==="function")new ResizeObserver(sendHeight).observe(mount);
    window.addEventListener("resize",sendHeight,{passive:true});
    document.fonts?.ready?.then(sendHeight).catch(()=>{});
    sendHeight();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();
})();
