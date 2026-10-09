"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Step=require("../apps/video-workspace/production-system/creator-os-step-history.js");
const appDir=path.join(__dirname,"../apps/video-workspace/production-system");
const html=fs.readFileSync(path.join(appDir,"index.html"),"utf8");
const app=fs.readFileSync(path.join(appDir,"creator-os-app.js"),"utf8");

const draft=()=>({
  projectId:"DRAFT-REWIND-TEST",name:"测试初始草稿",idea:"原始视频想法保持不变",
  status:"DRAFT",game:"绝区零",version:"3.3",history:[],
  verifiedFacts:[],reasonedAnalysis:[],availableArtifacts:[],promptFlow:[],workflow:[]
});

// New import can be precisely undone to before the incorrect result.
{
  const p=draft();
  Step.record(p,"BRIEF_IMPORT");
  Object.assign(p,{status:"BRIEF_READY",name:"错误理解后的名字",rawVideoContract:{CORE_THESIS:"错误"},verifiedFacts:["错误"]});
  assert(Step.describe(p).allowed);
  Step.rewind(p);
  assert.equal(p.status,"DRAFT");
  assert.equal(p.name,"测试初始草稿");
  assert.equal(p.idea,"原始视频想法保持不变");
  assert.equal(p.projectId,"DRAFT-REWIND-TEST");
  assert.equal(p.verifiedFacts.length,0);
  assert.equal(p.rawVideoContract,undefined);
  assert.equal(p.retractedStages.length,1);
  assert.equal(p.retractedStages[0].snapshot.rawVideoContract.CORE_THESIS,"错误");
}

// An existing BRIEF_READY project from before this feature has no checkpoint.
// Reopen the stage while retaining the real identity and the original idea.
{
  const p={...draft(),status:"BRIEF_READY",rawVideoContract:{CORE_THESIS:"旧错误"},
    projectBriefMarkdown:"旧稿",verifiedFacts:["旧错误"],productionNeeds:{PROXY:"REQUIRED"}};
  assert.equal(Step.describe(p).mode,"legacyBrief");
  Step.rewind(p);
  assert.equal(p.status,"DRAFT");
  assert.equal(p.idea,"原始视频想法保持不变");
  assert.equal(p.projectId,"DRAFT-REWIND-TEST");
  assert.equal(p.rawVideoContract,undefined);
  assert.equal(p.projectBriefMarkdown,undefined);
  assert.deepEqual(p.verifiedFacts,[]);
  assert.deepEqual(p.productionNeeds,{});
}

// A workflow import can be reopened without touching accepted project research.
{
  const p={...draft(),status:"BRIEF_READY",verifiedFacts:["已核验资料"]};
  Step.record(p,"FLOW_IMPORT");
  p.status="FLOW_READY";p.promptFlow=[{promptId:"PF-01",status:"PENDING"}];
  Step.rewind(p);
  assert.equal(p.status,"BRIEF_READY");
  assert.deepEqual(p.verifiedFacts,["已核验资料"]);
  assert.equal(p.promptFlow.length,0);
}

// A node result is rolled back together with its merged fact changes.
{
  const p={...draft(),status:"FLOW_READY",promptFlow:[{promptId:"PF-01",status:"PENDING"}]};
  Step.record(p,"NODE_RESULT");p.promptFlow[0].status="DONE";p.verifiedFacts=["错误结论"];
  Step.rewind(p);
  assert.equal(p.promptFlow[0].status,"PENDING");
  assert.deepEqual(p.verifiedFacts,[]);
}
{
  const p={...draft(),status:"BRIEF_REVIEW"};
  Step.record(p,"NODE_STATUS");p.status="BRIEF_READY";
  Step.rewind(p);
  assert.equal(p.status,"BRIEF_REVIEW");
}

// Protect irreversible milestones and old workflows without recoverable history.
{
  const locked={...draft(),status:"BRIEF_READY",videoLocks:{MAIN:{audio:{approvedLocallyAt:"now"}}}};
  assert.equal(Step.describe(locked).allowed,false);
  assert.throws(()=>Step.rewind(locked));
  const oldFlow={...draft(),status:"FLOW_READY",promptFlow:[{promptId:"PF-01",status:"DONE"}]};
  assert.equal(Step.describe(oldFlow).allowed,false);
}

// New markup and actions must be wired into the real screen, not just a utility.
assert.match(html,/id="rewindTaskBtn"/);
assert.match(html,/id="rewindDialog"/);
assert.match(html,/creator-os-step-history\.js\?v=/);
assert.match(app,/Steps\.record\(p,"BRIEF_IMPORT"\)/);
assert.match(app,/Steps\.record\(p,"FLOW_IMPORT"\)/);
assert.match(app,/Steps\.record\(p,"NODE_RESULT"\)/);
assert.match(app,/Steps\.rewind\(p\)/);
console.log("Creator OS step rollback tests passed");
