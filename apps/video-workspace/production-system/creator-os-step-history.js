(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GuccCreatorStepHistory=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KINDS={
    BRIEF_IMPORT:"立项结果导入", FLOW_IMPORT:"制作路线导入",
    NODE_RESULT:"节点回执导入", NODE_STATUS:"人工确认节点",
    LOCAL_FLOW:"本地编排流程"
  };
  const MAX_CHECKPOINTS=4,MAX_RETRACTED=2;
  function deep(value){return JSON.parse(JSON.stringify(value));}
  function snapshot(p){
    return JSON.parse(JSON.stringify(p,(key,value)=>
      ["stepUndoHistory","retractedStages"].includes(key)?undefined:value));
  }
  function checkLocks(p){
    const lockedVideo=Object.values(p.videoLocks||{}).some(branch=>
      Object.values(branch||{}).some(v=>v&&typeof v==="object"&&v.approvedLocallyAt));
    const l=p.locks||{};
    return lockedVideo||["script","audio","timeline","final","publish"].some(key=>l[key]===true);
  }
  function record(p,kind){
    if(!p||!KINDS[kind])throw Error("Invalid Creator OS checkpoint kind");
    p.stepUndoHistory=Array.isArray(p.stepUndoHistory)?p.stepUndoHistory:[];
    p.stepUndoHistory.push({kind,at:new Date().toISOString(),snapshot:snapshot(p)});
    if(p.stepUndoHistory.length>MAX_CHECKPOINTS)p.stepUndoHistory.splice(0,p.stepUndoHistory.length-MAX_CHECKPOINTS);
  }
  function describe(p){
    if(!p||p.status==="TEST_FIXTURE")return {allowed:false,reason:"请先选择真实项目"};
    if(p.deletedAt||p.completedAt||p.archivedAt)return {allowed:false,reason:"请先把项目恢复为进行中"};
    if(checkLocks(p))return {allowed:false,reason:"已存在本地锁定/人工批准记录。为避免撤销正式锁定，请先通过 DIFF 修订处理"};
    const stack=Array.isArray(p.stepUndoHistory)?p.stepUndoHistory:[];
    const last=stack.length?stack[stack.length-1]:null;
    if(last){
      const labels={
        BRIEF_IMPORT:"返回 Project Builder，重新提交立项结果",
        FLOW_IMPORT:"返回 Prompt Flow 编排，重新导入制作路线",
        NODE_RESULT:"撤回最近一次节点回执，重新执行该任务",
        NODE_STATUS:"撤回最近一次人工确认，重新审核",
        LOCAL_FLOW:"撤回本地结构草案"
      };
      // If the project has already moved to an unrelated stage, do not blindly
      // apply a snapshot from a previous, unrelated action.
      if(last.kind==="BRIEF_IMPORT"&&p.status!=="BRIEF_READY")return {allowed:false,reason:"项目已进入下游流程，请先处理当前阶段"};
      if(["FLOW_IMPORT","NODE_RESULT","NODE_STATUS","LOCAL_FLOW"].includes(last.kind)&&p.status!=="FLOW_READY")
        return {allowed:false,reason:"快照所属阶段与当前阶段不一致"};
      return {allowed:true,mode:"checkpoint",label:labels[last.kind],kind:last.kind,at:last.at,
        explanation:"将使用导入/确认前的状态快照恢复这个项目。期间后续的项目内部改动也会撤回；撤回前的资料会保留在项目的修订历史中。"};
    }
    // Older projects predate checkpoint support. Never invent the earlier contents:
    // only reopen the previous stage, and retire the old output from active use.
    if(p.status==="BRIEF_READY"||p.status==="BRIEF_REVIEW")
      return {allowed:true,mode:"legacyBrief",kind:"BRIEF_IMPORT",label:"返回 Project Builder，重新提交第一步",
        explanation:"此项目是在新增历史快照功能前完成立项的，无法精确恢复当时的全部字段。会保留你现有的标题、原始想法及基本资料，并将旧立项结果从有效资料中撤下存档。"};
    if(p.status==="FLOW_READY"){
      const progress=(p.promptFlow||[]).some(n=>["DONE","SKIPPED","WAITING"].includes(n.status));
      if(progress)return {allowed:false,reason:"此旧项目已有执行/等待审核节点，没有可恢复的历史快照。为保护进度，请使用调整制作路线（DIFF MODE）。"};
      return {allowed:true,mode:"legacyFlow",kind:"FLOW_IMPORT",label:"返回 Prompt Flow 编排，重新提交制作路线",
        explanation:"将撤下当前未执行的流程并保留旧回执记录；VIDEO_CONTRACT 和项目名称不变。"};
    }
    return {allowed:false,reason:p.status==="DRAFT"||p.status==="IMPORTED_LEGACY"?"当前已经是第一步，可以重新复制立项 Prompt":"当前没有可安全返回的上一步"};
  }
  function rewind(p){
    const plan=describe(p);
    if(!plan.allowed)throw Error(plan.reason);
    const previous=snapshot(p),stack=Array.isArray(p.stepUndoHistory)?p.stepUndoHistory:[];
    const retired=Array.isArray(p.retractedStages)?p.retractedStages:[];
    if(plan.mode==="checkpoint"){
      const last=stack[stack.length-1];
      if(!last?.snapshot||last.snapshot.projectId!==p.projectId)throw Error("历史快照的项目身份不一致");
      const restored=deep(last.snapshot);
      Object.keys(p).forEach(key=>delete p[key]);
      Object.assign(p,restored);
      p.stepUndoHistory=stack.slice(0,-1);
    }else if(plan.mode==="legacyBrief"){
      p.status="DRAFT";
      delete p.rawVideoContract;
      delete p.projectBriefMarkdown;
      delete p.projectCode;
      for(const key of ["verifiedFacts","reasonedAnalysis","unknowns","doNotUse","officialTerminology",
        "lockedArtifacts","availableArtifacts"])p[key]=[];
      p.productionNeeds={};
      p.workflow=[];p.promptFlow=[];p.flowRevision=0;
    }else if(plan.mode==="legacyFlow"){
      p.status="BRIEF_READY";p.workflow=[];p.promptFlow=[];p.flowRevision=(p.flowRevision||0)+1;
    }
    p.retractedStages=[...retired,{
      kind:plan.kind,at:new Date().toISOString(),
      label:plan.label,previousStatus:previous.status,
      snapshot:previous
    }].slice(-MAX_RETRACTED);
    p.history=Array.isArray(p.history)?p.history:[];
    p.history.push({at:new Date().toISOString(),action:"STAGE_REWOUND",kind:plan.kind,from:previous.status,to:p.status});
    p.updatedAt=new Date().toISOString();
    return {plan,project:p};
  }
  return {record,describe,rewind,checkLocks};
});
