/* Standalone, video-scoped six-deliverable progress ledger.
   Independent of Prompt Flow and cloud publication/Lock claims. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GuccCreatorOutcomes=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const STATES=Object.freeze([
    {id:"pending",label:"未开始"},
    {id:"working",label:"制作中"},
    {id:"review",label:"待核验"},
    {id:"done",label:"已完成"},
    {id:"na",label:"不适用"}
  ]);
  const IDS=Object.freeze(["script","subtitle","visual","sound","cover","publish"]);
  const LABELS=Object.freeze(Object.fromEntries(STATES.map(s=>[s.id,s.label])));
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
      official.push({key:branch,branch,name:branch+" · 旧视频分支"});
      seen.add(branch);
    }
    if(!official.length)official.push({key:"SHARED",branch:"SHARED",name:"主视频"});
    return official;
  }
  function legacy(project,video,id){
    const nodes=(project?.promptFlow||[]).filter(n=>n.sixOutcomeId===id&&
      (n.branch===video.branch||(video.branch==="SHARED"&&(!n.branch||n.branch==="SHARED"))));
    const node=nodes[0];
    if(!node)return null;
    const proof=node.receiptEvidence||{};
    const done=node.status==="DONE"&&proof.humanApproved===true&&proof.fileVerified===true&&proof.qualityVerified===true;
    const status=done?"done":node.status==="DONE"||node.status==="WAITING"?"review":
      node.status==="SKIPPED"?"na":node.status==="PENDING"||node.status==="CONDITIONAL"?"pending":"working";
    return {status,note:"",artifactRef:"",verifiedAt:done?proof.verifiedAt||node.updatedAt||null:null,source:"flow",nodeId:node.promptId};
  }
  function record(project,video,id){
    if(!IDS.includes(id)||!video?.key)return null;
    const stored=project?.outcomeProgress?.[video.key]?.[id];
    if(stored&&LABELS[stored.status])return {...stored,source:"manual"};
    return legacy(project,video,id)||{status:"pending",note:"",artifactRef:"",source:"new",verifiedAt:null};
  }
  function cleanText(value,max){return String(value||"").trim().slice(0,max);}
  function update(project,video,id,input,at){
    if(!project||!IDS.includes(id)||!videos(project).some(v=>v.key===video?.key&&v.branch===video?.branch))
      throw Error("项目、视频或成果身份不匹配");
    const status=String(input?.status||"");
    if(!LABELS[status])throw Error("请选择有效的成果状态");
    const artifactRef=cleanText(input.artifactRef,300);
    const note=cleanText(input.note,1200);
    if(/^(?:[a-zA-Z]:[\\/]|\/|\\|file:\/\/)/i.test(artifactRef))
      throw Error("请填写项目相对文件名或云端链接，不要同步本机绝对路径");
    if(status==="done"&&(!input.verified||!artifactRef))
      throw Error("确认完成前，需核实真实成果与质量，并填写可定位的成果引用");
    if(status==="na"&&!note)throw Error("标记不适用时请说明理由");
    const now=at||new Date().toISOString();
    const previous=record(project,video,id);
    const updated={status,artifactRef,note,updatedAt:now,
      verifiedAt:status==="done"?(previous?.status==="done"&&previous.verifiedAt||now):null};
    project.outcomeProgress ||= {};
    project.outcomeProgress[video.key] ||= {};
    project.outcomeProgress[video.key][id]=updated;
    project.history ||= [];
    project.history.push({at:now,action:"OUTCOME_STATUS_UPDATED",videoId:video.key,outcomeId:id,
      from:previous?.status||"pending",to:status});
    return updated;
  }
  function summary(project,video){
    const items=IDS.map(id=>({id,...record(project,video,id)}));
    const done=items.filter(x=>x.status==="done").length;
    const applicable=items.filter(x=>x.status!=="na").length;
    return {items,done,applicable,ignored:6-applicable,
      percent:applicable?Math.round(done/applicable*100):0};
  }
  return {STATES,IDS,LABELS,videos,record,update,summary};
});
