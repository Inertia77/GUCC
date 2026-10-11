import { CONFIG } from "../command-center/src/config.js";
import { getSession, getAccessToken } from "../command-center/src/auth.js";

const API=window.GuccPublishDrafts;
const BASES="gucc_publish_cloud_bases_v1";
const status=document.getElementById("publishCloudState");
const button=document.getElementById("publishCloudSync");
const keyOf=d=>d?.project?.creatorProjectId&&d?.project?.videoId?JSON.stringify([d.project.creatorProjectId,d.project.videoId]):"";
const copy=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>JSON.stringify(sort(value));
function sort(value){if(Array.isArray(value))return value.map(sort);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])]));return value;}
// The cloud holds authored publish metadata, never local paths, browser File
// handles, inherited research, or a claim that media/quality was checked here.
function clean(draft){
  const d=copy(draft);delete d.updatedAt;delete d.preflight;
  d.common={...d.common,videoPath:"",coverPath:""};
  d.source={workspaceVersion:d.source?.workspaceVersion||"",publishPackage:d.source?.publishPackage||""};
  return d;
}
async function digest(draft){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(clean(draft))));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
function bases(){return JSON.parse(localStorage.getItem(BASES)||"{}");}
async function remember(key,row){const all=bases();all[key]={revision:row.revision,hash:await digest(row.draft_data)};localStorage.setItem(BASES,JSON.stringify(all));}
function message(text,mode="local"){status.textContent=`云端 · ${text}`;status.dataset.mode=mode;status.setAttribute("role",mode==="error"?"alert":"status");}
async function request(path,body){
  const token=await getAccessToken();
  const res=await fetch(`${CONFIG.SUPABASE_URL.replace(/\/+$/,"")}/rest/v1/${path}`,{method:body?"POST":"GET",headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const data=await res.json();if(!res.ok)throw Error(data.message||`请求失败 (${res.status})`);return data;
}
function validate(row,key){
  if(!row||keyOf(row.draft_data)!==key||row.draft_data.schemaVersion!=="gucc-publish-console-1"||!Number.isSafeInteger(row.revision)||row.revision<1||row.project_id!==row.draft_data.project.creatorProjectId||row.video_id!==row.draft_data.project.videoId)throw Error("云端草稿身份或版本无效，未应用");
}
let busy=false,queued=false,timer,conflictKey="";
async function send(draft,revision){
  const data=await request("rpc/creator_os_save_publish_draft",{p_project_id:draft.project.creatorProjectId,p_video_id:draft.project.videoId,p_draft:clean(draft),p_expected_revision:revision});
  validate(data.current,keyOf(draft));return data;
}
function conflict(local,row){
  const key=keyOf(local);validate(row,key);conflictKey=key;
  document.getElementById("publishCloudConflict")?.remove();
  const dialog=document.createElement("dialog");dialog.id="publishCloudConflict";dialog.className="publish-cloud-conflict";dialog.setAttribute("aria-label","发布草稿云端冲突");
  dialog.innerHTML='<h2>这条视频有两个发布草稿</h2><p>本机与云端内容不同，自动保存已暂停。选择前会保留另一侧副本；真实成片仍需在本机重新核验。</p><p data-identity></p><div class="cloud-conflict-actions"><button type="button" data-choice="remote">采用云端草稿</button><button type="button" data-choice="local">保存本机草稿到云端</button><button type="button" data-choice="cancel">稍后处理</button></div>';
  dialog.querySelector("[data-identity]").textContent=`${local.project.title||local.project.videoId} · 云端版本 ${row.revision}`;
  document.body.append(dialog);dialog.showModal();message("草稿冲突，请选择保留版本","error");
  let resolving=false;
  dialog.addEventListener("click",async e=>{
    const choice=e.target.closest("[data-choice]")?.dataset.choice;if(!choice||resolving)return;
    if(choice==="cancel"){dialog.close();dialog.remove();return;}
    const current=API.current();
    if(keyOf(current)!==key||JSON.stringify(current)!==JSON.stringify(local)){message("本机内容已变化，请重新检查云端","error");dialog.close();dialog.remove();return;}
    resolving=true;dialog.querySelectorAll("button").forEach(b=>b.disabled=true);
    try{
      if(choice==="remote"){
        // receive() backs up the complete current local draft before replacing it.
        API.receive(key,row.draft_data,current);await remember(key,row);
      }else{
        API.backup(key,row.draft_data);
        const result=await send(current,row.revision);
        if(result.conflict){dialog.close();dialog.remove();conflict(API.current(),result.current);return;}
        await remember(key,result.current);
      }
      conflictKey="";dialog.close();dialog.remove();
      // Edits made while the request was in flight remain pending.
      if(await digest(API.current())!==await digest(choice==="remote"?row.draft_data:current)){message("仍有本机修改待保存");schedule();}
      else message("这条视频的发布草稿已保存","ok");
    }catch(error){message(error.message,"error");resolving=false;dialog.querySelectorAll("button").forEach(b=>b.disabled=false);}
  });
}
async function sync({manual=false}={}){
  if(busy){queued=true;return;}
  if(!getSession()){message("未登录，发布单仍保存在本浏览器");return;}
  const draft=API.current(),key=keyOf(draft);
  if(!key){message("独立视频草稿未选中；兼容发布单沿用原接口");return;}
  if(conflictKey===key&&!manual)return;
  busy=true;button.disabled=true;message("正在检查这条视频的草稿…");
  try{
    const [projectId,videoId]=JSON.parse(key);
    const rows=await request(`creator_os_publish_drafts?select=project_id,video_id,draft_data,revision,updated_at&project_id=eq.${encodeURIComponent(projectId)}&video_id=eq.${encodeURIComponent(videoId)}`);
    const row=rows[0];if(row)validate(row,key);
    const localHash=await digest(draft),base=bases()[key];
    if(row){
      const remoteHash=await digest(row.draft_data);
      if(remoteHash===localHash){
        await remember(key,row);
        if(keyOf(API.current())===key){if(await digest(API.current())===localHash)message("这条视频的发布草稿已保存","ok");else{message("仍有本机修改待保存");queued=true;}}
        return;
      }
      if(!base||base.hash!==remoteHash){if(keyOf(API.current())===key)conflict(API.current(),row);return;}
    }else if(base?.revision){throw Error("云端草稿缺失，自动保存已暂停；请导出本机备份");}
    const result=await send(draft,row?.revision||0);
    if(result.conflict){if(keyOf(API.current())===key)conflict(API.current(),result.current);return;}
    await remember(key,result.current);
    if(keyOf(API.current())===key){
      if(await digest(API.current())===localHash)message("这条视频的发布草稿已保存","ok");
      else{message("仍有本机修改待保存");queued=true;}
    }
  }catch(error){message(error.message,"error");}
  finally{busy=false;button.disabled=false;if(queued){queued=false;schedule();}}
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>sync(),650);}
async function loadMissing(){
  if(!getSession()){message("未登录，发布单仍保存在本浏览器");return;}
  try{
    const rows=await request("creator_os_publish_drafts?select=project_id,video_id,draft_data,revision,updated_at&order=updated_at.desc");
    for(const row of rows){const key=keyOf(row.draft_data);validate(row,key);if(!API.read(key)&&keyOf(API.current())!==key){API.receive(key,row.draft_data,null);await remember(key,row);}}
    await sync();
  }catch(error){message(error.message,"error");}
}
button.addEventListener("click",()=>{conflictKey="";sync({manual:true});});
window.addEventListener("gucc-publish-draft-saved",()=>{message("本机有修改，待云端保存");schedule();});
window.addEventListener("online",schedule);
await loadMissing();
