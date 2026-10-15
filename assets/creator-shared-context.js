/* GUCC shared project/video context. Stores navigation preference only; never edits a project. */
(function(){
  "use strict";
  const KEY="gucc_creator_active_context_v1";
  const allowed=/^(?:[A-Za-z0-9][A-Za-z0-9._:-]{0,199})$/;
  const params=new URLSearchParams(location.search);
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");return {projectId:allowed.test(x.projectId||"")?x.projectId:"",videoId:allowed.test(x.videoId||"")?x.videoId:""};}catch{return {projectId:"",videoId:""};}}
  const prior=read();
  const projectId=allowed.test(params.get("project")||"")?params.get("project"):prior.projectId;
  const videoId=allowed.test(params.get("video")||"")?params.get("video"):((params.has("project")&&projectId!==prior.projectId)?"":prior.videoId);
  const current={projectId,videoId};
  function set(next){const value={projectId:allowed.test(next?.projectId||"")?next.projectId:"",videoId:allowed.test(next?.videoId||"")?next.videoId:""};if(!value.projectId)value.videoId="";localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new CustomEvent("gucc:creator-context-changed",{detail:value}));return value;}
  function url(path,override){const ctx=override||read();const u=new URL(path,location.href);if(ctx.projectId)u.searchParams.set("project",ctx.projectId);if(ctx.videoId)u.searchParams.set("video",ctx.videoId);return u.href;}
  window.GuccCreatorContext={read,set,url};
  if(projectId)set(current);
  document.addEventListener("click",function(e){const a=e.target.closest?.("a[href]");if(!a||a.origin!==location.origin)return;const dest=new URL(a.href);if(!/\\/(?:video-workspace|cover-generator|publishing-console)\\//.test(dest.pathname))return;const ctx=read();if(ctx.projectId&&!dest.searchParams.has("project"))dest.searchParams.set("project",ctx.projectId);if(ctx.videoId&&!dest.searchParams.has("video"))dest.searchParams.set("video",ctx.videoId);a.href=dest.href;},true);
})();
