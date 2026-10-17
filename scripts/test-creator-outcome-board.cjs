"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const Outcomes=require("../apps/video-workspace/production-system/creator-os-outcomes.js");
const O=require("../apps/video-workspace/production-system/orchestrator.js");
const html=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/index.html"),"utf8");
const app=fs.readFileSync(path.join(root,"apps/video-workspace/production-system/creator-os-app.js"),"utf8");
const p=O.createProject({projectId:"PROJECT-OUTCOMES-TEST",name:"独立成果",workflowMode:"six"});
p.videos=[{videoId:"FIONI",branch:"FIONI",name:"菲欧妮"},{videoId:"SEVERIAN",branch:"SEVERIAN",name:"赛维里安"}];
O.buildWorkflow(p);
const [f,s]=Outcomes.videos(p);
assert.equal(f.key,"FIONI");assert.equal(s.key,"SEVERIAN");
const empty=Outcomes.summary([],f);
assert.equal(empty.loaded,true);assert.equal(empty.done,0);assert.equal(empty.total,6);
assert.equal(Outcomes.summary(null,f).loaded,false,"Absent canonical data cannot become six false unstarted items");
const rows=[
 {video_id:"FIONI",deliverable_key:"script",status:"confirmed",revision:3,evidence:{artifacts:[{fileName:"SCRIPT_FINAL.md"}]}},
 {video_id:"SEVERIAN",deliverable_key:"script",status:"review",revision:1,evidence:{}},
 {video_id:"FIONI",deliverable_key:"subtitle",status:"blocked",revision:2,evidence:{}},
 {video_id:"SEVERIAN",deliverable_key:"visual",status:"confirmed",revision:2,evidence:{fileName:"animation.mp4"}},
 {video_id:"OTHER",deliverable_key:"sound",status:"confirmed",revision:1,evidence:{}},
];
assert.equal(Outcomes.record(rows,f,"script").status,"confirmed");
assert.equal(Outcomes.summary(rows,f).done,1);
assert.equal(Outcomes.summary(rows,s).done,1,"Video-scoped confirmed status");
assert.equal(Outcomes.summary(rows,f).percent,17);
assert.equal(Outcomes.evidenceLabel(rows[0]),"SCRIPT_FINAL.md");
assert.equal(Outcomes.record(rows,s,"subtitle"),null);
assert.equal(Outcomes.record(rows,f,"not-an-outcome"),null);
const old=O.createProject({projectId:"PROJECT-LEGACY-TEST",name:"旧动态",workflowMode:"six"});
O.buildWorkflow(old);
old.promptFlow.find(n=>n.sixOutcomeId==="script").status="DONE";
const v=Outcomes.videos(old);
assert.deepEqual(v.map(x=>x.key),[],"Shared pseudo-video is not an official deliverable identity");
assert.equal(Outcomes.summary([],null).loaded,false,"A Prompt DONE is never formal completion");
assert(html.includes('id="view-outcomes"')&&html.includes('id="outcomeRefresh"'));
assert(html.includes('creator-os-outcomes.js?v=1')&&html.includes('creator-os-outcomes.css?v=1'));
assert(app.includes("GuccCreatorContextUI")&&app.includes("loadCanonicalOutcomes"));
assert(!app.includes("outcomeProgress[video.key]"),"No second source of deliverable truth");
console.log("Standalone Creator outcomes contract passed: canonical records, loading integrity, six statuses, per-video identity, verified artifact labels.");
