(function(root,factory){
  const api=factory(
    typeof module==="object"&&module.exports?require("./core-rules.js"):root.GuccCreatorCoreRules,
    typeof module==="object"&&module.exports?require("./capability-library.js"):root.GuccCreatorCapabilities,
    typeof module==="object"&&module.exports?require("./failure-prevention.js"):root.GuccCreatorFailurePrevention
  );
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.GuccCreatorOrchestrator=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Core,Caps,Failures){
  "use strict";

  const VERSION="2.0.0";
  const STORAGE_KEY="gucc_creator_os_v2";
  const EXECUTORS=["Chat","Work","Codex","Human","System"];

  function now(){return new Date().toISOString();}
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function slug(s){return String(s||"PROJECT").replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g,"_").slice(0,80);}
  function humanProjectId(input={}){
    if(input.projectId) return String(input.projectId);
    const game=String(input.game||"GAME").replace(/绝区零/i,"ZZZ").replace(/鸣潮/i,"WW").replace(/异环/i,"NTE").replace(/崩坏[:：]?星穹铁道/i,"HSR").replace(/阴阳师/i,"ONM").replace(/明日方舟[:：]?终末地/i,"ENF");
    const version=String(input.version||input.dataCutoff||"").replace(/\s+/g,"")||"CURRENT";
    const topic=String(input.name||input.topic||input.idea||"PROJECT").replace(/[，。、“”‘’：:]/g,"").replace(/\s+/g,"").slice(0,18);
    return `${game}-${version}-${topic}`;
  }

  function createProject(input={}){
    const id=humanProjectId(input);
    return {
      schemaVersion:"creator-os-v2",
      projectId:id,
      name:String(input.name||input.idea||"未命名项目"),
      idea:String(input.idea||input.name||""),
      game:String(input.game||""),
      server:String(input.server||""),
      version:String(input.version||""),
      dataCutoff:String(input.dataCutoff||""),
      productType:String(input.productType||"preview"),
      format:String(input.format||"UNKNOWN"),
      platforms:Array.isArray(input.platforms)?input.platforms:["Bilibili","YouTube","抖音","TikTok","小红书","微信视频号"],
      autonomyLevel:String(input.autonomyLevel||"L2"),
      videos:Array.isArray(input.videos)?clone(input.videos):[],
      sharedSources:Array.isArray(input.sharedSources)?clone(input.sharedSources):[],
      verifiedFacts:Array.isArray(input.verifiedFacts)?clone(input.verifiedFacts):[],
      reasonedAnalysis:Array.isArray(input.reasonedAnalysis)?clone(input.reasonedAnalysis):[],
      unknowns:Array.isArray(input.unknowns)?clone(input.unknowns):[],
      doNotUse:Array.isArray(input.doNotUse)?clone(input.doNotUse):[],
      officialTerminology:Array.isArray(input.officialTerminology)?clone(input.officialTerminology):[],
      availableArtifacts:Array.isArray(input.availableArtifacts)?clone(input.availableArtifacts):[],
      lockedArtifacts:Array.isArray(input.lockedArtifacts)?clone(input.lockedArtifacts):[],
      productionNeeds:{...(input.productionNeeds||{})},
      locks:{script:false,audio:false,timeline:false,final:false,publish:false,...(input.locks||{})},
      status:String(input.status||"DRAFT"),
      currentStage:String(input.currentStage||"01"),
      workflow:[],
      promptFlow:[],
      flowRevision:0,
      createdAt:input.createdAt||now(),
      updatedAt:now(),
      history:[{at:now(),action:"PROJECT_CREATED_V2"}]
    };
  }

  function commonPlan(project){
    const t=project.productType;
    const plan=[];
    const add=(id,opts={})=>plan.push({capabilityId:id,...opts});
    add("PLAYER_DEMAND_RESEARCH");
    if(["preview","rerun","decision","mechanism","guide"].includes(t)) add("COMPETITOR_RESEARCH");
    add("OFFICIAL_SOURCE_RESEARCH");
    add("ACQUIRE_REGISTER_OFFICIAL_SOURCE",{conditional:true});
    if(project.productionNeeds?.PROXY!=="NOT_PLANNED") add("PROXY_MEDIA",{conditional:true});
    if(["preview","guide","rerun","mechanism","rotation","decision","story"].includes(t)) add("VIDEO_SOURCE_ANALYSIS",{conditional:true});
    if(["mechanism","guide","preview"].includes(t)) add("MECHANIC_RESEARCH");
    if(t==="guide") {add("FORMAL_SERVER_VALIDATION");add("TEAM_RESEARCH");add("ROTATION_RESEARCH",{conditional:true});add("PULL_DECISION_RESEARCH",{conditional:true});}
    if(t==="rerun"){add("RERUN_REEVALUATION");add("TEAM_RESEARCH",{conditional:true});add("PULL_DECISION_RESEARCH");}
    if(t==="decision"){add("PULL_DECISION_RESEARCH");add("TEAM_RESEARCH",{conditional:true});}
    if(t==="rotation"){add("FORMAL_SERVER_VALIDATION",{conditional:true});add("ROTATION_RESEARCH");}
    if(t==="story") add("CHARACTER_LORE_RESEARCH");
    add("CORE_THESIS");
    add("CONTENT_STRUCTURE");
    add("SCRIPT_DRAFT");
    add("SCRIPT_FACT_QC");
    add("SCRIPT_VALUE_QC");
    add("SCRIPT_NATURALNESS_QC");
    add("SCRIPT_DIFF_REVISION");
    add("SCRIPT_LOCK_GATE");
    add("READING_SCRIPT");
    add("AUDIO_MASTER_CAPTURE");
    add("AUDIO_LOCK_GATE");
    add("PRECISE_SRT_ALIGNMENT");
    add("TIMELINE_MASTER");
    add("VISUAL_DIRECTION");
    add("GAMEPLAY_RECORDING_PLAN",{conditional:true});
    add("DYNAMIC_MECHANIC_VISUAL",{conditional:true});
    add("DATA_VISUALIZATION",{conditional:true});
    add("SOUND_DESIGN_BLUEPRINT",{conditional:true});
    add("BGM_SFX_ASSET_PRODUCTION",{conditional:true});
    add("COVER_DESIGN");
    add("ASSET_GAP_AND_INDEX",{conditional:true});
    add("EDITING_BLUEPRINT");
    add("CODEX_BUILD");
    add("FINAL_ASSEMBLY");
    add("FINAL_VIDEO_QC",{conditional:true});
    add("PLATFORM_RULE_VERIFICATION");
    add("SIX_PLATFORM_PUBLISH_PACKAGE");
    add("ANALYTICS_REVIEW",{conditional:true});
    return plan;
  }

  function testFixture(){
    const p=createProject({
      projectId:"ZZZ_3.3_FIONI_SEVERIAN_PREVIEW",
      name:"绝区零3.3｜菲欧妮 & 赛维里安前瞻解析",
      idea:"绝区零3.3菲欧妮和赛维里安前瞻，两个视频共用一个项目，前瞻结束后尽快做，不碰内鬼。",
      game:"绝区零",server:"国际服",version:"3.3",productType:"preview",format:"UNKNOWN",autonomyLevel:"L2",
      videos:[
        {videoId:"FIONI",name:"菲欧妮前瞻解析",decision:"PENDING"},
        {videoId:"SEVERIAN",name:"赛维里安前瞻解析",decision:"PENDING"}
      ],
      sharedSources:["3.3 官方 Special Program Master","3.3 官方字幕"],
      doNotUse:["测试服","内鬼","拆包","二手未核实传闻"],
      productionNeeds:{PROXY:"NOT_PLANNED",SHARED_SOURCE:"REQUIRED",CODEX_LOCAL_MASTER_ANALYSIS:"REQUIRED"},
      unknowns:["Special Program 尚未实际提供；不能猜未来直播内容。"]
    });
    p.status="TEST_FIXTURE";
    return p;
  }

  function node(id,name,capabilityId,executor,deps=[],extra={}){
    return {
      promptId:id,name,purpose:extra.purpose||Caps.get(capabilityId)?.purpose||"",
      executor:executor||Caps.get(capabilityId)?.defaultExecutor||"Chat",
      when:extra.when||"依赖满足后执行",
      dependencies:[...deps],
      requiredInput:extra.requiredInput||Caps.get(capabilityId)?.requiredInput||[],
      optionalInput:extra.optionalInput||Caps.get(capabilityId)?.optionalInput||[],
      readFromPrevious:extra.readFromPrevious||[],
      capabilityUsed:capabilityId,
      expectedOutput:extra.expectedOutput||Caps.get(capabilityId)?.outputSchema||[],
      saveAs:extra.saveAs||Caps.get(capabilityId)?.outputSchema||[],
      qualityGate:extra.qualityGate||Caps.get(capabilityId)?.qualityGate||[],
      hardStop:extra.hardStop||Caps.get(capabilityId)?.hardStopCondition||[],
      softUncertaintyPolicy:extra.softUncertaintyPolicy||Core.SOFT_UNCERTAINTY_POLICY,
      skipCondition:extra.skipCondition||Caps.get(capabilityId)?.skipCondition||[],
      next:extra.next||[],
      chatFallback:extra.chatFallback||Caps.get(capabilityId)?.chatFallback||"",
      qcLevel:extra.qcLevel||Caps.get(capabilityId)?.qcLevel||"Q1",
      reviewMode:extra.reviewMode||Caps.get(capabilityId)?.reviewMode||"REVIEW_OPTIONAL",
      status:extra.status||"PENDING",
      branch:extra.branch||"SHARED",
      notes:extra.notes||""
    };
  }

  function compileGenericFlow(project){
    const plan=commonPlan(project);
    const out=[];let prev=[];
    for(let i=0;i<plan.length;i++){
      const item=plan[i],c=Caps.get(item.capabilityId);
      if(!c) continue;
      const id=`PF-${String(i+1).padStart(3,"0")}`;
      const n=node(id,c.name,item.capabilityId,c.defaultExecutor,prev,{
        skipCondition:[...(c.skipCondition||[]),...(item.conditional?["项目/研究结果判断为不需要时自动SKIP"]:[])],
        status:item.conditional?"CONDITIONAL":"PENDING"
      });
      out.push(n); prev=[id];
    }
    return out;
  }

  function compilePreviewDualTest(project){
    const f=[];
    f.push(node("PF-001","直播前项目基线与需求研究","PLAYER_DEMAND_RESEARCH","Work",[],{
      purpose:"直播前只做玩家问题、竞品、官方已公开基线与风险，不提前写完整正文。",
      expectedOutput:["PROJECT_BRIEF.md","PRELIVE_BASELINE.md"],saveAs:["PROJECT_BRIEF.md","PRELIVE_BASELINE.md"],qcLevel:"Q1"
    }));
    f.push(node("PF-002","等待 3.3 Special Program","OFFICIAL_SOURCE_RESEARCH","System",["PF-001"],{
      purpose:"条件节点：等待官方前瞻真正公开；不猜直播内容。",
      when:"官方 3.3 Special Program 正式公开后触发",
      status:"WAITING",
      hardStop:["正式直播尚未公开时不得伪造其内容"],
      expectedOutput:["EVENT_READY"],saveAs:["CURRENT_TASK.md"],
      chatFallback:"无；这是条件等待节点。"
    }));
    f.push(node("PF-003","核验官方 YouTube Master 与字幕","OFFICIAL_SOURCE_RESEARCH","Work",["PF-002"],{
      purpose:"定位并核验 3.3 官方 YouTube 原上传与官方字幕，排除搬运/旧版/错误视频。",
      expectedOutput:["SOURCE_VERIFICATION.md","SOURCE_DOWNLOAD_MANIFEST.md"],saveAs:["SOURCE_VERIFICATION.md","SOURCE_DOWNLOAD_MANIFEST.md"]
    }));
    f.push(node("PF-004","Acquire & Register Official Source","ACQUIRE_REGISTER_OFFICIAL_SOURCE","Codex",["PF-003"],{
      purpose:"下载共享 Master + 官方字幕 + metadata + ffprobe 并登记；不创建 Proxy。",
      skipCondition:["PROXY明确NOT_PLANNED；本节点只获取Master，不执行代理转码"],
      expectedOutput:["3.3_SHARED_MASTER","OFFICIAL_SUBTITLE","DOWNLOAD_REPORT.md","MEDIA_PROBE.json"],saveAs:["DOWNLOAD_REPORT.md","MEDIA_PROBE.json","SOURCE_DOWNLOAD_MANIFEST.md"]
    }));
    f.push(node("PF-005","Codex Local Source Analysis","VIDEO_SOURCE_ANALYSIS","Codex",["PF-004"],{
      purpose:"Codex 直接分析本地 Master 的声音、连续画面、UI、动作与时间戳；PROXY=NOT_PLANNED。",
      skipCondition:["仅当Codex实际无法读取Master且上传条件受限时，才由编译器ADD PROXY_MEDIA"],
      expectedOutput:["SOURCE_ANALYSIS_SHARED_PROGRAM.md"],saveAs:["SOURCE_ANALYSIS_SHARED_PROGRAM.md"],qcLevel:"Q2"
    }));
    f.push(node("PF-006","Shared Program Analysis","MECHANIC_RESEARCH","Work",["PF-005"],{
      purpose:"把共用直播证据整理成两条视频可共享的正式信息、未知边界与角色分流研究问题。",
      expectedOutput:["SHARED_PROGRAM_ANALYSIS.md"],saveAs:["SHARED_PROGRAM_ANALYSIS.md"],qcLevel:"Q2"
    }));
    f.push(node("PF-F01","FIONI Research","MECHANIC_RESEARCH","Work",["PF-006"],{branch:"FIONI",expectedOutput:["FIONI_RESEARCH.md"],saveAs:["FIONI_RESEARCH.md"]}));
    f.push(node("PF-S01","SEVERIAN Research","MECHANIC_RESEARCH","Work",["PF-006"],{branch:"SEVERIAN",expectedOutput:["SEVERIAN_RESEARCH.md"],saveAs:["SEVERIAN_RESEARCH.md"]}));
    f.push(node("PF-F02","FIONI LONG / SHORT / CANCEL Gate","CORE_THESIS","Chat",["PF-F01"],{
      branch:"FIONI",purpose:"按直播后真实信息量决定菲欧妮做长、短或取消；不为了排期硬做长视频。",
      expectedOutput:["FIONI_FORMAT_GATE.md","FIONI_CORE_THESIS.md"],saveAs:["FIONI_FORMAT_GATE.md","FIONI_CORE_THESIS.md"],qcLevel:"Q2",reviewMode:"APPROVAL_REQUIRED"
    }));
    f.push(node("PF-S02","SEVERIAN LONG / SHORT / CANCEL Gate","CORE_THESIS","Chat",["PF-S01"],{
      branch:"SEVERIAN",purpose:"按直播后真实信息量决定赛维里安做长、短或取消。",
      expectedOutput:["SEVERIAN_FORMAT_GATE.md","SEVERIAN_CORE_THESIS.md"],saveAs:["SEVERIAN_FORMAT_GATE.md","SEVERIAN_CORE_THESIS.md"],qcLevel:"Q2",reviewMode:"APPROVAL_REQUIRED"
    }));
    const branches=[["F","FIONI"],["S","SEVERIAN"]];
    for(const [prefix,branch] of branches){
      let prev=[`PF-${prefix}02`];
      const chain=[
        ["03","CONTENT_STRUCTURE","Chat"],["04","SCRIPT_DRAFT","Chat"],["05","SCRIPT_FACT_QC","Work"],
        ["06","SCRIPT_VALUE_QC","Work"],["07","SCRIPT_NATURALNESS_QC","Chat"],["08","SCRIPT_DIFF_REVISION","Chat"],
        ["09","SCRIPT_LOCK_GATE","Human"],["10","READING_SCRIPT","Chat"],["11","AUDIO_MASTER_CAPTURE","Human"],
        ["12","AUDIO_LOCK_GATE","Human"],["13","PRECISE_SRT_ALIGNMENT","Work"],["14","TIMELINE_MASTER","Chat"],
        ["15","VISUAL_DIRECTION","Chat"],["16","SOUND_DESIGN_BLUEPRINT","Chat"],["17","COVER_DESIGN","Chat"],
        ["18","ASSET_GAP_AND_INDEX","Codex"],["19","EDITING_BLUEPRINT","Chat"],["20","CODEX_BUILD","Codex"],
        ["21","FINAL_ASSEMBLY","Human"],["22","PLATFORM_RULE_VERIFICATION","Work"],["23","SIX_PLATFORM_PUBLISH_PACKAGE","Work"]
      ];
      for(const [num,capId,executor] of chain){
        const cap=Caps.get(capId);
        const id=`PF-${prefix}${num}`;
        const n=node(id,`${branch} · ${cap.name}`,capId,executor,prev,{branch});
        if(["SCRIPT_LOCK_GATE","AUDIO_MASTER_CAPTURE","AUDIO_LOCK_GATE","FINAL_ASSEMBLY"].includes(capId)) n.reviewMode="APPROVAL_REQUIRED";
        if(capId==="PRECISE_SRT_ALIGNMENT") n.hardStop=["没有该角色视频最终 AUDIO_MASTER 时 NEED_INPUT"];
        if(capId==="CODEX_BUILD") n.expectedOutput=["FINAL_VIDEO_SILENT.mp4","FINAL_BGM_SFX.wav","BUILD_REPORT.md"];
        f.push(n);prev=[id];
      }
    }
    for(const n of f){
      if(n.promptId==="PF-001") n.next=["PF-002"];
      if(n.promptId==="PF-002") n.next=["PF-003"];
      if(n.promptId==="PF-003") n.next=["PF-004"];
      if(n.promptId==="PF-004") n.next=["PF-005"];
      if(n.promptId==="PF-005") n.next=["PF-006"];
      if(n.promptId==="PF-006") n.next=["PF-F01","PF-S01"];
    }
    return f;
  }

  function buildWorkflow(project){
    const isTest=project.projectId==="ZZZ_3.3_FIONI_SEVERIAN_PREVIEW";
    const flow=isTest?compilePreviewDualTest(project):compileGenericFlow(project);
    project.workflow=flow.map(n=>({promptId:n.promptId,name:n.name,capabilityUsed:n.capabilityUsed,executor:n.executor,dependencies:n.dependencies,branch:n.branch,status:n.status,reviewMode:n.reviewMode,qcLevel:n.qcLevel}));
    project.promptFlow=flow;
    project.flowRevision=(project.flowRevision||0)+1;
    project.updatedAt=now();
    project.history.push({at:now(),action:"PROMPT_FLOW_BUILT",revision:project.flowRevision});
    return project;
  }

  function capabilityPrompt(project,n){
    const c=Caps.get(n.capabilityUsed);
    if(!c) return "";
    const failureText=Failures.render(c.failureRefs);
    const hardStops=[...Core.HARD_STOP_RULES.map(x=>`${x.id}: ${x.when} → ${x.action}`),...(n.hardStop||[])];
    const projectBlock=[
      `PROJECT_ID: ${project.projectId}`,
      `GAME: ${project.game||"UNKNOWN"}`,
      `SERVER: ${project.server||"UNKNOWN"}`,
      `VERSION: ${project.version||"UNKNOWN"}`,
      `PRODUCT_TYPE: ${project.productType||"UNKNOWN"}`,
      `AUTONOMY_LEVEL: ${project.autonomyLevel||"L2"}`,
      project.doNotUse?.length?`DO_NOT_USE: ${project.doNotUse.join(" / ")}`:"",
      project.sharedSources?.length?`SHARED_SOURCE: ${project.sharedSources.join(" / ")}`:""
    ].filter(Boolean).join("\n");
    return `【PROJECT PROMPT NODE · ${n.promptId}｜${n.name}】
【Executor】${n.executor}
【Capability】${c.id} / ${c.name}
【Autonomy】${project.autonomyLevel||"L2"}；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
${projectBlock}

【Purpose】
${n.purpose}

【Dependencies / Read From Previous】
Dependencies: ${n.dependencies.join(", ")||"NONE"}
Read: ${(n.readFromPrevious||[]).join(", ")||"沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件"}

【Required Input】
${(n.requiredInput||[]).map(x=>"- "+x).join("\n")||"- 无额外关键输入"}

【Optional Input】
${(n.optionalInput||[]).map(x=>"- "+x).join("\n")||"- 无"}

【CORE METHOD】
${c.coreMethod.map(x=>"- "+x).join("\n")}

【MANDATORY GUARDRAILS】
${[...c.mandatoryGuardrails,...Core.CORE_RULES.autonomy.hard].map(x=>"- "+x).join("\n")}
${failureText?failureText:""}

【HARD STOP】
${hardStops.map(x=>"- "+x).join("\n")}

【SOFT UNCERTAINTY】
${Core.SOFT_UNCERTAINTY_POLICY.map(x=>"- "+x).join("\n")}

【QUALITY GATE · ${n.qcLevel}】
${(n.qualityGate||[]).map(x=>"- "+x).join("\n")||"- 完成 Q1 自检；无虚假完成状态"}

【Skip Condition】
${(n.skipCondition||[]).map(x=>"- "+x).join("\n")||"- 无"}

【Output / Save As】
${(n.saveAs||[]).map(x=>"- "+x).join("\n")}

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 \`GUCC_NODE_RESULT\` JSON 代码块，至少包含：
{"promptId":"${n.promptId}","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":${n.reviewMode==="APPROVAL_REQUIRED"?"true":"false"}}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
${n.reviewMode==="APPROVAL_REQUIRED"?"本节点完成后等待 Human Approval。":"本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。"}
${n.chatFallback?`\n【CHAT_FALLBACK】\n${n.chatFallback}`:""}`;
  }

  function compilePromptFlow(project){
    if(!project.promptFlow?.length) buildWorkflow(project);
    project.promptFlow=project.promptFlow.map(n=>({...n,prompt:n.isCompiledExternal&&typeof n.prompt==="string"&&n.prompt.trim()?n.prompt:capabilityPrompt(project,n)}));
    return project.promptFlow;
  }

  function depsDone(project,n){
    const map=Object.fromEntries((project.promptFlow||[]).map(x=>[x.promptId,x]));
    return (n.dependencies||[]).every(id=>["DONE","SKIPPED"].includes(map[id]?.status));
  }

  function currentTask(project){
    if(!project.promptFlow?.length) buildWorkflow(project);
    const nodes=project.promptFlow;
    // Prefer actionable work on the other video branch while a Q3 approval or
    // external condition is waiting. A WAITING node never globally blocks
    // unrelated branches. Dependencies still remain strict.
    const runnable=nodes.find(n=>["PENDING","CONDITIONAL"].includes(n.status)&&depsDone(project,n));
    if(runnable)return {...runnable,prompt:runnable.isCompiledExternal&&runnable.prompt?runnable.prompt:capabilityPrompt(project,runnable),reason:"所需前置任务已完成，可以执行当前节点。"};
    const waiting=nodes.find(n=>n.status==="WAITING"&&depsDone(project,n));
    if(waiting)return {...waiting,prompt:waiting.isCompiledExternal&&waiting.prompt?waiting.prompt:capabilityPrompt(project,waiting),reason:"目前需要处理外部条件或人工批准；其他分支没有更早的可执行任务。"};
    const incomplete=nodes.some(n=>!["DONE","SKIPPED"].includes(n.status));
    if(incomplete)return {promptId:"BLOCKED_DEPENDENCY",name:"检查前置依赖",executor:"Chat",reason:"仍有未完成节点，但依赖尚未满足。请检查相关节点回执、Skip条件与LOCK，不要直接标记完成。",prompt:""};
    return {promptId:"COMPLETE",name:"Prompt Flow 已完成",executor:"Human",reason:"没有待执行节点。",prompt:""};
  }

  function markNode(project,promptId,status){
    const n=(project.promptFlow||[]).find(x=>x.promptId===promptId);
    if(!n) throw new Error("Unknown promptId: "+promptId);
    n.status=status;
    project.updatedAt=now();
    project.history.push({at:now(),action:"NODE_STATUS",promptId,status});
    return currentTask(project);
  }

  function updatePromptFlow(project,ops=[]){
    const flow=project.promptFlow||[];
    for(const op of ops){
      const type=String(op.op||"").toUpperCase();
      const idx=flow.findIndex(x=>x.promptId===op.promptId);
      if(type==="REMOVE"&&idx>=0) flow.splice(idx,1);
      else if(type==="SKIP"&&idx>=0) flow[idx].status="SKIPPED";
      else if(type==="REPLACE"&&idx>=0) flow[idx]={...flow[idx],...op.node,promptId:flow[idx].promptId};
      else if(type==="ADD"&&op.node) flow.splice(Number.isInteger(op.index)?op.index:flow.length,0,op.node);
      else if(type==="REORDER"&&idx>=0){const [item]=flow.splice(idx,1);flow.splice(Math.max(0,Math.min(flow.length,op.toIndex||0)),0,item);}
      else if(type==="MERGE"&&Array.isArray(op.promptIds)&&op.node){
        const positions=op.promptIds.map(id=>flow.findIndex(x=>x.promptId===id)).filter(i=>i>=0).sort((a,b)=>a-b);
        if(positions.length){const insert=positions[0];for(let i=positions.length-1;i>=0;i--)flow.splice(positions[i],1);flow.splice(insert,0,op.node);}
      }
    }
    project.flowRevision=(project.flowRevision||0)+1;
    project.history.push({at:now(),action:"PROMPT_FLOW_DIFF",revision:project.flowRevision,ops:clone(ops)});
    compilePromptFlow(project);
    return project;
  }

  function projectBriefMd(project){
    if(project.projectBriefMarkdown)return project.projectBriefMarkdown;
    return `# PROJECT_BRIEF\n\n- PROJECT_ID: ${project.projectId}\n- NAME: ${project.name}\n- IDEA: ${project.idea}\n- GAME: ${project.game||"UNKNOWN"}\n- SERVER: ${project.server||"UNKNOWN"}\n- VERSION: ${project.version||"UNKNOWN"}\n- PRODUCT_TYPE: ${project.productType}\n- AUTONOMY_LEVEL: ${project.autonomyLevel}\n\n## Why\n- 玩家为什么点：由 Project Builder / Research 补全\n- 看完解决什么：由 Project Builder / Research 补全\n- 信息增量：UNKNOWN（直到真实研究完成）\n\n## Status\n- 当前仅为项目定义 / 编排，不代表已完成视频研究或制作。\n`;
  }

  function videoContractMd(project){
    const base=`# VIDEO_CONTRACT\n\n- PROJECT_ID: ${project.projectId}\n- PROJECT_NAME: ${project.name}\n- GAME: ${project.game||"UNKNOWN"}\n- SERVER: ${project.server||"UNKNOWN"}\n- VERSION: ${project.version||"UNKNOWN"}\n- DATA_CUTOFF: ${project.dataCutoff||"UNKNOWN"}\n- PRODUCT_TYPE: ${project.productType||"UNKNOWN"}\n- FORMAT: ${project.format||"UNKNOWN"}\n- AUTONOMY_LEVEL: ${project.autonomyLevel||"L2"}\n- CURRENT_STAGE: ${project.currentStage}\n\n## VERIFIED_FACTS\n${(project.verifiedFacts||[]).map(x=>"- "+x).join("\n")||"- NONE"}\n\n## REASONED_ANALYSIS\n${(project.reasonedAnalysis||[]).map(x=>"- "+x).join("\n")||"- NONE"}\n\n## UNKNOWNS\n${(project.unknowns||[]).map(x=>"- "+x).join("\n")||"- NONE"}\n\n## DO_NOT_USE\n${(project.doNotUse||[]).map(x=>"- "+x).join("\n")||"- NONE"}\n\n## PRODUCTION_NEEDS\n${Object.entries(project.productionNeeds||{}).map(([k,v])=>`- ${k}: ${v}`).join("\n")||"- UNKNOWN"}\n`;
    // Preserve AI-researched fields not yet modeled in the compact UI;
    // never silently discard CORE_PLAYER_QUESTION / CORE_THESIS / CONTENT_INCREMENT.
    return base+(project.rawVideoContract?
      "\n\n## IMPORTED_CONTRACT_FULL_JSON\n\n```json\n"+JSON.stringify(project.rawVideoContract,null,2)+"\n```\n":
      "");
  }

  function workflowMd(project){
    if(!project.workflow?.length) buildWorkflow(project);
    return "# PROJECT_WORKFLOW\n\n"+project.workflow.map((n,i)=>`${i+1}. **${n.name}** · ${n.executor} · ${n.capabilityUsed} · ${n.status}${n.branch&&n.branch!=="SHARED"?` · ${n.branch}`:""}`).join("\n");
  }

  function promptFlowMd(project){
    compilePromptFlow(project);
    return "# PROJECT_PROMPT_FLOW\n\n"+project.promptFlow.map(n=>`## ${n.promptId}｜${n.name}\n\n- EXECUTOR: ${n.executor}\n- DEPENDENCIES: ${n.dependencies.join(", ")||"NONE"}\n- CAPABILITY: ${n.capabilityUsed}\n- QC: ${n.qcLevel}\n- REVIEW: ${n.reviewMode}\n- STATUS: ${n.status}\n- SAVE_AS: ${n.saveAs.join(", ")}\n\n### PROMPT\n\n\`\`\`text\n${n.prompt}\n\`\`\`\n`).join("\n");
  }

  function currentTaskMd(project){
    const n=currentTask(project);
    return `# CURRENT_TASK\n\n- PROMPT_ID: ${n.promptId}\n- NAME: ${n.name}\n- EXECUTOR: ${n.executor}\n- WHY_NOW: ${n.reason||n.purpose||""}\n- REQUIRED_INPUT: ${(n.requiredInput||[]).join(" / ")||"NONE"}\n- EXPECTED_OUTPUT: ${(n.expectedOutput||[]).join(" / ")||"NONE"}\n- QUALITY_GATE: ${(n.qualityGate||[]).join(" / ")||n.qcLevel||""}\n- REVIEW_MODE: ${n.reviewMode||""}\n\n## PROMPT\n\n${n.prompt||""}\n`;
  }

  function buildCreateProjectPrompt(input){
    const project=input&&typeof input==="object"?input:{idea:String(input||"")};
    const idea=String(project.idea||"").trim();
    const known=[
      ["游戏",project.game],["区服",project.server],["版本",project.version],["内容类型",project.productType]
    ].filter(([,value])=>value!=null&&String(value).trim()&&!["UNKNOWN","CURRENT"].includes(String(value).trim().toUpperCase()))
      .map(([key,value])=>"- "+key+"："+String(value).trim()).join("\n");
    return `【GameUp Creator OS｜Create Project】
默认 AUTONOMY_LEVEL=L2。用户只提供自然语言想法；你负责主动研究和补全普通字段。

用户原始想法（这是需求描述，绝对不要整段当作项目名称）：
${idea}

用户明确补充的信息（未提供的字段由你研究，不能猜）：
${known||"- 无"}

请执行 PROJECT_BUILDER：
1. 研究玩家为什么现在会点、看完解决什么、竞品饱和/缺口与信息增量。
2. 给 GO/HOLD/SHORT/MERGE/CANCEL；普通未知用 UNKNOWN，不频繁追问。
3. 提出一个简洁、可辨识的 PROJECT_NAME 和人类可读 PROJECT_ID。项目名称要提炼具体题材与核心方向，不能复制长段用户想法；不加随机哈希。需要讨论多个方向时分别标注。
4. 生成 PROJECT_BRIEF.md + VIDEO_CONTRACT.md。VIDEO_CONTRACT 至少包含 PROJECT_NAME/PROJECT_ID/GAME/SERVER/VERSION/DATA_CUTOFF/PRODUCT_TYPE/FORMAT/PLATFORMS/CORE_PLAYER_QUESTION/CONTENT_INCREMENT/CORE_THESIS/VERIFIED_FACTS/REASONED_ANALYSIS/UNKNOWNS/DO_NOT_USE/OFFICIAL_TERMINOLOGY/AVAILABLE_ARTIFACTS/LOCKED_ARTIFACTS/PRODUCTION_NEEDS/CURRENT_STAGE/AUTONOMY_LEVEL/NEXT_HANDOFF。
5. HARD STOP 只用于继续会制造虚假事实/时间线/写入状态的关键缺失；普通缺项继续。
6. 不开始下游视频制作。

最终额外输出一个 JSON 代码块，字段与 VIDEO_CONTRACT 对应，并明确包含 PROJECT_NAME、PROJECT_ID，便于导入 Project System。
`;
  }

  function buildFlowCompilerPrompt(project){
    return `【GameUp Creator OS｜BUILD PROJECT PROMPT FLOW】\n读取当前 PROJECT_BRIEF + VIDEO_CONTRACT + Core Rules + Capability Library + Failure Prevention + 已有素材。\n不要机械复制01～07；01～07只做人类生命周期地图。\n\n当前项目：\n${videoContractMd(project)}\n\n请：\n- 为该项目选择最少但足够的 Capability；Proxy/Pixel/补录/Final AI QC均为条件能力。\n- 减少同Executor、同输入、低认知价值的人工中转；保留机制判断、核心命题、Script、SCRIPT_LOCK、真实Timeline、重大格式Gate、最终成片等高价值检查点。\n- Work/Codex不可用时为每个节点给CHAT_FALLBACK；长任务按Chat能力拆成连续子Prompt。\n- 生成 PROJECT_WORKFLOW.md 与 PROJECT_PROMPT_FLOW.md；每个Node必须含 PROMPT_ID/NAME/PURPOSE/EXECUTOR/WHEN/DEPENDENCIES/REQUIRED_INPUT/OPTIONAL_INPUT/READ_FROM_PREVIOUS/CAPABILITY_USED/完整PROMPT/EXPECTED_OUTPUT/SAVE_AS/QUALITY_GATE/HARD_STOP/SOFT_UNCERTAINTY_POLICY/SKIP_CONDITION/NEXT/CHAT_FALLBACK。\n- REVIEW_OPTIONAL不阻塞；APPROVAL_REQUIRED只用于重大方向、LOCK、必须人类输入、最终成片与发布。\n- 不执行任何视频下游Node。\n- 在两个 Markdown 后附 GUCC_FLOW_RESULT JSON代码块：{"projectId":"...","promptFlow":[...]}；每个Node必须含完整可复制prompt正文、dependencies、capabilityUsed、executor、status、reviewMode、qcLevel、saveAs及其余要求字段，不能只放摘要。该JSON用于导回工作台。\n`;
  }

  function updateFlowPrompt(project){
    return `【GameUp Creator OS｜UPDATE PROJECT PROMPT FLOW】\n基于当前 VIDEO_CONTRACT、已有 PROJECT_PROMPT_FLOW 与新变化做 DIFF MODE 更新。只允许 ADD / REMOVE / MERGE / SKIP / REORDER / REPLACE。\n不要整套推翻；保留已完成Node、成熟Capability Guardrail和Lock。普通变化AI自动调整，重大方向变化才请求Human Approval。\n\n当前项目：${project.projectId}\nFlow revision: ${project.flowRevision}\n当前节点数: ${project.promptFlow?.length||0}\n`;
  }

  return {
    VERSION,STORAGE_KEY,EXECUTORS,
    createProject,testFixture,buildWorkflow,compilePromptFlow,currentTask,markNode,updatePromptFlow,
    capabilityPrompt,projectBriefMd,videoContractMd,workflowMd,promptFlowMd,currentTaskMd,
    buildCreateProjectPrompt,buildFlowCompilerPrompt,updateFlowPrompt,humanProjectId
  };
});
