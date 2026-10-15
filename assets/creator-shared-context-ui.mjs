import {CONFIG} from "../apps/command-center/src/config.js";
import {getAccessToken,getSession} from "../apps/command-center/src/auth.js";
const C=window.GuccCreatorContext;
const API=CONFIG.SUPABASE_URL.replace(/\/+$/,"")+"/rest/v1/";
const pages={
 studio:new URL("../apps/video-workspace/legacy-prompt-studio-v6.html",import.meta.url).href,
 creator:new URL("../apps/video-workspace/production-system/",import.meta.url).href,
 cover:new URL("../apps/cover-generator/",import.meta.url).href,
 publish:new URL("../apps/publishing-console/",import.meta.url).href
};
function href(kind,ctx){return C.url(pages[kind],ctx);}
async function request(path,{method="GET",body}={}){
 const token=await getAccessToken();
 const res=await fetch(API+path,{method,headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:"Bearer "+token, ...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error(data?.message||data?.error||"GUCC 云端访问失败："+res.status);
 return data;
}
const nav=document.createElement("section");nav.id="guccCreatorContextBar";nav.className="gucc-creator-context";
nav.setAttribute("aria-label","统一创作项目与视频");
const heading=document.createElement("div");heading.className="gcc-head";
const title=document.createElement("strong");title.textContent="当前创作项目";
const status=document.createElement("small");status.textContent="正在核对云端项目…";
heading.append(title,status);
const projectLabel=document.createElement("label");projectLabel.textContent="项目";
const project=document.createElement("select");project.setAttribute("aria-label","选择 GUCC 项目");
projectLabel.append(project);
const videoLabel=document.createElement("label");videoLabel.textContent="视频";
const video=document.createElement("select");video.setAttribute("aria-label","选择项目中的视频");
videoLabel.append(video);
const apply=document.createElement("button");apply.type="button";apply.textContent="在此工具使用";apply.disabled=true;
const links=document.createElement("div");links.className="gcc-links";
for(const [name,label] of Object.entries({studio:"文案 / 字幕",creator:"项目档案",cover:"封面设计",publish:"发布包"})){const a=document.createElement("a");a.dataset.kind=name;a.textContent=label;a.href=href(name,C.read());links.append(a);}
nav.append(heading,projectLabel,videoLabel,apply,links);
document.body.insertBefore(nav,document.body.firstChild);
const sheet=document.createElement("style");sheet.textContent=`
.gucc-creator-context{position:relative;z-index:12;display:flex;align-items:center;flex-wrap:wrap;gap:10px;background:#101c24;border:1px solid #35534e;border-left:3px solid #9edfc9;color:#e7f8f3;border-radius:8px;padding:10px 14px;margin:10px auto 14px;max-width:min(96%,1680px);font:13px/1.5 system-ui,"Noto Sans SC",sans-serif;box-shadow:0 5px 22px #0002}
.gucc-creator-context .gcc-head{display:grid;gap:1px;min-width:135px}.gcc-head strong{font-size:13px}.gcc-head small{font-size:11px;color:#a5bdb8}
.gucc-creator-context label{display:flex;gap:6px;align-items:center;margin:0;font-size:12px;color:#abc1bb;flex:0 1 270px;min-width:140px}
.gucc-creator-context select{min-width:0;width:100%;background:#0c1d25;color:#e4f5ee;border:1px solid #42635f;border-radius:5px;min-height:39px;padding:7px;font:inherit}
.gucc-creator-context button{min-height:39px;border:1px solid #7bbbaa;background:#234c43;color:#e5fff8;border-radius:6px;padding:6px 11px;cursor:pointer;font:inherit}
.gucc-creator-context button:disabled{opacity:.55;cursor:default}
.gcc-links{display:flex;gap:10px;flex-wrap:wrap}.gcc-links a{color:#b5dcd6;text-decoration:underline;text-underline-offset:3px;font-size:12px}
@media(max-width:700px){.gucc-creator-context{margin:8px 10px;gap:8px}.gcc-head{flex-basis:100%}.gucc-creator-context label{flex:1 1 130px}.gcc-links{flex-basis:100%}}
`;document.head.append(sheet);
let projects=[],selectedSnapshot=null,busy=false;
const option=(value,label)=>{const x=document.createElement("option");x.value=value;x.textContent=label;return x;};
function refreshLinks(ctx){for(const a of links.querySelectorAll("a"))a.href=href(a.dataset.kind,ctx);}
function showStatus(message){status.textContent=message;status.title=message;}
function projectRow(){return projects.find(p=>p.projectId===project.value);}
function setVideoOptions(snapshot,requested){
 video.replaceChildren(option("","项目级（未选择视频）"));
 const official=C.videosFor(snapshot),known=new Set(official.map(v=>v.videoId)),legacy=C.legacyBranches(snapshot).filter(v=>!known.has(v));
 for(const v of official)video.append(option(v.videoId,v.name));
 for(const b of legacy)video.append(option(b,b+" · 旧任务分支（待确认）"));
 video.value=Array.from(video.options).some(o=>o.value===requested)?requested:"";
 video.dataset.inferred=JSON.stringify(legacy);
}
async function selectProject(id,requested=""){
 selectedSnapshot=null;video.replaceChildren(option("","正在读取视频…"));apply.disabled=true;
 if(!id){setVideoOptions(null,"");apply.disabled=false;showStatus("未关联项目 · 草稿只保存在本浏览器");return;}
 try{
  const rows=await request("creator_os_workspace_snapshots?select=project_id,project_data&project_id=eq."+encodeURIComponent(id)+"&limit=1");
  if(project.value!==id)return;selectedSnapshot=Array.isArray(rows)?rows[0]?.project_data:null;
  setVideoOptions(selectedSnapshot,requested);
  showStatus(selectedSnapshot?"已核对项目与视频":"项目已核对 · 无新版工作台记录");
  apply.disabled=false;
 }catch(error){if(project.value!==id)return;setVideoOptions(null,"");showStatus("视频信息暂不可读取："+error.message);apply.disabled=false;}
}
project.addEventListener("change",()=>{void selectProject(project.value);});
video.addEventListener("change",()=>{apply.disabled=false;});
apply.addEventListener("click",async()=>{
 if(busy)return;const row=projectRow();if(!row&&project.value){showStatus("请先选择有效的云端项目");return;}
 const ctx=C.clean({projectId:row?.projectId||"",videoId:video.value});
 const inferred=JSON.parse(video.dataset.inferred||"[]").includes(ctx.videoId);
 if(inferred&&!confirm("此视频仅从旧工作节点的分支名称识别，正式视频身份仍待核对。确定只将它用于本浏览器的创作关联吗？"))return;
 busy=true;apply.disabled=true;
 try{
  const adapter=window.GuccCreatorWorkspaceAdapter;
  if(adapter&&typeof adapter.applyContext==="function"){
   const ok=await adapter.applyContext({ctx,project:row||null,video:selectedSnapshot?.videos?.find(v=>v.videoId===ctx.videoId)||null,inferred});
   if(ok===false){showStatus("工具拒绝了切换；原草稿未被覆盖");return;}
  }
  C.set(ctx);refreshLinks(ctx);showStatus(ctx.projectId?"已关联 "+row.name+(ctx.videoId?" · "+ctx.videoId:"")+" · 成果仍需独立核验":"已恢复本浏览器独立草稿");
 }catch(err){showStatus("切换未完成："+err.message);}
 finally{busy=false;apply.disabled=false;}
});
async function load(){
 const session=getSession();
 if(!session?.access_token&&!session?.refresh_token){showStatus("请先在 GUCC DB 登录；本机草稿保留");project.replaceChildren(option("","尚未登录"));video.replaceChildren(option("","—"));return;}
 try{
  const rows=await request("rpc/creator_os_portal_dashboard",{method:"POST",body:{}});
  if(!Array.isArray(rows))throw Error("项目列表格式不正确");
  projects=rows.filter(r=>r&&typeof r.projectId==="string"&&r.lifecycle!=="trash");
  project.replaceChildren(option("","本浏览器独立草稿 · 不关联项目"));
  for(const r of projects)project.append(option(r.projectId,(r.lifecycle==="completed"?"[已完成] ":r.lifecycle==="archived"?"[归档] ":"")+r.name));
  const desired=C.candidate(location.search),saved=C.read();
  const value=(desired.projectId&&projects.some(p=>p.projectId===desired.projectId)?desired.projectId:projects.some(p=>p.projectId===saved.projectId)?saved.projectId:"");
  project.value=value;
  if(value)await selectProject(value,desired.projectId===value?desired.videoId:saved.videoId);
  else{setVideoOptions(null,"");apply.disabled=false;showStatus(projects.length+" 个云端项目 · 可选择关联或继续使用本机草稿");}
  refreshLinks(C.read());
 }catch(error){showStatus("暂不能读取云端项目："+error.message);project.replaceChildren(option("","云端暂不可用"));}
}
window.GuccCreatorContextUI={reload:load,selected:()=>({projectId:project.value,videoId:video.value})};
let refreshTimer=0;window.addEventListener("gucc:creator-os:saved",()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(document.visibilityState==="visible")void load();},1800);});
void load();
