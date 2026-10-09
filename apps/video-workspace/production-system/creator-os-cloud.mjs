// Creator OS lightweight cloud sync. Separate from canonical Creator Project API.
// Owner-only Supabase Auth + RLS; never uploads file bytes or directory handles.
import { CONFIG } from "../../command-center/src/config.js";
import { getSession, getAccessToken } from "../../command-center/src/auth.js";

const TABLE = "creator_os_workspace_snapshots";
const BASE_KEY = "gucc_creator_os_cloud_bases_v1";
const RENAME_KEY = "gucc_creator_os_pending_renames_v1";
const REST = CONFIG.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + TABLE;
const $ = (id) => document.getElementById(id);
const api = () => window.GuccCreatorOS;
let busy = false;
let ready = false;
let timer = 0;
let conflict = null;
let pending = false;
const remoteRows = new Map();

function safeProject(project) {
  // Device-specific folder scanning information is never part of the synced snapshot.
  const excluded = new Set(["localWorkspace","localFolderPath","workspaceTree","directoryHandle","folderHandle","absoluteLocalPath"]);
  return JSON.parse(JSON.stringify(project, (key,value) => excluded.has(key) ? undefined : value));
}
function canonical(project) { return JSON.stringify(safeProject(project)); }
function bases() { try {return JSON.parse(localStorage.getItem(BASE_KEY) || "{}");} catch {return {};} }
function baseFor(id) { return bases()[id] || null; }
function renames(){try{return JSON.parse(localStorage.getItem(RENAME_KEY)||"{}");}catch{return {};}}
function recordRename(from,to,fromStatus){
  // Includes legacy draft IDs (e.g. GAME-CURRENT-long-idea); only explicit DRAFT->canonical transitions are eligible.
  if(fromStatus!=="DRAFT"||!from||!to||from===to)return;
  const items=renames();items[from]=to;
  localStorage.setItem(RENAME_KEY,JSON.stringify(items));
}
async function cleanRenames(onlyTarget=""){
  const items=renames();
  for(const [from,to] of Object.entries(items)){
    if(onlyTarget&&to!==onlyTarget)continue;
    // Never delete a draft until the canonical replacement has an authenticated cloud row.
    const replacement=await readRow(to);
    if(!replacement||replacement.project_data?.projectId!==to)continue;
    const prior=await readRow(from);
    if(prior){
      const user=sessionUser();
      const query="?owner_user_id=eq."+encodeURIComponent(user)+"&project_id=eq."+encodeURIComponent(from)+"&revision=eq."+prior.revision;
      const deleted=await request("DELETE",query);
      if(!deleted?.length)continue; // concurrent update: protect the remote edit
      remoteRows.delete(from);
    }
    const map=bases();delete map[from];localStorage.setItem(BASE_KEY,JSON.stringify(map));
    delete items[from];localStorage.setItem(RENAME_KEY,JSON.stringify(items));
  }
}
function remember(id, revision, project) {
  const all=bases();
  all[id]={revision,project:safeProject(project)};
  localStorage.setItem(BASE_KEY,JSON.stringify(all));
}
function status(text,mode="idle") {
  const el=$("cloudSyncStatus");
  if (el) {el.textContent=text;el.dataset.state=mode;}
  const heading=$("workspaceCloudLabel");
  if (heading) heading.textContent=mode==="ok"?"CLOUD SYNC":mode==="busy"?"SYNCING":mode==="conflict"?"CONFLICT":"LOCAL MODE";
  const note=$("workspaceCloudNote");
  if (note) note.textContent=mode==="ok"?"已登录 · 项目资料同步，媒体留本地":mode==="busy"?"正在核对项目版本":mode==="conflict"?"两端有不同编辑 · 请手动处理":text;
}
function sessionUser() {
  const session=getSession();
  return session?.user?.id || null;
}
async function request(method,query="",body=null) {
  const token=await getAccessToken();
  const result=await fetch(REST+query,{
    method,
    headers:{
      apikey:CONFIG.SUPABASE_ANON_KEY,
      Authorization:"Bearer "+token,
      "Content-Type":"application/json",
      Prefer:method==="GET"?"return=representation":"return=representation"
    },
    ...(body===null?{}:{body:JSON.stringify(body)})
  });
  const data=await result.json().catch(()=>null);
  if (!result.ok) throw new Error(data?.message||data?.error||"Supabase HTTP "+result.status);
  return data;
}
async function listRows(){
  const user=sessionUser(); if(!user) throw new Error("请先在 GUCC 登录你的 Supabase 账户");
  const query="?select=project_id,project_data,revision,updated_at&owner_user_id=eq."+encodeURIComponent(user)+"&order=updated_at.desc&limit=500";
  return await request("GET",query);
}
async function readRow(id){
  const user=sessionUser();
  const rows=await request("GET","?select=project_id,project_data,revision,updated_at&owner_user_id=eq."+encodeURIComponent(user)+"&project_id=eq."+encodeURIComponent(id)+"&limit=1");
  return rows?.[0]||null;
}
async function send(project,expectedRevision=null) {
  const id=project.projectId,user=sessionUser();
  if(!user) throw new Error("未登录");
  const body={owner_user_id:user,project_id:id,project_data:safeProject(project)};
  if(expectedRevision===null) {
    const rows=await request("POST","",[ {...body,revision:1} ]);
    if(!rows?.length) throw new Error("创建云端项目失败");
    return rows[0];
  }
  body.revision=expectedRevision+1;
  body.updated_at=new Date().toISOString();
  const rows=await request("PATCH","?owner_user_id=eq."+encodeURIComponent(user)+"&project_id=eq."+encodeURIComponent(id)+"&revision=eq."+expectedRevision,body);
  if(!rows?.length) throw new Error("云端版本已变化，需要处理同步冲突");
  return rows[0];
}
function isRealProject(p){return Boolean(p?.projectId&&p.status!=="TEST_FIXTURE");}
function setConflict(id,local,remote) {
  conflict={id,local:safeProject(local),remote};
  status("项目 "+id+" 在两端均有修改","conflict");
  const dlg=$("cloudConflictDialog");
  if(dlg&&!dlg.open){
    $("cloudConflictProject").textContent=local.name||id;
    $("cloudConflictInfo").textContent="本机与云端都存在不同的项目数据。为保护脚本与任务进度，不会自动覆盖任意一端。";
    dlg.showModal();
  }
}
function applyRemote(row) {
  if(!row?.project_data||row.project_id!==row.project_data.projectId)throw new Error("云端项目 ID 不一致");
  api()?.putProject(row.project_data,{fromCloud:true});
  remoteRows.set(row.project_id,row);
  remember(row.project_id,row.revision,row.project_data);
}
function localById(id){return api()?.projects()?.find(p=>p.projectId===id)||null;}
async function pushOne(id,forceRevision=null) {
  if(busy||!ready||conflict) {pending=true;return;}
  const p=localById(id);
  if(!isRealProject(p))return;
  busy=true;
  status("正在保存："+(p.name||id),"busy");
  try {
    const expected=forceRevision??baseFor(id)?.revision??null;
    const result=await send(p,expected);
    remoteRows.set(id,result);
    const latest=localById(id);
    // Do not mark a newer in-flight local edit as synced.
    if(latest&&canonical(latest)===canonical(p)) remember(id,result.revision,p);
    else {remember(id,result.revision,p);pending=true;}
    await cleanRenames(id);
    status("云端已同步","ok");
  }catch(err){
    const remote=await readRow(id).catch(()=>null);
    if(remote){remoteRows.set(id,remote);setConflict(id,p,remote);}
    else status("云同步失败："+(err.message||"网络错误"),"error");
  }finally{
    busy=false;
    if(pending&&!conflict){pending=false;schedule();}
  }
}
function schedule() {
  if(!ready||conflict||!sessionUser())return;
  clearTimeout(timer);
  timer=setTimeout(()=>{void flush();},700);
}
async function flush(){
  if(!ready||conflict||busy)return;
  for(const p of api()?.projects()||[]){
    if(!isRealProject(p))continue;
    const b=baseFor(p.projectId);
    if(b&&canonical(p)===canonical(b.project))continue;
    if(!b&&remoteRows.has(p.projectId)){setConflict(p.projectId,p,remoteRows.get(p.projectId));return;}
    await pushOne(p.projectId);
    if(conflict)return;
  }
}
async function refresh(){
  if(busy)return;
  const owner=sessionUser();
  if(!owner){status("未登录 · 项目只保存在本浏览器","idle");ready=false;return;}
  busy=true;
  status("正在读取 Supabase 项目快照","busy");
  try{
    const rows=await listRows();
    const currentIds=new Set();
    for(const row of rows||[]) {
      if(!row.project_data||row.project_data.projectId!==row.project_id)continue;
      currentIds.add(row.project_id);
      remoteRows.set(row.project_id,row);
      // A renamed draft is superseded by its canonical ID; do not resurrect it during reconciliation.
      if(renames()[row.project_id])continue;
      const local=localById(row.project_id);
      if(!local){applyRemote(row);continue;}
      const b=baseFor(row.project_id);
      if(canonical(local)===canonical(row.project_data)){remember(row.project_id,row.revision,local);continue;}
      if(b&&canonical(local)===canonical(b.project)){applyRemote(row);continue;}
      if(b&&canonical(row.project_data)===canonical(b.project))continue;
      // If local and remote differ without common base, refuse implicit overwrite.
      setConflict(row.project_id,local,row);break;
    }
    if(!conflict){
      // A locally tracked cloud project missing remotely is kept locally;
      // do not silently recreate a deleted remote record.
      const missing=(api()?.projects()||[]).find(p=>isRealProject(p)&&baseFor(p.projectId)&&!currentIds.has(p.projectId));
      if(missing)status("发现云端缺失的旧项目，请导出本地备份后确认","error");
      else status("已连接 Supabase · 项目可跨设备同步","ok");
    }
    ready=true;
    if(!conflict)await cleanRenames();
  }catch(err){status("云端不可用 · 本地可继续："+(err.message||"连接失败"),"error");ready=false;}
  finally{busy=false;}
  if(ready&&!conflict)schedule();
}
async function resolve(choice){
  const c=conflict,dlg=$("cloudConflictDialog");
  if(!c){dlg?.close();return;}
  if(choice==="later"){dlg?.close();return;}
  if(busy)return;
  busy=true;
  try{
    const latest=await readRow(c.id);
    if(!latest||latest.revision!==c.remote.revision){conflict=null;dlg?.close();status("云端又有更新，重新核对","busy");busy=false;await refresh();return;}
    if(choice==="remote"){
      applyRemote(latest);
    }else if(choice==="local"){
      const actual=localById(c.id);
      if(!actual||canonical(actual)!==canonical(c.local))throw new Error("本地项目已经变化，请重新同步");
      const row=await send(actual,latest.revision);
      remoteRows.set(c.id,row);remember(c.id,row.revision,actual);
    }
    conflict=null;dlg?.close();status("冲突已处理 · 最新数据已保存","ok");
  }catch(err){status("冲突处理失败："+(err.message||"请重试"),"error");}
  finally{busy=false;}
  if(!conflict)schedule();
}

$("cloudSyncNow")?.addEventListener("click",()=>{void refresh();});
$("cloudConflictDialog")?.querySelectorAll("[data-cloud-choice]").forEach(el=>{
  el.addEventListener("click",()=>{void resolve(el.dataset.cloudChoice);});
});
$("cloudConflictDialog")?.addEventListener("cancel",e=>{e.preventDefault();void resolve("later");});
window.addEventListener("gucc:creator-os:renamed",e=>recordRename(e.detail?.from,e.detail?.to,e.detail?.fromStatus));
window.addEventListener("gucc:creator-os:saved",schedule);
window.addEventListener("online",()=>{void refresh();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh();});
void refresh();
