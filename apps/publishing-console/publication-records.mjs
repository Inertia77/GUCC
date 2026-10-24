import {CONFIG} from '../command-center/src/config.js';
import {getSession,getAccessToken} from '../command-center/src/auth.js';
const api=window.GuccPublishDrafts;
const platformNames=window.GuccPublishingRules.PLATFORMS;
const identities=d=>JSON.stringify([d?.project?.creatorProjectId||'',d?.project?.videoId||'']);
let currentKey='',history=[],epoch=0,busy=false,pending=new Map();
const msg=document.createElement('p');msg.className='publication-record-feedback';msg.setAttribute('role','status');
document.querySelector('#executionList')?.after(msg);
function say(value){msg.textContent=value;}
async function rpc(name,body){
 if(!getSession())throw Error('请先登录 GUCC，编辑仍保留在本浏览器');
 const token=await getAccessToken(),r=await fetch(CONFIG.SUPABASE_URL.replace(/\/+$/,'')+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const data=await r.json();if(!r.ok)throw Error(data.message||'云端登记失败');return data;
}
function context(){const d=api.current();return {key:identities(d),projectId:d.project.creatorProjectId,videoId:d.project.videoId,draft:d};}
function latest(platform){return history.find(p=>p.metadata?.platformKey===platform);}
function render(){
 document.querySelectorAll('[data-record-publication]').forEach(el=>el.remove());
 const ctx=context();
 for(const key of Object.keys(platformNames)){
  const card=document.querySelector(`[data-exec-field="status"][data-exec-platform="${key}"]`)?.closest('.execution-card');if(!card)continue;
  const row=latest(key),wrap=document.createElement('div');wrap.dataset.recordPublication=key;wrap.className='publication-record-actions';
  const b=document.createElement('button');b.type='button';b.className='button subtle';b.textContent='登记当前状态 · 保留历史';b.disabled=busy||!ctx.projectId||!ctx.videoId||currentKey!==ctx.key;b.addEventListener('click',()=>record(key));
  const note=document.createElement('small');note.textContent=row?`最近云端记录：${row.status==='PUBLISHED'?'人工已发布':row.status==='FAILED'?'失败':'待发布'} · ${history.filter(p=>p.metadata?.platformKey===key).length} 次记录`:'尚未登记正式发布记录';
  wrap.append(b,note);
  if(row){
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='查看历史记录';details.append(summary);
   for(const record of history.filter(p=>p.metadata?.platformKey===key)){
    const line=document.createElement('p');line.textContent=`${record.status} · ${new Date(record.created_at).toLocaleString('zh-CN',{timeZone:'Asia/Tokyo'})} · ${record.post_id||''} · ${record.failure_reason||''}`;
    if(record.post_url?.startsWith('https://')){const a=document.createElement('a');a.href=record.post_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=record.post_url;line.append(a);}
    details.append(line);
   }
   wrap.append(details);
  }
  card.append(wrap);
 }
 let select=document.querySelector('#snapshotPublication');
 if(!select){
  const label=document.createElement('label');label.textContent='关联发布记录（可选）';select=document.createElement('select');select.id='snapshotPublication';label.append(select);document.querySelector('#snapshotForm')?.prepend(label);
 }
 const previous=select.value;select.replaceChildren(new Option('仅本地快照，尚未关联',''));
 const selectedPlatform=document.querySelector('#snapshotPlatform')?.value;
 for(const row of history.filter(p=>p.status==='PUBLISHED'&&p.metadata?.platformKey===selectedPlatform))select.add(new Option(`${platformNames[row.metadata.platformKey]?.label} · ${row.post_id||row.post_url||row.publication_id} · ${new Date(row.created_at).toLocaleString('zh-CN',{timeZone:'Asia/Tokyo'})}`,row.publication_id));
 if([...select.options].some(o=>o.value===previous))select.value=previous;
}
async function load(){
 const ctx=context(),run=++epoch;if(!ctx.projectId||!ctx.videoId){currentKey=ctx.key;history=[];render();return;}
 if(!getSession()){say('登录后可以登记正式发布结果；当前发布单保留在本机');return;}
 try{
  const rows=await rpc('creator_publication_history',{p_project_id:ctx.projectId,p_video_id:ctx.videoId});
  if(run!==epoch||context().key!==ctx.key)return;
  if(!Array.isArray(rows)||rows.some(r=>r.project_id!==ctx.projectId||r.video_id!==ctx.videoId))throw Error('云端发布记录身份不匹配');
  history=rows;currentKey=ctx.key;render();
 }catch(e){if(run===epoch)say(e.message);}
}
async function record(platform){
 if(busy)return;const ctx=context(),ex=ctx.draft.execution[platform];
 const status={'已发布':'PUBLISHED','失败 / 待处理':'FAILED','等待最终检查':'READY_TO_PUBLISH','已上传草稿':'READY_TO_PUBLISH','审核中':'READY_TO_PUBLISH','准备中':'READY_TO_PUBLISH','未开始':'READY_TO_PUBLISH'}[ex.status];
 if(status==='PUBLISHED'&&!ex.postUrl.trim()&&!ex.postId.trim()){say('已发布记录请填写作品链接或平台 ID；不需要上传文件');return;}
 const signature=JSON.stringify([ctx.key,platform,ex,ctx.draft.platforms[platform],latest(platform)?.publication_id||'']);
 const payload=pending.get(signature)||{requestId:crypto.randomUUID(),platform,status,postUrl:ex.postUrl,postId:ex.postId,note:ex.note,fields:ctx.draft.platforms[platform],humanConfirmed:true,previousPublicationId:latest(platform)?.publication_id||''};
 pending.set(signature,payload);busy=true;render();say('正在登记人工结果…');
 try{
  const row=await rpc('creator_record_publication',{p_project_id:ctx.projectId,p_video_id:ctx.videoId,p_payload:payload});
  if(row.project_id!==ctx.projectId||row.video_id!==ctx.videoId)throw Error('发布回执身份不匹配');
  pending.delete(signature);
  if(context().key===ctx.key){say('已保存正式发布记录 · 人工登记，未执行平台投稿');await load();}
 }catch(e){say('登记未完成：'+e.message+'。本机编辑保留；重试保留相同请求身份。');if(/CONFLICT/.test(e.message))await load();}
 finally{busy=false;render();}
}
const syncReview=document.createElement('button');syncReview.type='button';syncReview.className='button subtle';syncReview.textContent='同步已关联的复盘快照';document.querySelector('#snapshotForm')?.after(syncReview);
syncReview.addEventListener('click',async()=>{
 const ctx=context(),snapshots=ctx.draft.snapshots.filter(s=>s.publicationId);syncReview.disabled=true;
 try{
  for(const snapshot of snapshots){
   if(!history.some(p=>p.publication_id===snapshot.publicationId&&p.status==='PUBLISHED'&&p.metadata?.platformKey===snapshot.platform))throw Error('快照关联的发布记录或平台不匹配');
   await rpc('creator_record_performance',{p_project_id:ctx.projectId,p_video_id:ctx.videoId,p_publication_id:snapshot.publicationId,p_snapshot:snapshot});
  }
  say(snapshots.length?`已核对并同步 ${snapshots.length} 条复盘快照`:'请先选择正式发布记录，再录入快照');
 }catch(e){say('复盘同步未完成：'+e.message+'。本地快照已保留。');}
 finally{syncReview.disabled=false;}
});
document.querySelector('#snapshotPlatform')?.addEventListener('change',render);
let timer;window.addEventListener('gucc-publish-draft-saved',()=>{
 const changed=context().key!==currentKey;
 if(changed){history=[];render();}
 clearTimeout(timer);timer=setTimeout(load,changed?0:500);
});
await load();
