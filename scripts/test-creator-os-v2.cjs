"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const Core=require("../apps/video-workspace/production-system/core-rules.js");
const Caps=require("../apps/video-workspace/production-system/capability-library.js");
const Fail=require("../apps/video-workspace/production-system/failure-prevention.js");
const O=require("../apps/video-workspace/production-system/orchestrator.js");
const Steps=require("../apps/video-workspace/production-system/creator-os-step-history.js");
const Outcomes=require("../apps/video-workspace/production-system/creator-os-outcomes.js");
const Six=require("../apps/video-workspace/creator-six-deliverables.js");
const migration=require("../apps/video-workspace/production-system/legacy-prompt-migration.json");

assert.equal(Core.AUTONOMY_LEVELS.L2.label,"High Autonomy");
assert(Core.HARD_STOP_RULES.length>=5);
assert(Caps.CAPABILITIES.length>=30);
assert(Fail.all().some(x=>x.id==="SA_PROXY_MASTER_MAPPING"));

// Character-story production lessons: cover promises, TTS boundaries, parallel assets, publishing.
for(const id of ["SC_QUESTION_MUST_BE_ANSWERED","SC_FALSE_CONTRAST","SC_QC_BEFORE_LOCK",
  "TL_TTS_LIMIT_GAP","TL_TTS_LOCKED_TEXT_QC","VS_IDENTITY_AFTER_RENDER",
  "VS_PREBUILD_WITHOUT_FAKE_TIMELINE","PB_HEADLINE_CAUSAL_CHECK","PB_ONE_PRIMARY_COPY"])
  assert(Fail.all().some(x=>x.id===id),`Missing creator regression rule: ${id}`);
assert.match(Core.ruleText(["audioTimeline"]),/大间隔/);
assert.match(Core.ruleText(["visual"]),/不把专门录游戏实机作为必经步骤/);
const ttsPrep=Caps.get("READING_SCRIPT");
assert(ttsPrep.failureRefs.includes("TL_TTS_LOCKED_TEXT_QC"));
assert(ttsPrep.coreMethod.some(x=>x.includes("300字符兼容版")));
assert(ttsPrep.coreMethod.some(x=>x.includes("明显空档")));
const cover=Caps.get("COVER_DESIGN");
assert(cover.failureRefs.includes("SC_FALSE_CONTRAST"));
assert(cover.qualityGate.some(x=>x.includes("正文明确回答封面问题")));
const publish=Caps.get("SIX_PLATFORM_PUBLISH_PACKAGE");
assert(publish.coreMethod.some(x=>x.includes("不强凑五个标题")));
assert(!publish.coreMethod.some(x=>x.includes("标题≥5")));
assert(Caps.get("VISUAL_DIRECTION").whenToUse.some(x=>x.includes("SCRIPT_LOCK")));
assert.match(Six.build("visual",{route:"story"}),/不把用户亲自录制游戏作为必经步骤/);
assert.match(Six.build("cover",{route:"story"}),/生成之后再逐比例复核身份/);
assert.match(Six.build("publish",{route:"story"}),/看似矛盾实际理所当然/);

// Production experience: a script-locked release can begin before other media;
// the final time-coded release still requires genuine aligned audio/SRT.
const earlyPublish=Caps.get("SIX_PLATFORM_PUBLISH_PACKAGE");
assert.equal(earlyPublish.requiredInput.length,1);
assert(earlyPublish.requiredInput[0].includes("正式锁稿"));
assert(earlyPublish.optionalInput.some(x=>x.includes("FINAL.srt")));
assert.match(Six.build("publish",{route:"story"}),/正式锁稿确认后即可先/);
assert.match(Six.build("sound",{route:"story"}),/FINAL_BGM_SFX.wav/);
assert.match(Six.build("sound",{route:"story"}),/旋律\/和声/);
assert.match(Six.build("visual",{route:"story",visualStyle:"美式电影大片感"}),/美式电影大片感/);
assert.match(Six.build("visual",{route:"story"}),/FINAL_VIDEO_SILENT.mp4/);
assert(Caps.get("BGM_SFX_ASSET_PRODUCTION").coreMethod.some(x=>x.includes("FINAL_BGM_SFX.wav")));
assert(Caps.get("BGM_SFX_ASSET_PRODUCTION").qualityGate.some(x=>x.includes("实际试听")));

const sixProject=O.createProject({projectId:"QA_STORY_STYLES",name:"剧情人物",game:"绝区零",
  productType:"story",workflowMode:"six",videos:[{videoId:"FIONI",name:"菲欧妮"},{videoId:"OTHER",name:"另一个角色"}]});
sixProject.videoStyles={FIONI:"电影人物悬疑感"};
O.buildWorkflow(sixProject);
O.compilePromptFlow(sixProject);
const fioniNodes=sixProject.promptFlow.filter(x=>x.videoId==="FIONI");
const release=fioniNodes.find(x=>x.sixOutcomeId==="publish");
const script=fioniNodes.find(x=>x.sixOutcomeId==="script");
assert.deepEqual(release.dependencies,[script.promptId],"Publishing draft depends on script, not final video/audio");
assert.match(fioniNodes.find(x=>x.sixOutcomeId==="visual").prompt,/电影人物悬疑感/);
assert.doesNotMatch(sixProject.promptFlow.find(x=>x.videoId==="OTHER"&&x.sixOutcomeId==="visual").prompt,/电影人物悬疑感/);
sixProject.videoStyles.FIONI="电影纪实悬疑";
O.compilePromptFlow(sixProject);
assert.match(sixProject.promptFlow.find(x=>x.videoId==="FIONI"&&x.sixOutcomeId==="visual").prompt,/电影纪实悬疑/);
const creatorPage=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/index.html"),"utf8");
const creatorJs=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/creator-os-app.js"),"utf8");
assert.match(creatorPage,/id="outcomeVideoStyleBtn"/);
assert.match(creatorPage,/id="videoStyleDialog"/);
assert.match(creatorJs,/VIDEO_VISUAL_STYLE_UPDATED/);


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
      replaceChildren(){this.children=[];},append(x){this.children.push(x);},add(x){this.options.push(x);},
      addEventListener(type,fn){(callbacks[id] ||= {})[type]=fn;},
      setAttribute(){},showModal(){},close(){},closest(){return {classList:{toggle(){}}};},querySelector(){return {reset(){}};},querySelectorAll(){return [];}
    };
    elements.set(id,e);return e;
  };
  const draft=O.createProject({projectId:"QA_DRAFT",name:"QA 草案",idea:"测试 Project Builder 与 Flow Compiler"});
  storage.set(O.STORAGE_KEY,JSON.stringify({projects:[draft],selectedProjectId:draft.projectId}));
  const sandbox={
    window:{GuccCreatorOutcomes:Outcomes,GuccCreatorSix:Six,GuccCreatorCoreRules:Core,GuccCreatorFailurePrevention:Fail,GuccCreatorCapabilities:Caps,GuccCreatorOrchestrator:O,GuccCreatorStepHistory:Steps,confirm:()=>true,location:{search:""},dispatchEvent(){},addEventListener(){}},
    document:{getElementById:element,querySelectorAll:()=>[],createElement:t=>element(t+"_"+elements.size),body:{append(){}}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    navigator:{clipboard:{writeText:async()=>{}}},
    setTimeout:()=>1,clearTimeout:()=>{},fetch:async()=>({json:async()=>({mappings:[]})}),
    Option:function(label,value){this.label=label;this.value=value;},CustomEvent:function(){},URLSearchParams,console
  };
  vm.runInNewContext(source,sandbox,{filename:"creator-os-app.js"});
  assert.equal(element("currentTaskId").textContent,"PROJECT_BUILDER");
  assert.equal(element("projectSelect").disabled,false,"A real draft must remain selectable");
  const apply=result=>{
    callbacks.applyResultBtn.click();
    element("resultInput").value=JSON.stringify(result);
    callbacks.applyResultConfirm.click({preventDefault(){}});
  };
  apply({PROJECT_ID:"QA_DRAFT",PROJECT_NAME:"已研究草案",GAME:"绝区零",VERSION:"3.3",
    VERIFIED_FACTS:["真实来源须独立核验"],CONTENT_LANE:"CONVERSION",AUTHOR_QUESTION:"为什么这个角色的状态会延迟触发",AUTHOR_CONTRIBUTION:"待验证的个人测试，不得当作已实测",CORE_THESIS:"解释延迟触发机制",PRODUCTION_NEEDS:{PROXY:"NOT_PLANNED"}});
  assert.equal(element("currentTaskId").textContent,"PROMPT_FLOW_COMPILER");
  apply({GUCC_FLOW_RESULT:{promptFlow:[{
    promptId:"PF-001",name:"玩家需求研究",capabilityUsed:"PLAYER_DEMAND_RESEARCH",executor:"Chat",dependencies:[],
    prompt:"请严格根据已有官方来源和可追溯的玩家讨论研究本期选题。每个玩家问题都记录原始来源、发布时间及讨论语境。区分正式资料、公开分析、尚未确认的内容，不把泄露当官方，也不要编造热度、数值、版本或结论。输出研究与竞品缺口，完成当前任务后等待下一个 Prompt。"
  }]}});
  const saved=JSON.parse(storage.get(O.STORAGE_KEY)).projects[0];
  assert.equal(saved.promptFlow.length,1);
  assert.equal(saved.contentLane,"CONVERSION");
  assert.equal(saved.authorQuestion,"为什么这个角色的状态会延迟触发");
  assert.equal(saved.authorContribution,"待验证的个人测试，不得当作已实测");
  assert.equal(saved.coreThesis,"解释延迟触发机制");
  assert.equal(element("currentTaskId").textContent,"PF-001");
  assert.match(element("currentPrompt").textContent,/STABLE CAPABILITY CONTRACT/);
  assert.match(html,/data-creator-prompts="true"/,"Canonical OS must not auto-inject legacy pipeline overlays");
  assert.match(html,/id="toggleFlowBtn"/);
  assert.match(css,/\.mission-cta/);
  assert.match(css,/@media\(max-width:760px\)/);
}
testTaskFirstUiHandoff();

console.log("Creator OS v2 tests passed:",Caps.CAPABILITIES.length,"capabilities,",p.promptFlow.length,"prompt nodes");
