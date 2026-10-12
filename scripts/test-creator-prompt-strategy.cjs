"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const P=require("../apps/video-workspace/ai-prompts.js");
const Core=require("../apps/video-workspace/production-system/core-rules.js");
const Caps=require("../apps/video-workspace/production-system/capability-library.js");
const O=require("../apps/video-workspace/production-system/orchestrator.js");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

// Preserve existing canonical task and capability inventories.
assert.equal(P.tasks.length,22);
assert.equal(P.ROUTES.length,8);
assert.equal(Caps.CAPABILITIES.length,44);
assert(Core.CORE_RULES.contentStrategy.hard.some(x=>x.includes("作者")));
assert(P.COMMON.includes("ACQUISITION")&&P.COMMON.includes("AUTHOR_QUESTION"));
assert(P.build("script",{route:"mechanism"}, "Chat").includes("AUTHOR_CONTRIBUTION"));
assert(P.build("brief",{route:"preview"},"Work").includes("作者本人会不会看"));

// The Chat fallback performs only its selected subtask; the full production
// contract and complete source text remain intact in the normal Work prompt.
const chatStep=P.build("audit",{route:"mechanism"},"Chat",0);
const completeStep=P.build("audit",{route:"mechanism"},"Work");
assert(chatStep.includes("本轮专项质量底线"));
assert(!chatStep.includes("【执行要求】"));
assert(completeStep.includes("事实审核"));
assert(chatStep.length<completeStep.length,"Chat subtask should be cheaper than entire audit");

// Explicit acquisition content gets a lean path; unclassified legacy projects
// must not be silently migrated to the new format or have their gates removed.
const fast=O.createProject({projectId:"FAST-TEST",name:"版本轻量获客",contentLane:"ACQUISITION",productType:"preview"});
O.buildWorkflow(fast);
O.compilePromptFlow(fast);
assert.equal(fast.contentLane,"ACQUISITION");
assert.equal(fast.promptFlow.length,18);
assert(fast.promptFlow.some(n=>n.capabilityUsed==="SCRIPT_LOCK_GATE"));
assert(!fast.promptFlow.some(n=>n.capabilityUsed==="PROXY_MEDIA"));
assert(!fast.promptFlow.some(n=>n.capabilityUsed==="SCRIPT_DIFF_REVISION"));
assert(fast.promptFlow[0].prompt.includes("CONTENT_LANE: ACQUISITION"));
const original=O.createProject({projectId:"ORIGINAL-TEST",name:"已存在的传统制作",productType:"preview"});
O.buildWorkflow(original);
O.compilePromptFlow(original);
assert.equal(original.contentLane,"UNCONFIRMED");
assert(original.promptFlow.length>fast.promptFlow.length);
assert(original.promptFlow.some(n=>n.capabilityUsed==="SCRIPT_DIFF_REVISION"&&n.status==="CONDITIONAL"));
assert(original.promptFlow[0].prompt.includes("AUTHOR_QUESTION"));
assert(O.buildCreateProjectPrompt({idea:"要做机制研究"}).includes("AUTHOR_CONTRIBUTION"));
assert(O.buildFlowCompilerPrompt(original).includes("获客快线"));

// Auxiliary prompt surfaces must share the same content strategy and current
// GAME OPS responsibilities instead of silently reviving Sheets or Notion.
assert(read("assets/creator-ai-task-core.js").includes("Content Quality and Author Value"));
assert(read("reference/ai-prompts.md").includes("Supabase / TaskRing 限时任务"));
assert(read("reference/ai-prompts.md").includes("活动限时玩法、周期挑战"));
assert(!read("reference/party-analysis-project-prompt.md").includes("Notion 长期主页面创建/更新"));
assert(read("apps/cover-generator/index.html").includes("includeNineSixteen"));
console.log("Creator Prompt Strategy regression tests passed:",fast.promptFlow.length,"acquisition nodes; baseline",original.promptFlow.length);
