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
let activeView="system";
let toastTimer;

function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(O.STORAGE_KEY)||"null");
    if(raw&&Array.isArray(raw.projects)){
      return {projects:raw.projects,selectedProjectId:raw.selectedProjectId||raw.projects[0]?.projectId||""};
    }
  }catch(e){console.warn("Creator OS v2 store reset",e);}
  const test=O.testFixture();
  O.buildWorkflow(test);O.compilePromptFlow(test);
  return {projects:[test],selectedProjectId:test.projectId};
}
function save(){localStorage.setItem(O.STORAGE_KEY,JSON.stringify(store));}
function current(){return store.projects.find(p=>p.projectId===store.selectedProjectId)||store.projects[0]||null;}
function notify(msg){$("toast").textContent=msg;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,2600);}
async function copy(text){try{await navigator.clipboard.writeText(text);notify("已复制");}catch{notify("复制失败，请手动选择");}}
function listText(arr){return (arr||[]).length?(arr||[]).map(x=>"• "+x).join("\n"):"—";}
function download(name,text,type="application/json"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);}

function currentTaskFor(p){
  if(!p) return null;
  if(!p.promptFlow?.length){
    return {promptId:"PROJECT_BUILDER",name:"Create Project / Project Builder",executor:"Work",reason:"当前只有自然语言想法；先让 AI 主动研究并生成 PROJECT_BRIEF + VIDEO_CONTRACT。",requiredInput:[p.idea||p.name],expectedOutput:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],qualityGate:["Q2：立项/事实边界自检"],reviewMode:"APPROVAL_REQUIRED",prompt:O.buildCreateProjectPrompt(p.idea||p.name),status:"PENDING"};
  }
  return O.currentTask(p);
}

function render(){
  renderNav();
  renderProjectBar();
  renderSystem();
  renderCore();
  renderCapabilities();
  renderProjects();
}
function renderNav(){
  document.querySelectorAll(".os-nav button[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===activeView));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+activeView));
}
function renderProjectBar(){
  const sel=$("projectSelect");sel.replaceChildren();
  for(const p of store.projects){const o=document.createElement("option");o.value=p.projectId;o.textContent=`${p.name} · ${p.projectId}`;sel.append(o);}
  sel.value=store.selectedProjectId;
}
function renderSystem(){
  const p=current();if(!p)return;
  $("projectName").textContent=p.name;
  $("projectMeta").innerHTML=[
    ["PROJECT_ID",p.projectId],["GAME",p.game||"UNKNOWN"],["SERVER",p.server||"UNKNOWN"],["VERSION",p.version||"UNKNOWN"],
    ["TYPE",p.productType||"UNKNOWN"],["AUTONOMY",p.autonomyLevel||"L2"],["FLOW",`rev.${p.flowRevision||0}`]
  ].map(([k,v])=>`<div><b>${esc(k)}</b>${esc(v)}</div>`).join("");
  const t=currentTaskFor(p);
  $("currentTaskName").textContent=`${t.promptId} · ${t.name}`;
  $("currentExecutor").textContent=t.executor||"—";
  $("currentTaskReason").textContent=t.reason||t.purpose||"";
  $("currentInputs").textContent=listText(t.requiredInput);
  $("currentOutputs").textContent=listText(t.expectedOutput||t.saveAs);
  $("currentQc").textContent=t.qcLevel||"Q2";
  $("currentReview").textContent=t.reviewMode||"REVIEW_OPTIONAL";
  $("currentPrompt").textContent=t.prompt||"";
  $("markDoneBtn").disabled=!p.promptFlow?.length||["COMPLETE"].includes(t.promptId);
  $("markDoneBtn").textContent=t.status==="WAITING"?"确认条件 / Approval → 下一任务":"标记完成 → 下一任务";
  $("skipTaskBtn").disabled=!p.promptFlow?.length||!["CONDITIONAL","PENDING"].includes(t.status||"");
  $("flowRevision").textContent=`revision ${p.flowRevision||0}`;
  renderFlow(p);
  $("productionMap").innerHTML=Core.HUMAN_PRODUCTION_MAP.map(s=>`<div class="map-step"><b>${s.id}</b><strong>${esc(s.name)}</strong><small>${esc(s.meaning)}</small></div>`).join("");
}
function renderFlow(p){
  const box=$("flowList");box.replaceChildren();
  if(!p.promptFlow?.length){box.innerHTML='<p class="subtitle">尚未生成 PROJECT_PROMPT_FLOW。先完成 Project Builder，再 Build Prompt Flow。</p>';return;}
  for(const n of p.promptFlow){
    const row=document.createElement("div");row.className="flow-node";row.dataset.id=n.promptId;
    row.innerHTML=`<span class="id">${esc(n.promptId)}</span><div><strong>${esc(n.name)}</strong><br><small>${esc(n.capabilityUsed)}</small></div><span class="executor">${esc(n.executor)}</span><span class="status ${esc(n.status)}">${esc(n.status)}</span><span class="branch">${esc(n.branch||"")}</span>`;
    row.title="点击查看/复制此 Node Prompt";
    row.addEventListener("click",()=>{const prompt=n.prompt||O.capabilityPrompt(p,n);$("currentPrompt").textContent=prompt;copy(prompt);});
    box.append(row);
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
  const p=current();
  $("projectCards").innerHTML=store.projects.map(x=>`<article class="panel project-card ${x.projectId===store.selectedProjectId?"active":""}" data-project="${esc(x.projectId)}"><span class="micro">${esc(x.projectId)}</span><h3>${esc(x.name)}</h3><p>${esc(x.game||"UNKNOWN")} · ${esc(x.version||"UNKNOWN")} · ${esc(x.productType||"UNKNOWN")} · Flow rev.${x.flowRevision||0}</p></article>`).join("");
  document.querySelectorAll(".project-card").forEach(card=>card.addEventListener("click",()=>{store.selectedProjectId=card.dataset.project;save();render();}));
  if(!$("artifactPreview").textContent&&p)$("artifactPreview").textContent=O.currentTaskMd(p);
  $("migrationTable").innerHTML=migration.length?migration.map(m=>`<div class="migration-row"><code>${esc(m.legacyPromptId)}</code><strong>${esc(m.disposition)}</strong><span>${esc((m.capabilities||[]).join(" + "))}<br><small class="subtitle">${esc(m.reason)}</small></span></div>`).join(""):"<p class='subtitle'>Migration map 加载中…</p>";
}
function showArtifact(kind){
  const p=current();if(!p)return;
  const map={brief:O.projectBriefMd,contract:O.videoContractMd,workflow:O.workflowMd,flow:O.promptFlowMd,task:O.currentTaskMd};
  $("artifactPreview").textContent=(map[kind]||O.currentTaskMd)(p);
}
function createDraft(data){
  const p=O.createProject(data);store.projects.unshift(p);store.selectedProjectId=p.projectId;save();render();$("currentPrompt").textContent=O.buildCreateProjectPrompt(p.idea);copy(O.buildCreateProjectPrompt(p.idea));
}
function applyHumanGateSideEffects(p,t){
  if(!p||!t)return;
  if(t.capabilityUsed==="SCRIPT_LOCK_GATE")p.locks.script=true;
  if(t.capabilityUsed==="AUDIO_LOCK_GATE")p.locks.audio=true;
  if(t.capabilityUsed==="FINAL_ASSEMBLY")p.locks.final=true;
  if(t.capabilityUsed==="SIX_PLATFORM_PUBLISH_PACKAGE")p.locks.publish=true;
}
function setNode(status){
  const p=current(),t=currentTaskFor(p);if(!p?.promptFlow?.length||!t||t.promptId==="COMPLETE")return;
  if(status==="DONE")applyHumanGateSideEffects(p,t);
  O.markNode(p,t.promptId,status);O.compilePromptFlow(p);save();render();
}
function mergeUnique(target,items){
  const out=[...(Array.isArray(target)?target:[])];
  for(const item of Array.isArray(items)?items:[])if(!out.includes(item))out.push(item);
  return out;
}
function parseNodeResult(raw){
  let text=String(raw||"").trim();
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i);if(fenced)text=fenced[1].trim();
  return JSON.parse(text);
}
function applyNodeResult(result){
  const p=current();if(!p)throw new Error("No project");
  const t=currentTaskFor(p);
  if(!result||!result.promptId)throw new Error("缺少 promptId");
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

document.querySelectorAll(".os-nav button[data-view]").forEach(b=>b.addEventListener("click",()=>{activeView=b.dataset.view;renderNav();}));
$("projectSelect").addEventListener("change",e=>{store.selectedProjectId=e.target.value;save();$("artifactPreview").textContent="";render();});
$("newProjectBtn").addEventListener("click",()=>{$("createDialog").showModal();});
$("createPromptBtn").addEventListener("click",()=>{const idea=$("ideaInput").value.trim();if(!idea)return notify("先写一句项目想法");copy(O.buildCreateProjectPrompt(idea));});
$("copyCurrentPrompt").addEventListener("click",()=>copy(currentTaskFor(current())?.prompt||""));
$("applyResultBtn").addEventListener("click",()=>{$("resultInput").value="";$("resultDialog").showModal();});
$("applyResultConfirm").addEventListener("click",e=>{e.preventDefault();try{applyNodeResult(parseNodeResult($("resultInput").value));$("resultDialog").close();notify("AI Result 已应用");}catch(err){notify("应用失败："+err.message);}});
$("markDoneBtn").addEventListener("click",()=>setNode("DONE"));
$("skipTaskBtn").addEventListener("click",()=>setNode("SKIPPED"));
$("copyContractBtn").addEventListener("click",()=>copy(O.videoContractMd(current())));
$("copyWorkflowBtn").addEventListener("click",()=>copy(O.workflowMd(current())));
$("buildFlowBtn").addEventListener("click",()=>{const p=current();if(!p)return;O.buildWorkflow(p);O.compilePromptFlow(p);save();render();notify("已编译 PROJECT_PROMPT_FLOW");});
$("copyBuildFlowPrompt").addEventListener("click",()=>copy(O.buildFlowCompilerPrompt(current())));
$("copyUpdateFlowPrompt").addEventListener("click",()=>copy(O.updateFlowPrompt(current())));
$("capSearch").addEventListener("input",renderCapabilities);$("capDomain").addEventListener("change",renderCapabilities);
document.querySelectorAll("[data-artifact]").forEach(b=>b.addEventListener("click",()=>showArtifact(b.dataset.artifact)));
$("exportBtn").addEventListener("click",()=>{const p=current();if(p)download(slugFile(p.projectId)+".json",JSON.stringify(p,null,2));});
$("importBtn").addEventListener("click",()=>{$("importFile").click();});
$("importFile").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text());const p=obj.projectId?obj:O.createProject(obj);const i=store.projects.findIndex(x=>x.projectId===p.projectId);if(i>=0)store.projects[i]=p;else store.projects.unshift(p);store.selectedProjectId=p.projectId;save();render();notify("项目已导入");}catch(err){notify("JSON 导入失败");}e.target.value="";});
$("saveDraftProject").addEventListener("click",e=>{e.preventDefault();const fd=new FormData($("createDialog").querySelector("form"));const idea=String(fd.get("idea")||"").trim();if(!idea)return notify("需要一句项目想法");createDraft({idea,name:idea,game:fd.get("game"),server:fd.get("server"),version:fd.get("version"),productType:fd.get("productType"),autonomyLevel:"L2"});$("createDialog").close();});
$("createDialog").addEventListener("close",()=>{$("createDialog").querySelector("form").reset();});

function slugFile(v){return String(v||"project").replace(/[^\w\u4e00-\u9fff.-]+/g,"_").slice(0,90);}
render();loadMigration();
})();