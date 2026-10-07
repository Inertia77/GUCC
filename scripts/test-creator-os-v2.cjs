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
console.log("Creator OS v2 tests passed:",Caps.CAPABILITIES.length,"capabilities,",p.promptFlow.length,"prompt nodes");
