import {CONFIG} from "../apps/command-center/src/config.js";
import {getSession,getAccessToken} from "../apps/command-center/src/auth.js";

/* ProjectRoot -> Video -> six Deliverable records. Metadata only: no binary upload. */
const ROOT=new URL("../",import.meta.url);
const ITEM_KEYS=["script","subtitle","visual","sound","cover","publish"];
const LABELS=["文案","字幕","视觉素材","BGM/音效","封面","六平台发布"];
const STATES={not_started:"未开始",in_progress:"制作中",review:"待审核",confirmed:"已确认",blocked:"待处理"};
const RECENT_KEY="gucc_unified_creative_selection_v1";
const q=new URLSearchParams(location.search);
const pathname=location.pathname;
const tool=pathname.includes("legacy-prompt-studio")?"studio":pathname.includes("cover-generator")?"cover":pathname.includes("publishing-console")?"publish":"creator";
const links=[["创作中枢","apps/video-workspace/production-system/"],["六项 Studio","apps/video-workspace/legacy-prompt-studio-v6.html"],["封面","apps/cover-generator/"],["发布","apps/publishing-console/"]];
let projects=[],videos=[],records=[],project=null,video=null,rootBar=null,statusEl,projectSelect,videoSelect,actions,dialog,unmounted=false;
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
const alertText=(text,bad=false)=>{if(statusEl){statusEl.textContent=text;statusEl.dataset.alert=bad?"true":"false";}};
const selected=()=>({projectId:project?.project_id||"",videoId:video?.video_id||"",projectName:project?.name||"",videoTitle:video?.title||""});
function remembered(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||"{}")}catch{return {}}}
function pathTo(p){return new URL(p,ROOT).pathname}
function queryTo(p,pr=project?.project_id||"",vid=video?.video_id||""){const u=new URL(p,ROOT);if(pr)u.searchParams.set("project",pr);if(vid)u.searchParams.set("video",vid);return u.href}
function go(pr,vid){const u=new URL(location.href);if(pr)u.searchParams.set("project",pr);else u.searchParams.delete("project");if(vid)u.searchParams.set("video",vid);else u.searchParams.delete("video");location.href=u.href;}
async function request(route,{method="GET",data,returnRows=false}={}){
 const access=await getAccessToken();
 const response=await fetch(CONFIG.SUPABASE_URL.replace(/\/+$/,"")+"/rest/v1/"+route,{method,cache:"no-store",
  headers:{"apikey":CONFIG.SUPABASE_ANON_KEY,"Authorization":"Bearer "+access,"Content-Type":"application/json",...(returnRows?{"Prefer":"return=representation"}:{})},
  body:data==null?undefined:JSON.stringify(data)});
 let body=await response.json().catch(()=>null);
 if(!response.ok)throw Error(body?.message||body?.details||"云端错误 "+response.status);
 return body;
}
async function listProjects(){return request("creator_projects?select=project_id,name,game,topic,current_state,updated_at&order=updated_at.desc&limit=200");}
async function listVideos(id){return request("creator_video_workspaces?select=project_id,video_id,title,updated_at&project_id=eq."+encodeURIComponent(id)+"&order=updated_at.desc&limit=200");}
async function listRecords(id,vid){return request("creator_deliverable_records?select=project_id,video_id,deliverable_key,status,evidence,review_note,revision,reviewed_at&project_id=eq."+encodeURIComponent(id)+"&video_id=eq."+encodeURIComponent(vid));}
function bindOption(select,items,placeholder,getValue,getLabel){
 select.replaceChildren();const empty=node("option","",placeholder);empty.value="";select.append(empty);
 for(const item of items){const opt=node("option","",getLabel(item));opt.value=getValue(item);select.append(opt);}
}
function emitSelected(){
 const context={...selected(),game:project?.game||"",topic:project?.topic||""};
 window.GuccUnifiedWorkspace={selection:()=>({...selected()}),refresh:refreshRecords,openRecord};
 window.dispatchEvent(new CustomEvent("gucc:creative:selection",{detail:context}));
}
async function hydrateVideo(prefer="",skipRedirect=false){
 videos=project?await listVideos(project.project_id):[];
 bindOption(videoSelect,videos,"选择视频 · 无记录可新建",x=>x.video_id,x=>x.title);
 let memory=remembered(),id=prefer||q.get("video")||(memory.projectId===project?.project_id?memory.videoId:"");
 video=videos.find(v=>v.video_id===id)||null;
 if(!video&&videos.length===1)video=videos[0]; // Single explicit video identity, no destructive inference.
 videoSelect.value=video?.video_id||"";
 if(!skipRedirect&&video&&(!q.get("project")||!q.get("video"))){go(project.project_id,video.video_id);return;}
 await refreshRecords();
}
async function refreshRecords(){
 records=project&&video?await listRecords(project.project_id,video.video_id):[];
 renderStatuses();
 rememberSelection();
 emitSelected();
}
function rememberSelection(){
 if(!project)return;
 localStorage.setItem(RECENT_KEY,JSON.stringify({projectId:project.project_id,videoId:video?.video_id||""}));
}
function activeOutcome(){
 if(tool==="studio")return window.CreatorStudio?.getState?.()?.simpleTask||"script";
 if(tool==="cover")return "cover";
 if(tool==="publish")return "publish";
 const store=JSON.parse(localStorage.getItem("gucc_creator_os_v2")||"{}");
 const current=store.projects?.find(x=>x.projectId===project?.project_id);
 const node=current?.promptFlow?.find(x=>x.status==="READY"||x.status==="IN_PROGRESS");
 return node?.sixOutcomeId||"script";
}
function renderStatuses(){
 actions.replaceChildren();
 for(let i=0;i<ITEM_KEYS.length;i++){
  const key=ITEM_KEYS[i],record=records.find(x=>x.deliverable_key===key);
  const b=node("button","",""+(i+1)+" "+LABELS[i]+" · "+STATES[record?.status||"not_started"]);
  b.type="button";b.dataset.state=record?.status||"not_started";b.disabled=!video;
  b.title="查看/登记 "+LABELS[i]+" 的正式记录";
  b.addEventListener("click",()=>openRecord(key));
  actions.append(b);
 }
}
async function createVideo(){
 if(!project)return alertText("请先选择项目",true);
 const title=window.prompt("请输入视频名称，例如：菲欧妮解析");
 if(title===null)return;
 const name=title.trim();if(!name||name.length>240){alertText("视频名称必须是 1–240 字",true);return;}
 const id="VID-"+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)).slice(0,36);
 try{
  await request("creator_video_workspaces",{method:"POST",data:{project_id:project.project_id,video_id:id,title:name},returnRows:true});
  alertText("已在项目下创建独立视频，不影响已有旧项目资料。");
  go(project.project_id,id);
 }catch(e){alertText("创建失败："+e.message,true);}
}
function makeDialog(){
 dialog=node("dialog","gucc-u-dialog");
 dialog.innerHTML='<form method="dialog" id="guccUForm"><h3 id="guccUTitle"></h3><p style="font-size:12px;color:#a9bcbc">这是项目成果登记，AI 回执不代表真实文件已经核验。选择“已确认”时需要本机实际文件与人工质量检查。</p><label>登记状态<select id="guccUStatus"><option value="in_progress">制作中</option><option value="review">待审核</option><option value="blocked">待处理</option><option value="confirmed">已确认（需要实物文件）</option></select></label><label>成果说明 / 来源<textarea id="guccUNote" rows="3" maxlength="2000" placeholder="例如：文案 FINAL.md；正式文件仍在本机"></textarea></label><label>选择需要确认的实际本地文件<input id="guccUFile" type="file"></label><label id="guccUCheckRow" style="display:flex;align-items:center"><input id="guccUChecked" type="checkbox" style="width:auto">我实际检查过文件内容，确认对应这个视频、这一项成果</label><div class="actions"><button type="button" id="guccUCancel">取消</button><button type="submit">保存记录</button></div></form>';
 document.body.append(dialog);
 dialog.querySelector("#guccUCancel").addEventListener("click",()=>dialog.close());
}
function openRecord(key){
 if(!video||!project){alertText("请先选择项目和视频",true);return;}
 let row=records.find(x=>x.deliverable_key===key);
 const index=ITEM_KEYS.indexOf(key);
 dialog.querySelector("#guccUTitle").textContent="登记成果 · "+LABELS[index];
 dialog.querySelector("#guccUStatus").value=row?.status==="not_started"?"in_progress":row?.status||"in_progress";
 dialog.querySelector("#guccUNote").value=row?.review_note||"";
 dialog.querySelector("#guccUFile").value="";
 dialog.querySelector("#guccUChecked").checked=false;
 const form=dialog.querySelector("form");
 form.onsubmit=async(event)=>{
  event.preventDefault();const status=dialog.querySelector("#guccUStatus").value,note=dialog.querySelector("#guccUNote").value;
  const file=dialog.querySelector("#guccUFile").files[0];
  if(status==="confirmed"&&(!file||file.size<=0||!dialog.querySelector("#guccUChecked").checked)){alertText("已确认必须选择实际文件，并勾选人工质量核验",true);return;}
  let evidence=status==="confirmed"?{fileName:file.name,sizeBytes:file.size,lastModified:file.lastModified,humanConfirmed:true,observation:"本次浏览器文件选择及人工审核；未上传二进制"}:
    (row?.evidence||{});
  if(status!=="confirmed"){delete evidence.humanConfirmed;delete evidence.fileName;delete evidence.sizeBytes;}
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  try{
   await request("rpc/creator_workspace_save_deliverable",{method:"POST",data:{p_project_id:project.project_id,p_video_id:video.video_id,p_key:key,p_status:status,p_evidence:evidence,p_note:note,p_expected_revision:row?.revision||0}});
   dialog.close();await refreshRecords();alertText("云端已保存 · "+LABELS[index]+" · "+STATES[status]);
  }catch(e){alertText("未保存："+e.message+"；请刷新后核对冲突",true);}
  finally{submit.disabled=false;}
 };
 dialog.showModal();
}
async function markStarted(key){
 if(!project||!video||!ITEM_KEYS.includes(key))return;
 const old=records.find(x=>x.deliverable_key===key);
 if(old&&old.status!=="not_started")return;
 try{await request("rpc/creator_workspace_save_deliverable",{method:"POST",data:{
  p_project_id:project.project_id,p_video_id:video.video_id,p_key:key,p_status:"in_progress",
  p_evidence:{source:tool,observed:"在工具中开始编辑/复制任务，无最终文件证明"},p_note:"当前工具已开始制作",p_expected_revision:old?.revision||0}});
  await refreshRecords();
 }catch(e){alertText("制作进度未同步："+e.message,true);}
}
function assembleBar(){
 rootBar=node("section","gucc-unified-bar");
 rootBar.setAttribute("aria-label","GUCC 统一创作项目");
 const line=node("div","gucc-unified-line");
 line.append(node("span","gucc-unified-brand","GUCC / CREATIVE WORKSPACE"));
 function field(title){const label=node("label","");label.append(node("span","",title));const select=node("select");label.append(select);line.append(label);return select;}
 projectSelect=field("项目");videoSelect=field("视频");
 const add=node("button","","＋ 新视频");add.type="button";add.addEventListener("click",()=>void createVideo());line.append(add);
 const center=node("a","","项目中心 ↗");center.href=queryTo("apps/video-workspace/production-system/");line.append(center);
 const current=node("span","gucc-u-current","同一项目 · 六项成果");line.append(current);
 rootBar.append(line);
 const tools=node("nav","gucc-u-tools");tools.setAttribute("aria-label","创作工具");
 for(const [title,path] of links){const a=node("a","",title);a.href=queryTo(path);if(location.pathname===pathTo(path))a.classList.add("is-active");tools.append(a);}
 rootBar.append(tools);
 actions=node("div","gucc-u-deliverables");actions.setAttribute("aria-label","六项成果进度");rootBar.append(actions);
 statusEl=node("p","gucc-u-message","正在读取项目…");statusEl.setAttribute("role","status");rootBar.append(statusEl);
 document.body.insertBefore(rootBar,document.body.firstChild);
 makeDialog();
 projectSelect.addEventListener("change",()=>go(projectSelect.value,""));
 videoSelect.addEventListener("change",()=>go(project?.project_id,videoSelect.value));
}
async function start(){
 if(!document.body||unmounted)return;
 assembleBar();
 if(!getSession()){alertText("请先在 GUCC 登录以读取正式项目；原工具仍可单独使用。");return;}
 try{
  projects=await listProjects();
  bindOption(projectSelect,projects,"选择现有项目",p=>p.project_id,p=>(p.name||p.project_id)+(p.current_state==="IDEA"?"":""));
  let mem=remembered(),oldId="";
  try{oldId=JSON.parse(localStorage.getItem("gucc_creator_os_v2")||"{}")?.selectedProjectId||""}catch{}
  let id=q.get("project")||mem.projectId||oldId;
  project=projects.find(p=>p.project_id===id)||null;
  if(!project&&projects.length===1)project=projects[0];
  projectSelect.value=project?.project_id||"";
  if(!project){alertText(projects.length?"请选择项目；新项目请先到创作中枢创建。":"尚无正式项目，请先到创作中枢创建。");renderStatuses();return;}
  await hydrateVideo();
  alertText(video?"云端已连接 · 项目/视频身份稳定；六项成果独立保存。":"项目已连接，请新建或选择该项目下的实际视频（旧项目不会自动误匹配）。");
  rootBar.querySelector('a[href]')?.setAttribute("href",queryTo("apps/video-workspace/production-system/"));
  for(const [i,a] of [...rootBar.querySelectorAll(".gucc-u-tools a")].entries())a.href=queryTo(links[i][1]);
 }catch(e){alertText("项目云端不可用："+e.message+"。本页面原有草稿未修改。",true);}
 window.addEventListener("gucc:creative:artifact-draft",event=>{if(event.detail?.key)void markStarted(event.detail.key);});
 window.addEventListener("gucc:creative:prompt-copied",()=>{if(tool==="studio")void markStarted(activeOutcome());});
 window.addEventListener("gucc-publish-draft-saved",()=>{if(tool==="publish")void markStarted("publish");});
 window.addEventListener("gucc:creative:project-changed",async(event)=>{
   const other=projects.find(x=>x.project_id===event.detail?.projectId);
   if(!other||other.project_id===project?.project_id)return;
   project=other;projectSelect.value=other.project_id;video=null;
   const url=new URL(location.href);url.searchParams.set("project",other.project_id);url.searchParams.delete("video");history.replaceState(null,"",url.href);
   try{await hydrateVideo("",true);if(video){url.searchParams.set("video",video.video_id);history.replaceState(null,"",url.href);}alertText("已切换为同一项目的统一身份。");}
   catch(e){alertText("视频身份暂不可用："+e.message,true);}
 });
 
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{void start();},{once:true});else void start();
