"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const home="apps/video-workspace/creator-governance/",archive="archive/creator-governance/2026-11-10/";
const C=require("../apps/video-workspace/production-system/core-rules.js");
const F=require("../apps/video-workspace/production-system/failure-prevention.js");
const A=require("../apps/video-workspace/production-system/capability-library.js");
const S=require("../apps/video-workspace/creator-six-deliverables.js");
const P=require("../apps/video-workspace/ai-prompts.js");
const G=require("../apps/video-workspace/creator-governance/creator-governance-runtime.js");
assert.equal(C,G.core);assert.equal(F,G.fail);assert.equal(A,G.caps);assert.equal(S,G.six);assert.equal(P,G.prompts);
const core=read(home+"CREATOR_RULEBOOK.md"),cap=read(home+"CAPABILITY_RULES.md"),task=read(home+"TASK_RULES.md");
const notion=JSON.parse(read(home+"notion-prompts.json"));
for(const section of Object.values(C.CORE_RULES))for(const rule of [...section.hard,...section.best])assert(core.includes(rule),"Missing core rule: "+rule);
for(const x of C.HARD_STOP_RULES)assert(core.includes(x.id));
for(const x of Object.values(F.LIBRARY).flat())assert(core.includes(x.id)&&core.includes(x.rule),"Missing prevention: "+x.id);
for(const x of A.CAPABILITIES){assert(cap.includes(x.id));for(const rule of [...x.coreMethod,...x.qualityGate,...x.mandatoryGuardrails])assert(cap.includes(rule),"Missing capability: "+x.id);}
for(const x of S.ITEMS)assert(task.includes(x.goal),"Missing deliverable: "+x.id);
for(const x of P.ROUTES)assert(task.includes(x.name));
for(const x of P.tasks)assert(task.includes(x.name));
assert.equal(Object.keys(notion).length,31);
for(const basename of ["core-rules.js","failure-prevention.js","capability-library.js","creator-six-deliverables.js","ai-prompts.js","notion-prompts.json","CREATOR_CONSTITUTION.md","UNIFIED_PIPELINE.md"]){
 assert(fs.readdirSync(path.join(root,archive)).some(x=>x.endsWith(basename)),"Missing immutable archive: "+basename);
}
assert(read("apps/video-workspace/production-system/index.html").includes('id="copyCreatorFullGovernance"'));
assert(read("assets/creator-ai-task-ui.mjs").includes("creator-governance/CREATOR_RULEBOOK.md"));
assert(read("assets/creator-shared-context-ui.mjs").includes("creator-governance/creator-governance-runtime.js"));
console.log("Creator Governance PASS: "+Object.keys(C.CORE_RULES).length+" core families, "+Object.values(F.LIBRARY).flat().length+" prevention rules, "+A.CAPABILITIES.length+" capabilities, "+S.ITEMS.length+" deliverables, "+P.tasks.length+" fixed tasks, "+Object.keys(notion).length+" Notion prompts.");
