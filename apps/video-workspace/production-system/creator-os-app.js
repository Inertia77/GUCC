(function(){
"use strict";
const Core=window.GuccCreatorCoreRules;
const Caps=window.GuccCreatorCapabilities;
const Fail=window.GuccCreatorFailurePrevention;
const O=window.GuccCreatorOrchestrator;
const $=(id)=>document.getElementById(id);
const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let migration=[];
let store=load();
const linkedProjectId=new URLSearchParams(window.location.search).get("project")||"";
if(linkedProjectId&&store.projects.some(p=>p.projectId===linkedProjectId)){
  store.selectedProjectId=linkedProjectId;
}
let activeView="system";
let toastTimer;
let flowExpanded=false;
let selectedNodePrompt="";

function provisionalProjectName(data){
  const meta=[data.game,data.version].map(x=>String(x||"").trim()).filter(Boolean).join(" ");
  return meta?meta+" · 待 AI 定名":"待 AI 定名的项目";
}

function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(O.STORAGE_KEY)||"null");
    if(raw&&Array.isArray(raw.projects)){
      // TEST_FIXTURE is an internal QA scenario, never a published Creator Project.
      const projects=raw.projects.filter(p=>p&&p.status!=="TEST_FIXTURE").map(p=>
        p.status==="DRAFT"&&p.idea&&p.name===p.idea
          ? {...p,name:provisionalProjectName(p)} : p);
      const selected=projects.find(p=>p.projectId===raw.selectedProjectId&&projectLife(p)==="active");
      return {projects,selectedProjectId:selected?.projectId||projects.find(p=>projectLife(p)==="active")?.projectId||""};
    }
  }catch(e){console.warn("Creator OS store loaded without QA fixture",e);}
  return {projects:[],selectedProjectId:""};
}
function save(broadcast=true){
  localStorage.setItem(O.STORAGE_KEY,JSON.stringify(store));
  if(broadcast)window.dispatchEvent(new CustomEvent("gucc:creator-os:saved",{detail:{projectId:store.selectedProjectId}}));
}
function current(){return store.projects.find(p=>p.projectId===store.selectedProjectId&&p.status!=="TEST_FIXTURE")||null;}
function notify(msg){$("toast").textContent=msg;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,2600);}
async function copy(text){try{await navigator.clipboard.writeText(text);notify("已复制");return true;}catch{notify("复制失败，请手动选择");return false;}}
function listText(arr){return (arr||[]).length?(arr||[]).map(x=>"• "+x).join("\n"):"—";}
function download(name,text,type="application/json"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);}

function currentTaskFor(p){
  if(!p)return {promptId:"—",name:"目前没有进行中的视频项目",executor:"—",reason:"正式项目都已完成、归档或移入回收站。可新建项目，或在「项目档案」中打开并恢复已有项目。",requiredInput:[],expectedOutput:[],qcLevel:"—",reviewMode:"REVIEW_OPTIONAL",prompt:"",status:"INACTIVE"};
  const life=projectLife(p);
  if(life!=="active"){
    const labels={completed:"项目已完成",archived:"项目已归档",trash:"项目位于回收站"};
    return {promptId:"—",name:labels[life],executor:"—",reason:"此项目当前不在制作队列中。请前往「项目档案」恢复为进行中，再继续制作。",requiredInput:[],expectedOutput:[],qcLevel:"—",reviewMode:"REVIEW_OPTIONAL",prompt:"",status:"INACTIVE"};
  }
  // Project definition must always precede workflow execution, even if an earlier UI action generated a generic template.
  if(p.status==="DRAFT"||p.status==="IMPORTED_LEGACY"){
    return {promptId:"PROJECT_BUILDER",name:"建立项目事实与制作方向",executor:"Work / Chat",reason:"当前仍是原始想法草稿。先让 AI 研究并输出 VIDEO_CONTRACT，之后才能编排制作任务。",requiredInput:[p.idea||p.name],expectedOutput:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md","VIDEO_CONTRACT JSON"],qcLevel:"Q2",reviewMode:"REVIEW_OPTIONAL",prompt:O.buildCreateProjectPrompt(p),status:"PENDING"};
  }
  if(p.status==="BRIEF_READY"||p.status==="BRIEF_REVIEW"){
    return p.status==="BRIEF_READY"
      ? {promptId:"PROMPT_FLOW_COMPILER",name:"编译项目专属 Prompt Flow",executor:"Chat / Work",reason:"立项结果已导入。请先编排项目专属制作路线。",requiredInput:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],expectedOutput:["PROJECT_WORKFLOW.md","PROJECT_PROMPT_FLOW.md","GUCC_FLOW_RESULT JSON"],qcLevel:"Q2",reviewMode:"REVIEW_OPTIONAL",prompt:O.buildFlowCompilerPrompt(p),status:"PENDING"}
      : {promptId:"PROJECT_BRIEF_APPROVAL",name:"确认项目方向",executor:"Human",reason:"请核对项目方向和事实边界。",requiredInput:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],expectedOutput:["已批准的立项方向"],qcLevel:"Q3",reviewMode:"APPROVAL_REQUIRED",prompt:O.videoContractMd(p),status:"WAITING"};
  }
  if(!p.promptFlow?.length){
    if(p.status==="BRIEF_REVIEW"){
      return {promptId:"PROJECT_BRIEF_APPROVAL",name:"确认项目方向",executor:"Human",reason:"AI 的立项结果已导入。请只审查 GO/SHORT/HOLD 方向、核心命题和事实边界；其他普通字段由系统处理。",requiredInput:["PROJECT_BRIEF","VIDEO_CONTRACT"],expectedOutput:["已确认的立项方向"],qcLevel:"Q3",reviewMode:"APPROVAL_REQUIRED",prompt:O.videoContractMd(p),status:"WAITING"};
    }
    if(p.status==="BRIEF_READY"){
      return {promptId:"PROMPT_FLOW_COMPILER",name:"编译项目专属 Prompt Flow",executor:"Chat / Work",reason:"已导入立项结果。现在根据成熟 Capability、事实边界与项目目标编排执行顺序。",requiredInput:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],expectedOutput:["PROJECT_WORKFLOW.md","PROJECT_PROMPT_FLOW.md","GUCC_FLOW_RESULT JSON"],qualityGate:["Q2：完整 Prompt/Guardrail/依赖"],reviewMode:"REVIEW_OPTIONAL",prompt:O.buildFlowCompilerPrompt(p),status:"PENDING"};
    }
    return {promptId:"PROJECT_BUILDER",name:"建立项目事实与制作方向",executor:"Work / Chat",reason:"输入自然语言想法，让 AI 研究需求、定义项目并返回 VIDEO_CONTRACT。",requiredInput:[p.idea||p.name],expectedOutput:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],qualityGate:["Q2：立项与事实边界"],reviewMode:"APPROVAL_REQUIRED",prompt:O.buildCreateProjectPrompt(p),status:"PENDING"};
  }
  return O.currentTask(p);
}

function render(){
  renderNav();
  renderProjectBar();
  renderSystem();
  if(activeView==="core")renderCore();
  if(activeView==="capabilities")renderCapabilities();
  if(activeView==="projects")renderProjects();
  window.dispatchEvent(new CustomEvent("gucc:creator-os:rendered"));
}
function renderNav(){
  document.querySelectorAll(".os-nav button[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===activeView));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+activeView));
}
function projectLife(p){
  if(p?.deletedAt)return "trash";
  if(p?.archivedAt)return "archived";
  if(p?.completedAt)return "completed";
  return "active";
}
function lifeName(p){
  return ({active:"进行中",completed:"已完成",archived:"已归档",trash:"回收站"})[projectLife(p)];
}
function selectActiveAfterMove(id){
  if(store.selectedProjectId!==id)return;
  store.selectedProjectId=store.projects.find(p=>p.projectId!==id&&projectLife(p)==="active"&&p.status!=="TEST_FIXTURE")?.projectId||"";
}
function renderProjectBar(){
  const sel=$("projectSelect");sel.replaceChildren();
  const visible=store.projects.filter(p=>p.status!=="TEST_FIXTURE"&&
    (projectLife(p)==="active"||p.projectId===store.selectedProjectId));
  if(!visible.length){
    const option=document.createElement("option");
    option.value="";option.textContent="暂无进行中的项目 · 请新建或恢复";
    sel.append(option);sel.disabled=true;sel.value="";
    return;
  }
  sel.disabled=false;
  for(const p of visible){
    const option=document.createElement("option");
    option.value=p.projectId;
    option.textContent=`${projectLife(p)!=="active"?"["+lifeName(p)+"] ":p.status==="DRAFT"?"[待立项] ":""}${p.name}`;
    sel.append(option);
  }
  sel.value=store.selectedProjectId;
}

function renderSystem(){
  const p=current();
  $("projectName").textContent=p?.name||"尚未选择项目";
  $("projectName").closest(".project-summary")?.classList.toggle("is-empty",!p);
  const ideaPreview=$("projectIdeaPreview");
  ideaPreview.hidden=!(p?.status==="DRAFT"&&p.idea);
  ideaPreview.textContent=p?.status==="DRAFT"&&p.idea?"原始想法："+p.idea:"";
  $("projectMeta").innerHTML=p?[
    ["PROJECT ID",p.projectCode||(p.status==="DRAFT"?"草稿 · 等待 AI 定名":p.projectId)],["GAME",p.game||"UNKNOWN"],["VERSION",p.version||"UNKNOWN"],
    ["SERVER",p.server||"UNKNOWN"],["AUTONOMY",p.autonomyLevel||"L2"],["FLOW",`R${p.flowRevision||0}`],["LIFECYCLE",lifeName(p)]
  ].map(([k,v])=>`<div><b>${esc(k)}</b>${esc(v)}</div>`).join(""):"<p class='subtitle'>当前没有进行中项目。请打开「项目档案」恢复已有项目，或新建项目。</p>";
  const videos=Array.isArray(p?.videos)?p.videos:[];
  $("videoBranches").innerHTML=videos.length?videos.map(v=>`<div class="branch-row"><span>${esc(v.name||v.videoId||"Video")}</span><span>${esc(v.decision||"PENDING")}</span></div>`).join(""):"";
  const t=currentTaskFor(p);
  $("currentTaskId").textContent=t.promptId||"—";
  $("currentTaskName").textContent=t.name||"—";
  $("currentExecutor").textContent=t.executor||"—";
  $("currentTaskReason").textContent=t.reason||t.purpose||"";
  $("currentInputs").textContent=listText(t.requiredInput);
  $("currentOutputs").textContent=listText(t.expectedOutput||t.saveAs);
  $("currentQc").textContent=t.qcLevel||"Q2";
  $("currentReview").textContent=t.status==="INACTIVE"?"未安排":t.reviewMode==="APPROVAL_REQUIRED"?"需要人工批准":"可自动继续";
  $("currentPrompt").textContent=t.prompt||"";
  const canExecute=Boolean(p&&projectLife(p)==="active");
  const hasApprovedBrief=canExecute&&!["DRAFT","IMPORTED_LEGACY"].includes(p.status);
  $("copyBuildFlowPrompt").disabled=!hasApprovedBrief;
  $("buildFlowBtn").disabled=!hasApprovedBrief;
  $("copyUpdateFlowPrompt").disabled=!canExecute||!p?.promptFlow?.length;
  $("copyWorkflowBtn").disabled=!p?.promptFlow?.length;
  $("copyContractBtn").disabled=!p;
  $("copyCurrentPrompt").disabled=!canExecute||!t.prompt;
  const awaiting=canExecute&&(Boolean(p.promptFlow?.length)||t.promptId==="PROJECT_BRIEF_APPROVAL")&&t.status==="WAITING"&&t.promptId!=="COMPLETE";
  $("markDoneBtn").disabled=!awaiting;
  $("markDoneBtn").textContent=t.promptId==="PROJECT_BRIEF_APPROVAL"?"批准立项方向":
    t.capabilityUsed==="OFFICIAL_SOURCE_RESEARCH"&&t.executor==="System"?"确认官方节目已发布":"已审核 · 确认通过";
  $("skipTaskBtn").disabled=!canExecute||!p?.promptFlow?.length||t.status!=="CONDITIONAL";
  $("applyResultBtn").disabled=!canExecute||t.promptId==="COMPLETE";
  $("flowRevision").textContent=`REV ${p?.flowRevision||0}`;
  $("currentTaskName").closest(".current-task-panel")?.classList.toggle("is-empty",t.status==="INACTIVE");
  renderFlow(p);
  $("productionMap").innerHTML=Core.HUMAN_PRODUCTION_MAP.map(s=>`<div class="map-step"><b>${s.id}</b><strong>${esc(s.name)}</strong><small>${esc(s.meaning)}</small></div>`).join("");
}
function renderFlow(p){
  const box=$("flowList");box.replaceChildren();
  const nodes=!p||["DRAFT","IMPORTED_LEGACY","BRIEF_READY","BRIEF_REVIEW"].includes(p.status)?[]:(p.promptFlow||[]);
  const total=nodes.length;
  const done=nodes.filter(n=>["DONE","SKIPPED"].includes(n.status)).length;
  $("flowNodeCount").textContent=total?`— ${done} / ${total}`:"";
  const toggle=$("toggleFlowBtn");
  toggle.disabled=total<7;
  toggle.setAttribute("aria-expanded",String(flowExpanded));
  toggle.innerHTML=flowExpanded?'收起路线 <span aria-hidden="true">⌃</span>':'查看完整路线 <span aria-hidden="true">⌄</span>';
  if(!total){
    const empty=document.createElement("p");empty.className="flow-empty";
    empty.textContent=!p?"当前没有进行中项目。可在项目档案恢复已有项目，或新建项目。":projectLife(p)!=="active"?"此项目目前未处于进行中，制作任务暂停。":["DRAFT","IMPORTED_LEGACY"].includes(p.status)?"目前还是项目想法草稿。请先复制 Project Builder Prompt，完成 AI 立项后再生成制作路线。":"尚未导入项目专属执行流。请先让 AI 编排，再导入 GUCC_FLOW_RESULT。";
    box.append(empty);return;
  }
  const currentTask=currentTaskFor(p);
  const activeIndex=Math.max(0,nodes.findIndex(n=>n.promptId===currentTask.promptId));
  const start=Math.max(0,activeIndex-1);
  const visible=flowExpanded?nodes:nodes.slice(start,Math.min(nodes.length,start+6));
  const statusName={DONE:"已完成",SKIPPED:"已跳过",PENDING:"待执行",CONDITIONAL:"条件任务",WAITING:"等待",NEED_INPUT:"需要输入"};
  for(const n of visible){
    const row=document.createElement("div");
    row.className="flow-node"+(n.promptId===currentTask.promptId?" current":"");
    row.tabIndex=0;row.setAttribute("role","button");
    row.setAttribute("aria-label",`查看 ${n.promptId} ${n.name} 的完整 Prompt`);
    row.dataset.id=n.promptId;
    row.innerHTML=`<span class="id">${esc(n.promptId)}</span><div><strong>${esc(n.name)}</strong><br><small>${esc(n.capabilityUsed)}</small></div><span class="executor">${esc(n.executor)}</span><span class="status ${esc(n.status)}">${esc(statusName[n.status]||n.status)}</span><span class="branch">${esc(n.branch||"")}</span>`;
    const open=()=>{
      selectedNodePrompt=n.prompt||O.capabilityPrompt(p,n);
      $("nodePreviewTitle").textContent=n.name;
      $("nodePreviewMeta").textContent=`${n.promptId} · ${n.executor} · ${n.qcLevel||"Q1"} · ${n.reviewMode||"REVIEW_OPTIONAL"}`;
      $("nodePreview").textContent=selectedNodePrompt;
      $("nodeDialog").showModal();
    };
    row.addEventListener("click",open);
    row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
    box.append(row);
  }
  if(!flowExpanded&&start+visible.length<total){
    const more=document.createElement("p");more.className="flow-empty";
    more.textContent=`另有 ${total-start-visible.length} 个后续节点；任务完成后自动展示接下来的内容。`;
    box.append(more);
  }
}
function renderCore(){
  $("autonomyGrid").innerHTML=Object.entries(Core.AUTONOMY_LEVELS).map(([k,v])=>`<article class="panel"><span class="micro">${k}</span><h3>${esc(v.label)}</h3><p class="subtitle">${esc(v.summary)}</p></article>`).join("");
  $("coreRuleGrid").innerHTML=Object.values(Core.CORE_RULES).map(s=>`<article class="panel rule-card"><h3>${esc(s.title)}</h3><h4 class="hard">Hard</h4><ul>${s.hard.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h4 class="best">Best Practice</h4><ul>${s.best.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></article>`).join("");
  $("hardStopList").innerHTML=Core.HARD_STOP_RULES.map(x=>`<div class="failure-item"><code>${esc(x.id)}</code> · <strong>${esc(x.action)}</strong> · ${esc(x.when)}<br><span class="subtitle">${esc(x.reason)}</span></div>`).join("");
  $("failureList").innerHTML=Object.entries(Fail.LIBRARY).map(([cat,items])=>`<div class="failure-block"><h4>${esc(cat)}</h4>${items.map(x=>`<div class="failure-item"><code>${esc(x.id)}</code> <span class="status ${x.level==="HARD_CONSTRAINT"?"WAITING":"PENDING"}">${esc(x.level)}</span><br>${esc(x.rule)}</div>`).join("")}</div>`).join("");
}
function renderCapabilities(){
  const domain=$("capDomain"),currentValue=domain.value;
  if(!domain.options.length){domain.add(new Option("全部 Domain",""));for(const d of Caps.DOMAINS)domain.add(new Option(d,d));}
  if(currentValue)domain.value=currentValue;
  const q=$("capSearch").value.trim().toLowerCase(),d=domain.value;
  const list=Caps.list(d).filter(c=>!q||[c.id,c.name,c.domain,...c.legacyPromptIds].join(" ").toLowerCase().includes(q));
  $("capabilityGrid").innerHTML=list.map(c=>`<details class="cap-card"><summary><span class="cap-id">${esc(c.id)}</span><strong>${esc(c.name)}</strong><span>${esc(c.defaultExecutor)}</span><span class="qc">${esc(c.qcLevel)}</span></summary><div class="cap-body"><section><h4>PURPOSE</h4><p>${esc(c.purpose)}</p><h4>WHEN TO USE</h4><ul>${c.whenToUse.map(x=>`<li>${esc(x)}</li>`).join("")||"<li>按项目判断</li>"}</ul><h4>WHEN NOT TO USE</h4><ul>${c.whenNotToUse.map(x=>`<li>${esc(x)}</li>`).join("")||"<li>无固定禁止</li>"}</ul></section><section><h4>CORE METHOD</h4><ul>${c.coreMethod.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h4>QUALITY GATE</h4><ul>${c.qualityGate.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section><section><h4>REQUIRED INPUT</h4><ul>${c.requiredInput.map(x=>`<li>${esc(x)}</li>`).join("")||"<li>按上下文</li>"}</ul><h4>OUTPUT</h4><ul>${c.outputSchema.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section><section><h4>EXECUTION</h4><p>Default: <strong>${esc(c.defaultExecutor)}</strong><br>Alternative: ${esc(c.alternativeExecutor.join(" / ")||"—")}<br>Review: ${esc(c.reviewMode)}</p><h4>CHAT FALLBACK</h4><p>${esc(c.chatFallback||"同一 Chat 按成熟方法执行；无法访问真实输入时不冒充完成。")}</p><h4>LEGACY</h4><p>${esc(c.legacyPromptIds.join(", ")||"—")}</p></section></div></details>`).join("");
}
function renderProjects(){
  const selected=current();
  const q=($("projectSearch")?.value||"").trim().toLowerCase();
  const filter=$("projectArchiveFilter")?.value||"active";
  const counts={active:0,completed:0,archived:0,trash:0};
  store.projects.filter(p=>p.status!=="TEST_FIXTURE").forEach(p=>counts[projectLife(p)]++);
  const matching=store.projects.filter(p=>p.status!=="TEST_FIXTURE"
    &&(!q||[p.name,p.game,p.version,p.projectId,p.projectCode].join(" ").toLowerCase().includes(q))
    &&(filter==="all"?projectLife(p)!=="trash":projectLife(p)===filter));
  $("projectCounts").textContent=`进行中 ${counts.active} · 已完成 ${counts.completed} · 归档 ${counts.archived} · 回收站 ${counts.trash}`;
  $("projectCards").innerHTML=matching.map(p=>{
    const progress=(p.promptFlow||[]).filter(n=>["DONE","SKIPPED"].includes(n.status)).length;
    const total=p.promptFlow?.length||0;
    return `<article class="panel project-card ${p.projectId===store.selectedProjectId?"active":""}" data-project="${esc(p.projectId)}">
      <span class="micro">${esc(p.projectCode||p.projectId)}</span>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.game||"未设定游戏")} · ${esc(p.version||"未设定版本")} · ${lifeName(p)} · ${progress}/${total} 节点</p>
    </article>`;
  }).join("")||'<p class="flow-empty">此筛选下暂无项目。</p>';
  document.querySelectorAll(".project-card").forEach(card=>card.addEventListener("click",()=>{
    store.selectedProjectId=card.dataset.project;
    $("artifactPreview").textContent="";save();render();
  }));
  const enabled=Boolean(selected&&selected.status!=="TEST_FIXTURE");
  $("completeCurrentProject").disabled=!enabled||Boolean(selected?.deletedAt);
  $("completeCurrentProject").textContent=selected?.completedAt?"重新设为进行中":"标记已完成";
  $("archiveCurrentProject").disabled=!enabled||Boolean(selected?.deletedAt);
  $("archiveCurrentProject").textContent=selected?.archivedAt?"取消归档":"归档项目";
  $("deleteCurrentProject").disabled=!enabled;
  $("deleteCurrentProject").textContent=selected?.deletedAt?"从回收站恢复":"删除项目";
  if(!$("artifactPreview").textContent&&selected)
    $("artifactPreview").textContent=localCurrentTaskMd(selected);
  if($("migrationTable"))$("migrationTable").innerHTML=migration.length
    ?migration.map(m=>`<div class="migration-row"><code>${esc(m.legacyPromptId)}</code><strong>${esc(m.disposition)}</strong><span>${esc((m.capabilities||[]).join(" + "))}</span></div>`).join("")
    :"";
}

function localCurrentTaskMd(p){
  const t=currentTaskFor(p);
  return `# CURRENT_TASK\n\n- PROMPT_ID: ${t.promptId}\n- NAME: ${t.name}\n- EXECUTOR: ${t.executor}\n- STATUS: ${t.status||"PENDING"}\n\n## PROMPT\n\n${t.prompt||""}\n`;
}
function showArtifact(kind){
  const p=current();if(!p)return;
  if(["workflow","flow"].includes(kind)&&!p.promptFlow?.length){
    $("artifactPreview").textContent="尚未完成项目专属流程编排。请先导入 AI 立项结果，再生成 GUCC_FLOW_RESULT。";
    return;
  }
  const map={brief:O.projectBriefMd,contract:O.videoContractMd,workflow:O.workflowMd,flow:O.promptFlowMd,task:localCurrentTaskMd};
  $("artifactPreview").textContent=(map[kind]||localCurrentTaskMd)(p);
}
function newDraftId(){
  const base="DRAFT-"+Date.now();
  let id=base,serial=1;
  while(store.projects.some(p=>p.projectId===id))id=base+"-"+(++serial);
  return id;
}
async function createDraft(data){
  const p=O.createProject({
    ...data,
    projectId:newDraftId(),
    name:provisionalProjectName(data),
    productType:data.productType||"UNKNOWN"
  });
  store.projects.unshift(p);
  store.selectedProjectId=p.projectId;
  save();render();
  const prompt=O.buildCreateProjectPrompt(p);
  $("currentPrompt").textContent=prompt;
  const copied=await copy(prompt);
  notify(copied?"想法已保存，立项 Prompt 已复制；请交给 ChatGPT / Work 研究":"想法已保存；请点击“复制当前 Prompt”后交给 AI 研究");
}
function applyHumanGateSideEffects(p,t){
  // Browser-only approval record, scoped to the video branch. Never claim an upstream GUCC/cloud lock.
  if(!p||!t)return;
  if(!["SCRIPT_LOCK_GATE","AUDIO_LOCK_GATE","FINAL_ASSEMBLY","SIX_PLATFORM_PUBLISH_PACKAGE"].includes(t.capabilityUsed))return;
  const branch=t.branch||"SHARED";
  p.videoLocks ||= {};
  p.videoLocks[branch] ||= {};
  const lockKey={SCRIPT_LOCK_GATE:"script",AUDIO_LOCK_GATE:"audio",FINAL_ASSEMBLY:"final",SIX_PLATFORM_PUBLISH_PACKAGE:"publish"}[t.capabilityUsed];
  p.videoLocks[branch][lockKey]={approvedLocallyAt:new Date().toISOString(),nodeId:t.promptId};
}
function setNode(status){
  const p=current(),t=currentTaskFor(p);
  if(!p||!t||t.promptId==="COMPLETE")return;
  if(t.promptId==="PROJECT_BRIEF_APPROVAL"&&status==="DONE"){
    if(!window.confirm("已检查 Project Brief 与 VIDEO_CONTRACT 的核心方向及事实边界，确认批准？\n\n这里只记录本浏览器审核，不表示云端同步。"))return;
    p.status="BRIEF_READY";save();render();notify("项目方向已批准，可以编译执行流");return;
  }
  if(!p.promptFlow?.length)return;
  if(status==="DONE"){
    if(t.status!=="WAITING")return notify("先导入 AI 执行回执，确认完成后再提交");
    const message=t.reviewMode==="APPROVAL_REQUIRED"
      ? `人工确认：${t.name}\n\n请确认已经实际审核输入和输出。此操作只更新本浏览器状态，不能代替真实 GUCC Cloud / Notion LOCK。`
      : `确认 ${t.name} 的外部条件已真实满足？\n此操作不会自动查验官方资料。`;
    if(!window.confirm(message))return;
    applyHumanGateSideEffects(p,t);
  }
  O.markNode(p,t.promptId,status);O.compilePromptFlow(p);save();render();
}
function mergeUnique(target,items){
  const out=[...(Array.isArray(target)?target:[])];
  for(const item of Array.isArray(items)?items:[])if(!out.includes(item))out.push(item);
  return out;
}
function parseNodeResult(raw){
  let text=String(raw||"").trim();
  const matches=[...text.matchAll(/```(?:json|GUCC_NODE_RESULT|GUCC_FLOW_RESULT)\s*([\s\S]*?)```/gi)];
  if(matches.length)text=matches[matches.length-1][1].trim();
  else {const one=text.match(/```\s*([\s\S]*?)```/i);if(one)text=one[1].trim();}
  return JSON.parse(text);
}

function asList(value){return Array.isArray(value)?value:(value==null||value===""?[]:[value]);}

function importProjectBrief(p,result){
  const contract=result.VIDEO_CONTRACT||result.videoContract||result.contractPatch||result;
  if(!contract||typeof contract!=="object"||Array.isArray(contract))throw Error("未找到 VIDEO_CONTRACT JSON");
  p.rawVideoContract=JSON.parse(JSON.stringify(contract));
  const field=(a,b)=>contract[a]??contract[b];
  // The canonical database identity stays immutable once created. AI-proposed
  // human-readable PROJECT_ID is an alias, never a remote primary-key rename.
  const id=String(field("projectId","PROJECT_ID")||"").trim();
  if(id&&id!==p.projectId)p.projectCode=id;
  for(const [a,b] of [["name","PROJECT_NAME"],["game","GAME"],["server","SERVER"],["version","VERSION"],
    ["format","FORMAT"],["productType","PRODUCT_TYPE"],["dataCutoff","DATA_CUTOFF"],["autonomyLevel","AUTONOMY_LEVEL"]]){
    const v=field(a,b);if(v!=null)p[a]=String(v);
  }
  for(const [a,b] of [["verifiedFacts","VERIFIED_FACTS"],["reasonedAnalysis","REASONED_ANALYSIS"],["unknowns","UNKNOWNS"],
    ["doNotUse","DO_NOT_USE"],["availableArtifacts","AVAILABLE_ARTIFACTS"],["officialTerminology","OFFICIAL_TERMINOLOGY"],
    ["lockedArtifacts","LOCKED_ARTIFACTS"],["videos","VIDEOS"]]){
    const v=field(a,b);if(v!=null)p[a]=asList(v);
  }
  const needs=field("productionNeeds","PRODUCTION_NEEDS");
  if(needs&&typeof needs==="object"&&!Array.isArray(needs))p.productionNeeds={...p.productionNeeds,...needs};
  const brief=result.projectBriefMarkdown||result.PROJECT_BRIEF_MD||result.PROJECT_BRIEF;
  if(typeof brief==="string"&&brief.trim())p.projectBriefMarkdown=brief;
  p.status="BRIEF_READY";
  // A generic template accidentally created for a draft is never treated as a researched/approved workflow.
  if(p.promptFlow?.length&&!p.promptFlow.some(n=>["DONE","WAITING"].includes(n.status))){p.promptFlow=[];p.workflow=[];}
  p.history||=[];p.history.push({at:new Date().toISOString(),action:"PROJECT_BRIEF_IMPORTED_LOCAL"});
  save();render();notify("立项结果已导入，等待核对项目方向");
}

function importAiPromptFlow(p,result){
  const payload=result.GUCC_FLOW_RESULT||result;
  const original=payload.promptFlow||payload.PROJECT_PROMPT_FLOW;
  if(!Array.isArray(original)||!original.length)throw Error("未找到 promptFlow 数组；需要完整 GUCC_FLOW_RESULT JSON");
  const ids=new Set();
  const nodes=original.map(raw=>{
    const id=String(raw.promptId||raw.PROMPT_ID||"").trim();
    const capId=String(raw.capabilityUsed||raw.CAPABILITY_USED||"").trim();
    const capability=Caps.get(capId);
    if(!id||ids.has(id))throw Error("节点 ID 缺失或重复："+id);
    if(!capability)throw Error("未知 Capability："+capId);
    ids.add(id);
    const projectPrompt=String(raw.prompt||raw.PROMPT||"").trim();
    if(projectPrompt.length<80)throw Error("节点 "+id+" 没有完整可复制 Prompt");
    const stableDNA=[
      "【GameUp Creator OS / STABLE CAPABILITY CONTRACT】",
      "CAPABILITY: "+capability.id+" · PROJECT: "+p.projectId,
      "【成熟执行方法】",...capability.coreMethod.map(x=>"- "+x),
      "【MANDATORY GUARDRAILS】",...capability.mandatoryGuardrails.map(x=>"- "+x),
      Fail.render(capability.failureRefs||[]),
      "【不可突破的 Core Rules】",...Core.CORE_RULES.autonomy.hard.map(x=>"- "+x),
      "不假装读取文件、实机验证、真实写入或回读；HARD STOP仅限产物真实性无法成立。"
    ].filter(Boolean).join("\n");
    const prompt=stableDNA+"\n\n【PROJECT-SPECIFIC TASK】\n"+projectPrompt;
    const dependencies=asList(raw.dependencies||raw.DEPENDENCIES);
    return {
      promptId:id,name:raw.name||raw.NAME||capability.name,
      purpose:raw.purpose||raw.PURPOSE||capability.purpose,
      executor:raw.executor||raw.EXECUTOR||capability.defaultExecutor,
      when:raw.when||raw.WHEN||"前置任务完成后执行",
      dependencies,
      requiredInput:asList(raw.requiredInput||raw.REQUIRED_INPUT||capability.requiredInput),
      optionalInput:asList(raw.optionalInput||raw.OPTIONAL_INPUT||capability.optionalInput),
      readFromPrevious:asList(raw.readFromPrevious||raw.READ_FROM_PREVIOUS),
      capabilityUsed:capId,prompt,
      expectedOutput:asList(raw.expectedOutput||raw.EXPECTED_OUTPUT||capability.outputSchema),
      saveAs:asList(raw.saveAs||raw.SAVE_AS||capability.outputSchema),
      qualityGate:asList(raw.qualityGate||raw.QUALITY_GATE||capability.qualityGate),
      hardStop:asList(raw.hardStop||raw.HARD_STOP||capability.hardStopCondition),
      softUncertaintyPolicy:asList(raw.softUncertaintyPolicy||raw.SOFT_UNCERTAINTY_POLICY||Core.SOFT_UNCERTAINTY_POLICY),
      skipCondition:asList(raw.skipCondition||raw.SKIP_CONDITION),
      next:asList(raw.next||raw.NEXT),chatFallback:raw.chatFallback||raw.CHAT_FALLBACK||capability.chatFallback||"",
      qcLevel:raw.qcLevel||raw.QC_LEVEL||capability.qcLevel,
      reviewMode:raw.reviewMode||raw.REVIEW_MODE||capability.reviewMode,
      status:["WAITING","CONDITIONAL"].includes(raw.status||raw.STATUS)?(raw.status||raw.STATUS):"PENDING",branch:raw.branch||raw.BRANCH||"SHARED",
      isCompiledExternal:true,notes:"AI-compiled / imported locally"
    };
  });
  const indexed=new Map(nodes.map(n=>[n.promptId,n]));
  for(const n of nodes)for(const dep of n.dependencies){
    if(!ids.has(dep)||dep===n.promptId)throw Error(n.promptId+" 引用了无效依赖："+dep);
  }
  const visited=new Set(),visiting=new Set();
  function visit(id){
    if(visiting.has(id))throw Error("Flow 依赖有环："+id);
    if(visited.has(id))return;
    visiting.add(id);
    for(const dep of indexed.get(id).dependencies)visit(dep);
    visiting.delete(id);visited.add(id);
  }
  for(const n of nodes)visit(n.promptId);
  p.promptFlow=nodes;
  p.workflow=nodes.map(n=>({promptId:n.promptId,name:n.name,capabilityUsed:n.capabilityUsed,executor:n.executor,
    dependencies:n.dependencies,branch:n.branch,status:n.status,reviewMode:n.reviewMode,qcLevel:n.qcLevel}));
  p.flowRevision=(p.flowRevision||0)+1;p.status="FLOW_READY";
  p.history||=[];p.history.push({at:new Date().toISOString(),action:"AI_PROMPT_FLOW_IMPORTED_LOCAL",revision:p.flowRevision});
  flowExpanded=false;save();render();notify("AI 编排的完整 Prompt Flow 已导入本浏览器");
}

function applyNodeResult(result){
  const p=current();if(!p)throw new Error("No project");
  const t=currentTaskFor(p);
  if(!result||typeof result!=="object")throw new Error("未检测到 JSON 回执");
  if(t.promptId==="PROJECT_BUILDER")return importProjectBrief(p,result);
  if(t.promptId==="PROMPT_FLOW_COMPILER")return importAiPromptFlow(p,result);
  if(!result.promptId)throw new Error("缺少 promptId");
  if(t&&t.promptId!=="COMPLETE"&&result.promptId!==t.promptId)throw new Error("当前任务是 "+t.promptId+"，返回的是 "+result.promptId);
  const n=(p.promptFlow||[]).find(x=>x.promptId===result.promptId);
  if(!n)throw new Error("当前 Flow 中找不到该 Prompt Node");
  p.availableArtifacts=mergeUnique(p.availableArtifacts,result.availableArtifacts||result.outputs);
  p.verifiedFacts=mergeUnique(p.verifiedFacts,result.verifiedFacts);
  p.reasonedAnalysis=mergeUnique(p.reasonedAnalysis,result.reasonedAnalysis);
  p.unknowns=mergeUnique(p.unknowns,result.unknowns);
  const patch=result.contractPatch&&typeof result.contractPatch==="object"?result.contractPatch:{};
  for(const key of ["format","dataCutoff","currentStage","status"]){if(patch[key]!=null)p[key]=patch[key];}
  if(patch.productionNeeds&&typeof patch.productionNeeds==="object")p.productionNeeds={...p.productionNeeds,...patch.productionNeeds};
  if(Array.isArray(patch.doNotUse))p.doNotUse=mergeUnique(p.doNotUse,patch.doNotUse);
  if(Array.isArray(patch.officialTerminology))p.officialTerminology=mergeUnique(p.officialTerminology,patch.officialTerminology);
  if(Array.isArray(result.flowOps)&&result.flowOps.length)O.updatePromptFlow(p,result.flowOps);
  const status=String(result.status||"DONE").toUpperCase();
  if(result.requiresApproval===true||n.reviewMode==="APPROVAL_REQUIRED"){n.status="WAITING";n.notes="AI result 已应用，等待 Human Approval";}
  else if(["DONE","WAITING","SKIPPED"].includes(status))n.status=status;
  else if(status==="NEED_INPUT"){n.status="WAITING";n.notes="HARD STOP / NEED_INPUT";}
  else n.status="DONE";
  O.compilePromptFlow(p);save();render();
}
async function loadMigration(){try{const r=await fetch("./legacy-prompt-migration.json?v=2.0.0");const j=await r.json();migration=j.mappings||[];renderProjects();}catch(e){console.warn(e);}}

document.querySelectorAll(".os-nav button[data-view]").forEach(b=>b.addEventListener("click",()=>{activeView=b.dataset.view;render();}));
$("projectSearch").addEventListener("input",renderProjects);
$("projectArchiveFilter").addEventListener("change",renderProjects);
$("completeCurrentProject").addEventListener("click",()=>{
  const p=current();if(!p||p.status==="TEST_FIXTURE"||p.deletedAt)return;
  if(!p.completedAt){
    if(!window.confirm("标记为「已完成」？这是项目管理状态，不会伪造 Prompt 节点完成记录或正式发布状态。"))return;
    p.completedAt=new Date().toISOString();
    selectActiveAfterMove(p.projectId);
  }else{
    p.completedAt=null;
  }
  save();render();
  notify(p.completedAt?"项目已完成 · 可在「已完成」查看":"项目重新设为进行中");
});
$("archiveCurrentProject").addEventListener("click",()=>{
  const p=current();if(!p||p.status==="TEST_FIXTURE"||p.deletedAt)return;
  if(!p.archivedAt){
    if(!window.confirm("归档当前项目？项目和制作记录会保留，随时可以恢复。"))return;
    p.archivedAt=new Date().toISOString();
    selectActiveAfterMove(p.projectId);
  }else p.archivedAt=null;
  save();render();notify(p.archivedAt?"项目已归档":"项目已取消归档");
});
$("deleteCurrentProject").addEventListener("click",()=>{
  const p=current();if(!p||p.status==="TEST_FIXTURE")return;
  if(p.deletedAt){
    if(!window.confirm("从回收站恢复此项目？"))return;
    p.deletedAt=null;
    save();render();notify("项目已恢复");return;
  }
  if(!window.confirm("删除「"+p.name+"」？项目将移入回收站，不会删除本地文件、正式 Creator 项目主表或素材。"))return;
  const typed=window.prompt("为避免误删，请输入 DELETE 确认（可取消）","");
  if(typed!=="DELETE")return notify("未执行删除");
  p.deletedAt=new Date().toISOString();
  selectActiveAfterMove(p.projectId);
  save();render();notify("已移入回收站；可恢复");
});
$("projectSelect").addEventListener("change",e=>{store.selectedProjectId=e.target.value;flowExpanded=false;save();$("artifactPreview").textContent="";render();});
$("newProjectBtn").addEventListener("click",()=>{$("createDialog").showModal();});
$("newProjectShortcut").addEventListener("click",()=>{$("createDialog").showModal();});
$("toggleFlowBtn").addEventListener("click",()=>{flowExpanded=!flowExpanded;renderFlow(current());});
$("closeNodeDialog").addEventListener("click",()=>{$("nodeDialog").close();});
$("copyNodePrompt").addEventListener("click",()=>copy(selectedNodePrompt));
$("createPromptBtn").addEventListener("click",()=>{const idea=$("ideaInput").value.trim();if(!idea)return notify("先写一句项目想法");copy(O.buildCreateProjectPrompt(idea));});
$("copyCurrentPrompt").addEventListener("click",()=>copy(currentTaskFor(current())?.prompt||""));
$("applyResultBtn").addEventListener("click",()=>{$("resultInput").value="";$("resultDialog").showModal();});
$("applyResultConfirm").addEventListener("click",e=>{e.preventDefault();try{applyNodeResult(parseNodeResult($("resultInput").value));$("resultDialog").close();notify("AI Result 已应用");}catch(err){notify("应用失败："+err.message);}});
$("markDoneBtn").addEventListener("click",()=>setNode("DONE"));
$("skipTaskBtn").addEventListener("click",()=>setNode("SKIPPED"));
$("copyContractBtn").addEventListener("click",()=>copy(O.videoContractMd(current())));
$("copyWorkflowBtn").addEventListener("click",()=>copy(O.workflowMd(current())));
$("buildFlowBtn").addEventListener("click",()=>{
  const p=current();if(!p)return;
  if(["DRAFT","IMPORTED_LEGACY"].includes(p.status))return notify("项目尚未立项，请先导入 VIDEO_CONTRACT");
  const progress=(p.promptFlow||[]).some(n=>["DONE","SKIPPED"].includes(n.status));
  if(progress&&!window.confirm("此操作将重新编译流程并重置本浏览器已记录的节点状态。\n\n保留现有进度请选择“调整制作路线”生成 DIFF Prompt。\n\n仍要重新编译吗？"))return;
  O.buildWorkflow(p);O.compilePromptFlow(p);save();render();
  notify("已生成本地 Prompt Flow 草案（未自动开展研究）");
});
$("copyBuildFlowPrompt").addEventListener("click",()=>{
  const p=current();if(["DRAFT","IMPORTED_LEGACY"].includes(p?.status))return notify("请先执行 Project Builder 并导入立项结果");
  copy(O.buildFlowCompilerPrompt(p));
});
$("copyUpdateFlowPrompt").addEventListener("click",()=>copy(O.updateFlowPrompt(current())));
$("capSearch").addEventListener("input",renderCapabilities);$("capDomain").addEventListener("change",renderCapabilities);
document.querySelectorAll("[data-artifact]").forEach(b=>b.addEventListener("click",()=>showArtifact(b.dataset.artifact)));
$("exportBtn").addEventListener("click",()=>{const p=current();if(p)download(slugFile(p.projectId)+".json",JSON.stringify(p,null,2));});
$("importBtn").addEventListener("click",()=>{$("importFile").click();});
$("importFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const obj=JSON.parse(await file.text());
    if(!obj||typeof obj!=="object")throw Error("不是项目对象");
    const input=obj.videoContract||obj.VIDEO_CONTRACT||obj;
    const data={
      ...input,
      projectId:input.projectId||input.PROJECT_ID,
      name:input.name||input.PROJECT_NAME||input.NAME||input.idea,
      game:input.game||input.GAME,
      server:input.server||input.SERVER,
      version:input.version||input.VERSION,
      productType:input.productType||input.PRODUCT_TYPE||"preview",
      autonomyLevel:input.autonomyLevel||input.AUTONOMY_LEVEL||"L2",
      productionNeeds:input.productionNeeds||input.PRODUCTION_NEEDS||{},
      verifiedFacts:input.verifiedFacts||input.VERIFIED_FACTS||[],
      unknowns:input.unknowns||input.UNKNOWNS||[],
      doNotUse:input.doNotUse||input.DO_NOT_USE||[]
    };
    const p=(obj.schemaVersion==="creator-os-v2"&&Array.isArray(obj.history))?obj:O.createProject(data);
    if(!p.projectId||!p.name)throw Error("缺少项目标识");
    const i=store.projects.findIndex(x=>x.projectId===p.projectId);
    if(i>=0&&!window.confirm("发现同 ID 项目。确认覆盖本浏览器中该项目的记录？"))return;
    if(i>=0)store.projects[i]=p;else store.projects.unshift(p);
    store.selectedProjectId=p.projectId;save();render();notify("JSON 已导入本浏览器 · 未写入云端");
  }catch(err){notify("JSON 导入失败："+(err.message||"格式无效"));}
  finally{e.target.value="";}
});
$("createProjectForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const idea=String(fd.get("idea")||"").trim();
  if(!idea){$("projectIdea").focus();return notify("请至少写一句视频想法");}
  const submit=$("saveDraftProject");submit.disabled=true;
  try{
    await createDraft({idea,game:fd.get("game"),server:fd.get("server"),version:fd.get("version"),productType:fd.get("productType"),autonomyLevel:"L2"});
    $("createDialog").close();
  }catch(err){notify("保存失败："+(err.message||"请稍后重试"));}
  finally{submit.disabled=false;}
});
$("createDialog").querySelectorAll("[data-close-create]").forEach(button=>button.addEventListener("click",()=>$("createDialog").close()));
$("createDialog").addEventListener("close",()=>{$("createDialog").querySelector("form").reset();});

function slugFile(v){return String(v||"project").replace(/[^\w\u4e00-\u9fff.-]+/g,"_").slice(0,90);}
// Public, minimal integration for the two optional workspace modules.
window.GuccCreatorOS={
  projects:()=>JSON.parse(JSON.stringify(store.projects)),
  selectedId:()=>store.selectedProjectId,
  current:()=>JSON.parse(JSON.stringify(current())),
  selectProject:(id)=>{
    if(!store.projects.some(p=>p.projectId===id))return false;
    if(store.selectedProjectId!==id){
      store.selectedProjectId=id;
      save(false);render();
    }
    return true;
  },
  putProject:(project,{fromCloud=false}={})=>{
    if(!project||typeof project!=="object"||!project.projectId||!project.name)throw Error("无效的云端项目");
    const i=store.projects.findIndex(p=>p.projectId===project.projectId);
    if(i>=0)store.projects[i]=JSON.parse(JSON.stringify(project));
    else store.projects.unshift(JSON.parse(JSON.stringify(project)));
    if(project.projectId===linkedProjectId||(!current()&&projectLife(project)==="active"))
      store.selectedProjectId=project.projectId;
    save(!fromCloud);render();
  }
};
render();loadMigration();
})();