/* Read-only projection of canonical creator_deliverable_records.
   Writes and human/file approval use the existing audited creator workspace editor. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GuccCreatorOutcomes=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const IDS=Object.freeze(["script","subtitle","visual","sound","cover","publish"]);
  const LABELS=Object.freeze({not_started:"未开始",in_progress:"制作中",review:"待审核",confirmed:"已确认",blocked:"需要处理"});
  function videos(project){
    if(!project)return[];
    const raw=Array.isArray(project.videos)&&project.videos.length?project.videos:
      (project.rawVideoContract?.VIDEO_TRACKS||project.rawVideoContract?.VIDEOS||[]);
    const official=(Array.isArray(raw)?raw:[]).map(v=>({
      key:String(v.videoId||v.VIDEO_ID||v.branch||v.FOLDER||""),
      branch:String(v.branch||v.FOLDER||v.videoId||v.VIDEO_ID||""),
      name:String(v.name||v.VIDEO_NAME||v.CHARACTER||v.videoId||v.VIDEO_ID||"未命名视频")
    })).filter(v=>v.key&&v.branch);
    const seen=new Set(official.map(v=>v.branch));
    for(const n of project.promptFlow||[]){
      const branch=String(n.branch||"");
      if(!branch||branch==="SHARED"||seen.has(branch))continue;
      official.push({key:branch,branch,name:branch+" · 旧视频分支（需登记）",inferred:true});
      seen.add(branch);
    }
    return official;
  }
  function record(records,video,id){
    if(!IDS.includes(id)||!video?.key||!Array.isArray(records))return null;
    return records.find(r=>r?.video_id===video.key&&r.deliverable_key===id)||null;
  }
  function summary(records,video){
    const loaded=Array.isArray(records)&&Boolean(video?.key);
    const items=IDS.map(id=>{
      const row=loaded?record(records,video,id):null;
      return {id,status:loaded?row?.status||"not_started":null,row};
    });
    const done=items.filter(x=>x.status==="confirmed").length;
    return {loaded,items,done,total:6,percent:loaded?Math.round(done/6*100):0};
  }
  function evidenceLabel(row){
    const e=row?.evidence||{},files=Array.isArray(e.artifacts)?e.artifacts:[];
    const file=files.find(f=>f?.fileName)?.fileName;
    return file||e.fileName||"";
  }
  return {IDS,LABELS,videos,record,summary,evidenceLabel};
});
