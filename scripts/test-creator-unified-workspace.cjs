"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const source=p=>fs.readFileSync(path.join(root,p),"utf8");
const store=new Map();
global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const C=require("../assets/creator-shared-context.js");
assert.equal(C.valid("DRAFT-1791527976562"),true);
assert.equal(C.valid("GAME-CURRENT-一次性同时做绝区零3.3版本的菲欧妮"),true);
assert.equal(C.valid("ZZZ-3.3-PHOENIX-PREVIEW"),true);
assert.equal(C.valid("a?bad"),false);
assert.equal(C.videosFor({videos:[{videoId:"ZZZ-3.3-PHOENIX-PREVIEW",branch:"FIONI",name:"菲欧妮"}]})[0].branch,"FIONI");
assert.equal(C.valid("<script>"),false);
assert.equal(C.valid(""),false);
assert.deepEqual(C.candidate("?project=%E7%BB%9D%E5%8C%BA%E9%9B%B6&video=FIONI"),{projectId:"绝区零",videoId:"FIONI"});
assert.deepEqual(C.clean({projectId:"P",videoId:"V"}),{projectId:"P",videoId:"V"});
assert.equal(C.set({projectId:"P",videoId:"FIONI"}).videoId,"FIONI");
assert.equal(C.read().projectId,"P");
assert.equal(C.url("https://gucc.test/GUCC/apps/cover-generator/",{projectId:"A",videoId:"V"}),"https://gucc.test/GUCC/apps/cover-generator/?project=A&video=V");
assert.deepEqual(C.videosFor({videos:[{videoId:"FIONI",name:"菲欧妮"},{videoId:"FIONI",name:"重复"},{videoId:"SEVERIAN",name:"赛维里安"}]}).map(v=>v.videoId),["FIONI","SEVERIAN"]);
assert.deepEqual(C.legacyBranches({promptFlow:[{branch:"SHARED"},{branch:"FIONI"},{branch:"FIONI"},{branch:"SEVERIAN"}]}),["FIONI","SEVERIAN"]);
const workflow=require("../apps/video-workspace/production-system/orchestrator.js");
const V=require("../apps/video-workspace/production-system/creator-os-validation.js");
const project=workflow.createProject({projectId:"P",name:"P",workflowMode:"six",videos:[{videoId:"MAIN",name:"主视频"}]});
workflow.buildWorkflow(project);workflow.compilePromptFlow(project);
assert.equal(project.promptFlow.length,6);
assert.equal(project.promptFlow[0].videoId,"MAIN");
assert.equal(project.promptFlow[0].branch,"MAIN");
assert.equal(project.promptFlow[0].promptId,"PF-MAIN-01");
const legacy={videos:[{videoId:"FIONI",name:"菲欧妮"}],promptFlow:[{branch:"FIONI"},{branch:"SEVERIAN"},{branch:"SHARED"}]};
const tracks=V.tracks(legacy);
assert.deepEqual(tracks.map(x=>x.videoId),["FIONI","SEVERIAN"]);
assert.equal(tracks[1].inferred,true);
const migration=source("supabase/migrations/20261014100315_unified_creative_workspace_video_outcomes_20261014.sql");
assert.match(migration,/create table if not exists public.creator_video_workspaces/i);
assert.match(migration,/create table if not exists public.creator_deliverable_records/i);
assert.match(migration,/creator_workspace_save_deliverable/);
assert.match(migration,/enable row level security/gi);
assert.match(migration,/Confirmed requires an observed file and human QC/);
assert.doesNotMatch(migration,/grant delete/i);
assert(!fs.existsSync(path.join(root,"supabase/migrations/20261015100000_creator_video_six_deliverables.sql")),"Do not introduce a duplicate production schema");
for(const [url,adapter] of [
 ["apps/video-workspace/legacy-prompt-studio-v6.html","studio.js"],
 ["apps/video-workspace/production-system/index.html","production-system/creator-os-app.js"],
 ["apps/cover-generator/index.html",null],
 ["apps/publishing-console/index.html","app.js"]]){
 assert.match(source(url),/creator-shared-context\.js\?v=2/);
 assert.match(source(url),/creator-shared-context-ui\.mjs\?v=2/);
 if(adapter)assert.match(source("apps/"+(url.includes("video-workspace")?"video-workspace/":"publishing-console/")+adapter),/GuccCreatorWorkspaceAdapter/);
}
const studio=source("apps/video-workspace/studio.js");
assert.match(studio,/gucc_creator_studio_scoped_drafts_v1/);
const cover=source("apps/cover-generator/index.html");
assert.match(cover,/gucc_cover_project_video_drafts_v1/);
const publish=source("apps/publishing-console/app.js");
assert.match(publish,/draftKey\(/);
assert.match(publish,/applyCreatorContext/);
console.log("Creator unified workspace contracts: Unicode identities, scoped drafts, explicit video registration and RLS migration verified.");
