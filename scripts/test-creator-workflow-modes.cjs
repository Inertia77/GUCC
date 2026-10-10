"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const P=require("../apps/video-workspace/ai-prompts.js");
const studio=read("apps/video-workspace/legacy-prompt-studio-v6.html");
const chooser=read("apps/video-workspace/index.html");
const portal=read("index.html");
const shell=read("assets/gucc-shell.js");
const dynamic=read("apps/video-workspace/production-system/index.html");
const worker=read("sw.js");

assert.equal(P.STAGES.length,7,"fixed workflow still has seven phases");
assert(P.tasks.length>=20,"fixed catalog must not silently shrink");
assert(P.ROUTES.length>=8,"keep topic-specific paths");
assert(studio.includes("ai-prompts.js?v=6.1.4")&&studio.includes("studio.js?v=6.1.4"),"original fixed catalog must load untouched");
assert(read("apps/video-workspace/studio.js").includes("KEY='gucc_creator_prompt_v6'"),"fixed drafts remain isolated");
assert(chooser.includes('href="./legacy-prompt-studio-v6.html"')&&chooser.includes('href="./production-system/"'),"two equal chooser entries");
assert(!chooser.includes("location.replace("),"chooser must never auto-redirect");
assert(portal.includes('href="./apps/video-workspace/legacy-prompt-studio-v6.html"')&&portal.includes('href="./apps/video-workspace/production-system/"'),"both options available on portal");
assert(shell.includes("childRoutes.fixed, childRoutes.workspace"),"both options in global creative menu");
assert(dynamic.includes('href="../legacy-prompt-studio-v6.html"'),"dynamic creator has a return link");
assert(worker.includes("gucc-static-v37"),"new PWA cache");

const context={route:"preview",title:"角色前瞻分析",game:"绝区零",server:"国际服",version:"3.3",format:"long"};
const preview=P.build("analysis",context,"Chat");
const mechanism=P.build("analysis",{...context,route:"mechanism"},"Chat");
assert(preview.includes("内容类型：前瞻解析"));
assert(mechanism.includes("内容类型：机制专题"));
assert.notEqual(preview,mechanism,"route choices must affect prompt content");
assert(preview.includes("NEXT_HANDOFF")&&preview.includes("真实"),"preserve research and handoff guardrails");
for(const t of P.tasks){
  const prompt=P.build(t.id,context,t.modes[0]);
  assert(prompt.length>100,"missing prompt: "+t.id);
  assert(prompt.includes("单步约定"),"missing guardrails: "+t.id);
}
console.log("Creator fixed/dynamic workflow mode tests passed");
