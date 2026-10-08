"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const Core=require("../apps/video-workspace/production-system/core-rules.js");
const Caps=require("../apps/video-workspace/production-system/capability-library.js");
const Fail=require("../apps/video-workspace/production-system/failure-prevention.js");
const O=require("../apps/video-workspace/production-system/orchestrator.js");
const migration=require("../apps/video-workspace/production-system/legacy-prompt-migration.json");

assert.equal(Core.AUTONOMY_LEVELS.L2.label,"High Autonomy");
assert(Core.HARD_STOP_RULES.length>=5);
assert(Caps.CAPABILITIES.length>=30);
assert(Fail.all().some(x=>x.id==="SA_PROXY_MASTER_MAPPING"));

const p=O.testFixture();
O.buildWorkflow(p);
O.compilePromptFlow(p);
assert.equal(p.projectId,"ZZZ_3.3_FIONI_SEVERIAN_PREVIEW");
assert.equal(p.autonomyLevel,"L2");
assert.equal(p.productionNeeds.PROXY,"NOT_PLANNED");
assert.equal(p.promptFlow.filter(n=>n.capabilityUsed==="PROXY_MEDIA").length,0);
assert(p.promptFlow.some(n=>n.promptId==="PF-002"&&n.status==="WAITING"));
assert(p.promptFlow.some(n=>n.promptId==="PF-005"&&n.executor==="Codex"));
assert(p.promptFlow.some(n=>n.promptId==="PF-006"));
assert(p.promptFlow.some(n=>n.promptId==="PF-F01"&&n.branch==="FIONI"));
assert(p.promptFlow.some(n=>n.promptId==="PF-S01"&&n.branch==="SEVERIAN"));
assert(p.promptFlow.some(n=>n.promptId==="PF-F02"&&n.reviewMode==="APPROVAL_REQUIRED"));
assert(p.promptFlow.some(n=>n.promptId==="PF-S02"&&n.reviewMode==="APPROVAL_REQUIRED"));
for(const n of p.promptFlow){
  assert(n.promptId&&n.name&&n.executor&&n.capabilityUsed);
  assert(Array.isArray(n.requiredInput));
  assert(Array.isArray(n.qualityGate));
  assert(Array.isArray(n.softUncertaintyPolicy));
  assert(typeof n.prompt==="string"&&n.prompt.length>200);
}
assert.equal(O.currentTask(p).promptId,"PF-001");
const legacy=JSON.parse(fs.readFileSync(path.join(root,"apps/video-workspace/notion-prompts.json"),"utf8"));
assert.deepEqual(new Set(migration.mappings.map(x=>x.legacyPromptId)),new Set(Object.keys(legacy)));
assert(migration.mappings.some(x=>x.legacyPromptId==="03C"&&x.disposition==="CONDITIONAL"));
assert(migration.mappings.some(x=>x.legacyPromptId==="20"&&x.disposition==="CONDITIONAL"));
for (const row of migration.mappings) for (const id of row.capabilities || []) assert(Caps.get(id), `Migration references missing capability ${id} from legacy ${row.legacyPromptId}`);

const fixtureDir=path.join(root,"apps/video-workspace/production-system/fixtures/ZZZ_3.3_FIONI_SEVERIAN_PREVIEW");
for(const name of ["PROJECT_BRIEF.md","VIDEO_CONTRACT.md","PROJECT_WORKFLOW.md","PROJECT_PROMPT_FLOW.md","CURRENT_TASK.md","project.json"]){
  assert(fs.existsSync(path.join(fixtureDir,name)),`Missing fixture ${name}`);
}

function testTaskFirstUiHandoff(){
  const vm=require("node:vm");
  const source=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/creator-os-app.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/index.html"),"utf8");
  const css=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/creator-os.css"),"utf8");
  const callbacks={},elements=new Map(),storage=new Map();
  const element=(id)=>{
    if(elements.has(id))return elements.get(id);
    const e={
      id,dataset:{},children:[],options:[],classList:{toggle(){}},style:{},value:"",textContent:"",innerHTML:"",hidden:false,
      replaceChildren(){this.children=[];},append(x){this.children.push(x);},
      addEventListener(type,fn){(callbacks[id] ||= {})[type]=fn;},
      setAttribute(){},showModal(){},close(){},querySelector(){return {reset(){}};}
    };
    elements.set(id,e);return e;
  };
  const draft=O.createProject({projectId:"QA_DRAFT",name:"QA 草案",idea:"测试 Project Builder 与 Flow Compiler"});
  storage.set(O.STORAGE_KEY,JSON.stringify({projects:[draft],selectedProjectId:draft.projectId}));
  const sandbox={
    window:{GuccCreatorCoreRules:Core,GuccCreatorFailurePrevention:Fail,GuccCreatorCapabilities:Caps,GuccCreatorOrchestrator:O,confirm:()=>true},
    document:{getElementById:element,querySelectorAll:()=>[],createElement:t=>element(t+"_"+elements.size),body:{append(){}}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    navigator:{clipboard:{writeText:async()=>{}}},
    setTimeout:()=>1,clearTimeout:()=>{},fetch:async()=>({json:async()=>({mappings:[]})}),
    Option:function(){},console
  };
  vm.runInNewContext(source,sandbox,{filename:"creator-os-app.js"});
  assert.equal(element("currentTaskId").textContent,"PROJECT_BUILDER");
  const apply=result=>{
    callbacks.applyResultBtn.click();
    element("resultInput").value=JSON.stringify(result);
    callbacks.applyResultConfirm.click({preventDefault(){}});
  };
  apply({PROJECT_ID:"QA_DRAFT",PROJECT_NAME:"已研究草案",GAME:"绝区零",VERSION:"3.3",
    VERIFIED_FACTS:["真实来源须独立核验"],PRODUCTION_NEEDS:{PROXY:"NOT_PLANNED"}});
  assert.equal(element("currentTaskId").textContent,"PROMPT_FLOW_COMPILER");
  apply({GUCC_FLOW_RESULT:{promptFlow:[{
    promptId:"PF-001",name:"玩家需求研究",capabilityUsed:"PLAYER_DEMAND_RESEARCH",executor:"Chat",dependencies:[],
    prompt:"请严格根据已有官方来源和可追溯的玩家讨论研究本期选题。每个玩家问题都记录原始来源、发布时间及讨论语境。区分正式资料、公开分析、尚未确认的内容，不把泄露当官方，也不要编造热度、数值、版本或结论。输出研究与竞品缺口，完成当前任务后等待下一个 Prompt。"
  }]}});
  const saved=JSON.parse(storage.get(O.STORAGE_KEY)).projects[0];
  assert.equal(saved.promptFlow.length,1);
  assert.equal(element("currentTaskId").textContent,"PF-001");
  assert.match(element("currentPrompt").textContent,/STABLE CAPABILITY CONTRACT/);
  assert.match(html,/data-creator-prompts="true"/,"Canonical OS must not auto-inject legacy pipeline overlays");
  assert.match(html,/id="toggleFlowBtn"/);
  assert.match(css,/\.mission-cta/);
  assert.match(css,/@media\(max-width:760px\)/);
}
testTaskFirstUiHandoff();

console.log("Creator OS v2 tests passed:",Caps.CAPABILITIES.length,"capabilities,",p.promptFlow.length,"prompt nodes");
