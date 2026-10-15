(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GuccCreatorValidation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function tracks(project){
  const raw=project.videos?.length?project.videos:project.rawVideoContract?.VIDEO_TRACKS||project.rawVideoContract?.VIDEOS||[];
  const official=raw.map(v=>({...v,videoId:v.videoId||v.VIDEO_ID,branch:v.branch||v.FOLDER||v.videoId||v.VIDEO_ID,name:v.name||v.CHARACTER||v.VIDEO_NAME||v.videoId||v.VIDEO_ID,inferred:false}));
  const seen=new Set(official.map(v=>v.branch));
  const legacy=(Array.isArray(project.promptFlow)?project.promptFlow:[])
   .map(n=>String(n.branch||"")).filter(b=>b&&b!=="SHARED"&&!seen.has(b)&&seen.add(b))
   .map(branch=>({videoId:branch,branch,name:branch+"（旧节点分支 · 待登记）",inferred:true}));
  return [...official,...legacy];
 }
 function identity(project,result){
  const id=result.projectId||result.WORKSPACE_PROJECT_ID;
  if(id&&id!==project.projectId)throw Error('回执属于另一个项目，请核对项目身份');
 }
 function flow(nodes){
  if(!Array.isArray(nodes)||nodes.some(n=>!n||typeof n.promptId!=='string'||!n.promptId.trim()||!Array.isArray(n.dependencies)))throw Error('制作路线需要有效节点 ID 与 dependencies 数组');
  const map=new Map(nodes.map(n=>[n.promptId,n]));
  if(map.size!==nodes.length)throw Error('制作路线包含重复节点');
  const seen=new Set(),active=new Set();
  function visit(id){if(active.has(id))throw Error('制作路线依赖成环');if(seen.has(id))return;
   const n=map.get(id);if(!n)throw Error('不存在的前置节点：'+id);active.add(id);
   for(const dep of n.dependencies||[])visit(dep);active.delete(id);seen.add(id);
  }
  for(const n of nodes)visit(n.promptId);
 }
 function result(project,node,receipt){
  identity(project,receipt);
  const status=String(receipt.status||'').toUpperCase();
  if(!['DONE','WAITING','NEED_INPUT'].includes(status))throw Error('回执需要明确的 DONE / WAITING / NEED_INPUT 状态；不能自动判定完成');
  if(receipt.videoId&&node.branch!=='SHARED'){
   const video=tracks(project).find(v=>v.branch===node.branch);
   if(!video||receipt.videoId!==video.videoId)throw Error('回执的视频身份与当前分支不一致');
  }
  if(node.status==='DONE'||node.status==='SKIPPED')throw Error('该节点已经结束，请先通过修订重新打开');
  return status;
 }
 function diff(project,payload,orchestrator,capabilities){
  identity(project,payload);
  if(!payload.projectId)throw Error('路线修订缺少 projectId');
  if(payload.expectedFlowRevision!==project.flowRevision)throw Error('路线版本已变化，请基于当前路线重新生成修订');
  if(!Array.isArray(payload.flowOps)||!payload.flowOps.length)throw Error('修订缺少 flowOps');
  const candidate=JSON.parse(JSON.stringify(project));
  for(let op of payload.flowOps){
   if(!['ADD','REMOVE','MERGE','SKIP','REORDER','REPLACE'].includes(String(op.op).toUpperCase()))throw Error('未知路线修改类型');
   const affected=[op.promptId,...(op.promptIds||[])].filter(Boolean);
   for(const id of affected){const node=project.promptFlow.find(n=>n.promptId===id);if(!node)throw Error('修订引用未知节点：'+id);if(['DONE','SKIPPED','WAITING'].includes(node.status))throw Error('不能改写已执行或待批准节点：'+id);}
   if(op.node){
    const cap=capabilities.get(op.node.capabilityUsed);
    if(!cap||String(op.node.prompt||'').trim().length<80)throw Error('修订节点需要有效能力和完整 Prompt');
    if(['DONE','SKIPPED','WAITING'].includes(op.node.status))throw Error('修订不能伪造执行状态');
    op=Object.assign(op,{node:{...op.node,isCompiledExternal:true,prompt:['【成熟能力方法】',...cap.coreMethod,'【必须遵守的防错规则】',...cap.mandatoryGuardrails,'【本项目任务】',op.node.prompt].join('\n'),status:'PENDING',reviewMode:cap.reviewMode==='APPROVAL_REQUIRED'?'APPROVAL_REQUIRED':op.node.reviewMode||cap.reviewMode}});
   }
  }
  orchestrator.updatePromptFlow(candidate,payload.flowOps);
  flow(candidate.promptFlow);
  return candidate;
 }
 return {tracks,identity,flow,result,diff};
});
