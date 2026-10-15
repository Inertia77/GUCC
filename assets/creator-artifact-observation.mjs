// Observations describe bytes seen on this device, never a claim that local files are accessible elsewhere.
export async function observeArtifact(file,{generated=false,ratio=''}={}){
 if(!file||!Number.isSafeInteger(file.size)||file.size<=0)throw Error('请选择非空的真实文件');
 if(file.size>256*1024*1024)throw Error('此处只登记 256MB 内的成果包；大型媒体请继续用本地素材管理');
 const bytes=await file.arrayBuffer();
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 return {fileName:String(file.name||'artifact').split(/[\\/]/).pop(),sizeBytes:file.size,mimeType:file.type||'application/octet-stream',sha256,
  observation:generated?'generated_bytes':'browser_file',observedAt:new Date().toISOString(),...(ratio?{ratio}:{}),availability:'local_only'};
}
export function subtitleValid(text){return /^\s*\d+\s*\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}\s*\r?\n\S/m.test(text);}
export function contextFor(snapshot,video,project={}){
 const s=snapshot||{};
 return {...project,...s,name:project.name||s.name,videoTitle:video?.name||video?.title||s.name,
  confirmedContext:{verifiedFacts:s.verifiedFacts||[],sharedSources:s.sharedSources||[],authorQuestion:s.authorQuestion||'',authorContribution:s.authorContribution||'',coreThesis:s.coreThesis||'',audienceQuestion:s.audienceQuestion||'',lockedArtifacts:s.lockedArtifacts||[],doNotUse:s.doNotUse||[]}};
}
