/* Shared navigation preference only. Identity comes from authenticated GUCC project listing. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.GuccCreatorContext=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const KEY="gucc_creator_active_context_v1";
 function valid(v){return typeof v==="string"&&v.length>0&&v.length<=240&&!/[\u0000-\u001f\u007f/?#&<>]/.test(v);}
 function clean(value){return {projectId:valid(value?.projectId)?value.projectId:"",videoId:valid(value?.videoId)?value.videoId:""};}
 function read(){try{return clean(JSON.parse(localStorage.getItem(KEY)||"{}"));}catch{return clean({});}}
 function set(next){const ctx=clean(next);if(!ctx.projectId)ctx.videoId="";localStorage.setItem(KEY,JSON.stringify(ctx));if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("gucc:creator-context-changed",{detail:ctx}));return ctx;}
 function candidate(search){const p=new URLSearchParams(search||"");return clean({projectId:p.get("project"),videoId:p.get("video")});}
 function key(ctx){return JSON.stringify([ctx?.projectId||"",ctx?.videoId||""]);}
 function url(path,ctx){const base=typeof location==="undefined"?"https://gucc.invalid/":location.href;const u=new URL(path,base),v=clean(ctx||read());if(v.projectId)u.searchParams.set("project",v.projectId);else u.searchParams.delete("project");if(v.projectId&&v.videoId)u.searchParams.set("video",v.videoId);else u.searchParams.delete("video");return u.href;}
 function videosFor(snapshot){
  const videos=Array.isArray(snapshot?.videos)?snapshot.videos:[];
  const seen=new Set();return videos.map(v=>({videoId:String(v?.videoId||""),name:String(v?.name||v?.title||v?.videoId||"")}))
   .filter(v=>valid(v.videoId)&&!seen.has(v.videoId)&&seen.add(v.videoId));
 }
 // Legacy branch identifiers are suggestions; never silently persist them as confirmed videos.
 function legacyBranches(snapshot){
  const seen=new Set();return (Array.isArray(snapshot?.promptFlow)?snapshot.promptFlow:[])
   .map(n=>String(n?.branch||"")).filter(b=>valid(b)&&b!=="SHARED"&&!seen.has(b)&&seen.add(b));
 }
 return {KEY,valid,clean,read,set,candidate,key,url,videosFor,legacyBranches};
});
