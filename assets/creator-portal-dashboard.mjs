import {CONFIG} from "../apps/command-center/src/config.js";
import {getAccessToken,getSession} from "../apps/command-center/src/auth.js";
import {normalizeProjects,countsFor,nextTask,activeTasks,LABELS} from "./creator-portal-core.mjs?v=1";

const root=document.getElementById("creatorDashboard");
const API=CONFIG.SUPABASE_URL.replace(/\/+$/,"")+"/rest/v1/rpc/creator_os_portal_dashboard";
let epoch=0,items=[],selectedFilter="active";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=id=>"./apps/video-workspace/production-system/?project="+encodeURIComponent(id);
const filters=[["active","进行中"],["completed","已完成"],["archived","已归档"],["trash","回收站"],["all","全部"]];
function date(value){
  if(!value)return"";
  const d=new Date(value);
  return Number.isNaN(d.valueOf())?"":new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Tokyo",month:"2-digit",day:"2-digit"}).format(d);
}
function buttons(counts){
  return filters.map(([key,label])=>'<button type="button" data-cp-filter="'+key+'" class="'+(selectedFilter===key?"is-selected":"")+'">'+label+' '+(key==="all"?items.length:(counts[key]||0))+'</button>').join("");
}
function taskCard({project,task}){
  return '<a class="cp-task" href="'+url(project.projectId)+'">'+
  '<span class="cp-task-mark">✦</span><span class="cp-task-copy"><small>'+esc(project.name)+' · '+esc(task.label)+'</small>'+
  '<strong>'+esc(task.title)+'</strong><span>'+esc(task.reason)+'</span></span>'+
  '<span class="cp-task-go">打开 ↗</span></a>';
}
function projectCard(p){
  const progress=p.totalNodes?Math.round(p.doneNodes/p.totalNodes*100):0;
  const label=LABELS[p.lifecycle]||"待接入";
  const task=nextTask(p);
  const desc=p.lifecycle==="active"?(task?.title||"查看项目")
    :p.lifecycle==="completed"?"项目已标记完成"
    :p.lifecycle==="archived"?"长期归档 · 可恢复"
    :p.lifecycle==="trash"?"回收站 · 可恢复":"旧项目 · 等待接入 Creator OS";
  return '<a class="cp-project cp-'+esc(p.lifecycle)+'" href="'+url(p.projectId)+'">'+
    '<div class="cp-project-main"><div class="cp-project-top"><span class="cp-life">'+esc(label)+'</span>'+
    '<small>'+esc(p.game)+(p.version?" · "+esc(p.version):"")+'</small></div>'+
    '<strong>'+esc(p.name)+'</strong><span>'+esc(desc)+'</span></div>'+
    '<div class="cp-project-side"><span>'+(p.totalNodes?p.doneNodes+"/"+p.totalNodes+" 节点":"项目档案")+'</span>'+
    (p.totalNodes?'<div class="cp-progress"><i style="width:'+progress+'%"></i></div>':"")+
    '<small>更新 '+esc(date(p.updatedAt))+'</small></div><span class="cp-chevron">↗</span></a>';
}
function renderProjects(){
  const el=document.getElementById("cpProjectList");if(!el)return;
  const subset=selectedFilter==="all"?items:items.filter(p=>p.lifecycle===selectedFilter);
  const empty={
    active:"目前没有进行中的项目。可以新建视频，或从其他分类恢复。",
    completed:"暂无标记完成的项目。",archived:"暂无归档项目。",
    trash:"回收站为空。",all:"暂无项目。"
  };
  el.innerHTML=subset.length?subset.map(projectCard).join("")
    :'<div class="cp-empty">'+esc(empty[selectedFilter]||"暂无项目")+'</div>';
}
function render(){
  const counts=countsFor(items);
  const tasks=activeTasks(items);
  root.innerHTML=
    '<section class="cp-head"><div><p class="cp-overline">CREATOR / PORTFOLIO</p>'+
    '<h2>我的创作项目</h2><p class="cp-intro">按云端项目管理状态展示。完成、归档、回收站不会进入制作待办。</p></div>'+
    '<div class="cp-head-actions"><button id="cpRefresh" class="cp-refresh" type="button">↻ 刷新</button>'+
    '<a class="cp-launch" href="./apps/video-workspace/production-system/">进入创作中枢 ↗</a></div></section>'+
    '<section class="cp-counters" aria-label="项目管理状态">'+
    [["active","进行中"],["completed","已完成"],["archived","已归档"],["trash","回收站"]]
      .map(([key,label])=>'<button type="button" class="cp-counter" data-cp-filter="'+key+'"><strong>'+counts[key]+'</strong><span>'+label+'</span></button>').join("")+
    '</section>'+
    '<section class="cp-today"><div class="cp-section-top"><div><p class="cp-overline">NEXT / ACTION</p><h3>当前制作任务</h3></div>'+
    '<span class="cp-total">'+tasks.length+' 个进行中任务</span></div>'+
    '<div class="cp-task-list">'+(tasks.length?tasks.slice(0,3).map(taskCard).join(""):
      '<div class="cp-calm"><span class="cp-calm-icon">✓</span><span><strong>目前没有进行中的视频项目</strong>'+
      '<small>已完成和回收站项目已经从当前任务中排除。</small></span></div>')+'</div></section>'+
    '<section class="cp-library"><div class="cp-section-top"><div><p class="cp-overline">PROJECT / REGISTRY</p><h3>项目列表</h3></div>'+
    '<span class="cp-total">Supabase · '+items.length+' 个项目</span></div>'+
    '<div class="cp-filters" role="group" aria-label="项目类别">'+buttons(counts)+'</div>'+
    '<div id="cpProjectList" class="cp-projects"></div></section>';
  root.querySelector("#cpRefresh")?.addEventListener("click",()=>{void load();});
  root.querySelectorAll("[data-cp-filter]").forEach(button=>button.addEventListener("click",()=>{
    selectedFilter=button.dataset.cpFilter;
    root.querySelectorAll(".cp-filters button").forEach(b=>b.classList.toggle("is-selected",b.dataset.cpFilter===selectedFilter));
    renderProjects();
    root.querySelector(".cp-library")?.scrollIntoView?.({behavior:"smooth",block:"nearest"});
  }));
  renderProjects();
}
function login(){
  root.innerHTML='<div class="cp-connect"><p class="cp-overline">CREATOR / SIGN IN</p><h2>我的创作</h2>'+
    '<p>通过 GUCC 现有账户登录，读取你的 Creator OS 云端项目。</p>'+
    '<a class="cp-launch" href="./apps/command-center/">前往登录 ↗</a></div>';
}
function errorView(error){
  root.innerHTML='<div class="cp-connect cp-error"><p class="cp-overline">CLOUD / UNAVAILABLE</p>'+
    '<h2>暂时无法读取项目状态</h2><p>'+esc(error.message||"未知错误")+'</p>'+
    '<p>为避免误导，不会退回旧版 Production 待办。</p>'+
    '<button id="cpRetry" class="cp-refresh" type="button">重试</button></div>';
  root.querySelector("#cpRetry")?.addEventListener("click",()=>{void load();});
}
async function load(){
  if(!root)return;
  const run=++epoch,session=getSession();
  if(!session?.access_token&&!session?.refresh_token){login();return;}
  root.innerHTML='<div class="cp-loading">正在从 Supabase 核对项目状态…</div>';
  try{
    const token=await getAccessToken();
    const response=await fetch(API,{method:"POST",headers:{
      apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:"Bearer "+token,
      "Content-Type":"application/json"},body:"{}"});
    const result=await response.json().catch(()=>null);
    if(!response.ok)throw Error(result?.message||result?.error||"HTTP "+response.status);
    const fresh=normalizeProjects(result);
    if(run!==epoch)return;
    items=fresh;render();
  }catch(err){if(run===epoch)errorView(err);}
}
window.addEventListener("storage",e=>{
  if(["gameup_session_v5","gucc_creator_os_v2"].includes(e.key))void load();
});
window.addEventListener("focus",()=>{if(!document.hidden)void load();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void load();});
void load();
