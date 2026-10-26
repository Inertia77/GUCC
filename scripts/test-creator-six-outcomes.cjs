"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const Six=require("../apps/video-workspace/creator-six-deliverables.js");
const O=require("../apps/video-workspace/production-system/orchestrator.js");
const P=require("../apps/video-workspace/ai-prompts.js");
const ids=["script","subtitle","visual","sound","cover","publish"];
assert.deepEqual(Six.ITEMS.map(x=>x.id),ids);
assert.equal(new Set(Six.ITEMS.map(x=>x.no)).size,6);
for(const item of Six.ITEMS){
 const prompt=Six.build(item.id,{title:"机制专题",route:"mechanism",game:"绝区零",server:"国际服"});
 assert(prompt.includes(item.name));
 assert(prompt.includes("【少量硬性边界】"));
 assert(prompt.includes("不要强制多份重复 MD"));
 assert(prompt.length>350&&prompt.length<3600);
}
assert.match(Six.build("script"),/自然|口播/);
assert.match(Six.COMMON,/不是A而是B/);
assert.match(Six.COMMON,/不是逐字词汇黑名单/);
assert.match(Six.build("subtitle"),/真实音频|最终录音/);
assert.match(Six.build("subtitle"),/不得按字数估算时间/);
assert.match(Six.build("visual"),/不以静态图片假冒动画/);
assert.match(Six.build("sound"),/WAV/);
assert.match(Six.build("cover"),/16:9、4:3、3:4/);
assert.match(Six.build("publish"),/繁体中文/);
assert.equal(P.tasks.length,22,"Preserve mature legacy catalog");

const simple=O.createProject({name:"原创实验",workflowMode:"six",productType:"mechanism"});
O.buildWorkflow(simple);O.compilePromptFlow(simple);
assert.equal(simple.promptFlow.length,6);
assert.deepEqual(simple.promptFlow.map(x=>x.sixOutcomeId),ids);
assert(simple.promptFlow.every(x=>x.prompt.length>350&&["Work","Codex"].includes(x.executor)));
assert.equal(simple.promptFlow[0].reviewMode,"APPROVAL_REQUIRED");
assert.equal(simple.promptFlow[1].reviewMode,"APPROVAL_REQUIRED","Real-audio subtitle requires explicit verified approval");
assert(simple.promptFlow.slice(0,5).every(n=>n.reviewMode==="APPROVAL_REQUIRED"),"Only final deliverables need manual evidence confirmation");
assert.match(simple.promptFlow[0].prompt,/qualityStatus/);
assert.match(simple.promptFlow[1].prompt,/真实音频/);
assert.equal(O.currentTask(simple).promptId,"PF-01");
assert.deepEqual(simple.promptFlow.find(x=>x.sixOutcomeId==="visual").dependencies,["PF-01"]);
assert.deepEqual(simple.promptFlow.find(x=>x.sixOutcomeId==="cover").dependencies,["PF-01"]);
assert.deepEqual(simple.promptFlow.find(x=>x.sixOutcomeId==="sound").dependencies,["PF-02"]);
assert.deepEqual(simple.promptFlow.find(x=>x.sixOutcomeId==="publish").dependencies,["PF-01"],"Lock稿之后即可准备六平台文案；真正发布仍需终检");
O.markNode(simple,"PF-01","DONE");
O.markNode(simple,"PF-02","WAITING");
assert.equal(O.currentTask(simple).sixOutcomeId,"visual","Pending real audio must not block independent visual production");
O.markNode(simple,"PF-03","DONE");
assert.equal(O.currentTask(simple).sixOutcomeId,"cover","Cover can proceed without final recording");


const double=O.createProject({name:"双视频",workflowMode:"six",videos:[
 {videoId:"A",name:"角色A"}, {videoId:"B",name:"角色B"}
]});
O.buildWorkflow(double);O.compilePromptFlow(double);
assert.equal(double.promptFlow.length,12);
assert.equal(double.promptFlow.filter(x=>x.branch==="A").length,6);
assert.equal(double.promptFlow.filter(x=>x.branch==="B").length,6);
assert.match(double.promptFlow.find(x=>x.promptId==="PF-B-01").prompt,/角色B/);

const legacy=O.createProject({name:"已有旧项目"});
assert.equal(legacy.workflowMode,"legacy");
O.buildWorkflow(legacy);O.compilePromptFlow(legacy);
assert(legacy.promptFlow.length>6,"Historical detailed flow remains available");
assert(!legacy.promptFlow.some(x=>x.sixOutcomeId));
const fixture=O.testFixture();O.buildWorkflow(fixture);
assert.equal(fixture.promptFlow.length,52,"Established multi-video test fixture remains unchanged");

const html=fs.readFileSync(path.join(root,"apps/video-workspace/legacy-prompt-studio-v6.html"),"utf8");
const js=fs.readFileSync(path.join(root,"apps/video-workspace/studio.js"),"utf8");
const dynamic=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/index.html"),"utf8");
const app=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/creator-os-app.js"),"utf8");
assert(html.includes('id="simpleModeButton"')&&html.includes('id="advancedModeButton"'));
assert(html.includes("creator-six-deliverables.js?v=1"));
assert(js.includes("viewMode:'simple'")&&js.includes("state.viewMode==='simple'"));
assert(dynamic.includes('name="workflowMode"')&&dynamic.includes('value="six" selected'));
assert(dynamic.includes('../creator-six-deliverables.js?v=1'));
assert(app.includes('p.status="FLOW_READY"'));
assert(app.includes('O.compilePromptFlow(p)'));
console.log("Six outcome creator tests passed: six deliverables, legacy preserved, multi-video separated.");
