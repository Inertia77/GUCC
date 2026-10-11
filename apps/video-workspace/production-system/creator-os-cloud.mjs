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
  return window.GuccCreatorStorage.packProject(JSON.parse(JSON.stringify(project, (key,value) => excluded.has(key) ? undefined : value)));
}
function canonical(project) {
  const sorted=v=>!v||typeof v!=="object"?v:Array.isArray(v)?v.map(sorted):Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])]));
  return JSON.stringify(sorted(safeProject(project)));
}
async function fingerprint(p){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(p))))).map(n=>n.toString(16).padStart(2,"0")).join("");}
async function matchesBase(p,b){return b?.hash?await fingerprint(p)===b.hash:b?.project?canonical(p)===canonical(b.project):false;}
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
    // Keep the old draft as a recoverable archive after the replacement is saved.
    const replacement=await readRow(to);
    if(!replacement||replacement.project_data?.projectId!==to)continue;
    const prior=await readRow(from);
    if(prior){
      const archived=window.GuccCreatorStorage.unpackProject(prior.project_data);
      if(!archived.supersededBy){
        archived.archivedAt=new Date().toISOString();archived.supersededBy=to;
        const saved=await send(archived,prior.revision);
        remoteRows.set(from,saved);
      }
    }
    const map=bases();delete map[from];localStorage.setItem(BASE_KEY,JSON.stringify(map));
    delete items[from];localStorage.setItem(RENAME_KEY,JSON.stringify(items));
  }
}
async function remember(id, revision, project) {
  const all=bases();
  all[id]={revision,hash:await fingerprint(project)};
  localStorage.setItem(BASE_KEY,JSON.stringify(all));
}
function status(text,mode="idle") {
  const el=$("cloudSyncStatus");
  if (el) {el.textContent=text;el.dataset.state=mode;}
  const heading=$("workspaceCloudLabel");
  if (heading) heading.textContent=mode==="ok"?"云端已核对":mode==="busy"?"同步中":mode==="conflict"?"需要处理冲突":"本浏览器草稿";
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
  if(!user)throw new Error("未登录");
  // One database transaction: ensure canonical creator_projects root, then CAS-save detail snapshot.
  const token=await getAccessToken();
  const response=await fetch(CONFIG.SUPABASE_URL.replace(/[/]+$/,"")+"/rest/v1/rpc/creator_os_save_project",{
    method:"POST",
    headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:"Bearer "+token,
      "Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({p_project:safeProject(project),p_expected_revision:expectedRevision})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.error||"Creator OS save HTTP "+response.status);
  if(!data||data.project_id!==id||!Number.isInteger(Number(data.revision)))
    throw new Error("云端没有返回有效的项目保存回执");
  return data;
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
async function applyRemote(row) {
  if(!row?.project_data||row.project_id!==row.project_data.projectId)throw new Error("云端项目 ID 不一致");
  api()?.putProject(row.project_data,{fromCloud:true});
  remoteRows.set(row.project_id,row);
  await remember(row.project_id,row.revision,row.project_data);
}
function localById(id){return api()?.projects()?.find(p=>p.projectId===id)||null;}
async function pushOne(id,forceRevision=null) {
  if(busy||!ready||conflict) {pending=true;return;}
  const local=localById(id);
  if(!isRealProject(local))return false;
  const p=window.GuccCreatorStorage.unpackProject(safeProject(local));
  busy=true;
  status("正在保存："+(p.name||id),"busy");
  try {
    const expected=forceRevision??baseFor(id)?.revision??null;
    const result=await send(p,expected);
    remoteRows.set(id,result);
    const latest=localById(id);
    // Do not mark a newer in-flight local edit as synced.
    if(latest&&canonical(latest)===canonical(p)) await remember(id,result.revision,p);
    else {await remember(id,result.revision,p);pending=true;}
    await cleanRenames(id);
    status(pending?"最新编辑待同步":"云端已同步",pending?"busy":"ok");
    return true;
  }catch(err){
    const remote=await readRow(id).catch(()=>null);
    if(remote&&/revision|conflict|版本/i.test(err.message)){remoteRows.set(id,remote);setConflict(id,p,remote);}
    else status("云同步失败："+(err.message||"网络错误"),"error");
    return false;
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
    if(b&&await matchesBase(p,b))continue;
    if(!b&&remoteRows.has(p.projectId)){setConflict(p.projectId,p,remoteRows.get(p.projectId));return;}
    if(!await pushOne(p.projectId))return;
    if(conflict)return;
  }
  if(!conflict){
    let dirty=false;
    for(const p of api()?.projects()||[])if(isRealProject(p)&&!await matchesBase(p,baseFor(p.projectId))){dirty=true;break;}
    status(dirty?"最新编辑待同步":"项目版本已核对 · 云端已同步",dirty?"busy":"ok");
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
      if(renames()[row.project_id]||row.project_data.supersededBy)continue;
      const local=localById(row.project_id);
      if(!local){await applyRemote(row);continue;}
      const b=baseFor(row.project_id);
      if(canonical(local)===canonical(row.project_data)){await remember(row.project_id,row.revision,local);continue;}
      if(b&&await matchesBase(local,b)){await applyRemote(row);continue;}
      if(b&&await matchesBase(row.project_data,b))continue;
      // If local and remote differ without common base, refuse implicit overwrite.
      setConflict(row.project_id,local,row);break;
    }
    if(!conflict){
      // A locally tracked cloud project missing remotely is kept locally;
      // do not silently recreate a deleted remote record.
      const missing=(api()?.projects()||[]).find(p=>isRealProject(p)&&baseFor(p.projectId)&&!currentIds.has(p.projectId));
      if(missing)status("发现云端缺失的旧项目，请导出本地备份后确认","error");
      else status("已连接 · 正在核对未同步修改","busy");
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
    const actualNow=localById(c.id);
    if(!actualNow||canonical(actualNow)!==canonical(c.local))throw Error("本地项目已变化，请关闭冲突窗口后重新核对");
    const latest=await readRow(c.id);
    if(!latest||latest.revision!==c.remote.revision){conflict=null;dlg?.close();status("云端又有更新，重新核对","busy");busy=false;await refresh();return;}
    if(choice==="remote"){
      const backup={kind:"CLOUD_CONFLICT",at:new Date().toISOString(),snapshot:window.GuccCreatorStorage.unpackProject(c.local)};
      const chosen=window.GuccCreatorStorage.unpackProject(latest.project_data);
      chosen.conflictBackups=[...(chosen.conflictBackups||[]),backup];
      const saved=await send(chosen,latest.revision);
      await applyRemote(saved);
    }else if(choice==="local"){
      const actual=localById(c.id);
      if(!actual||canonical(actual)!==canonical(c.local))throw new Error("本地项目已经变化，请重新同步");
      const chosen=JSON.parse(JSON.stringify(actual));
      chosen.conflictBackups=[...(chosen.conflictBackups||[]),{kind:"CLOUD_CONFLICT",at:new Date().toISOString(),snapshot:window.GuccCreatorStorage.unpackProject(latest.project_data)}];
      const row=await send(chosen,latest.revision);
      api()?.putProject(chosen,{fromCloud:true});
      remoteRows.set(c.id,row);await remember(c.id,row.revision,chosen);
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

window.addEventListener("offline",()=>status("网络已断开 · 最新修改待同步","error"));
