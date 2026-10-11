'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
const seed=(video='QA-VIDEO-ONE',note='')=>({schemaVersion:'gucc-publish-console-1',project:{creatorProjectId:'QA-BROWSER',videoId:video,title:'隔离多视频发布单',note},common:{videoPath:'C:\\private\\video.mp4',coverPath:'C:\\private\\cover.png'},source:{workspaceVersion:'creator-os-v3',handoff:{private:'local research copy'}},snapshots:[]});
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.GUCC_TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function setup({remote,hold=false,fail=false}={}){
  const records=new Map();if(remote)records.set(remote.video_id,clone(remote));let release;
  const requests=[],legacy=[];
  const context=await browser.newContext({serviceWorkers:'block'});
  await F.routes(context,{auth:true,cloud:{route:async(route,u)=>{
   if(u.pathname.endsWith('creator_os_save_publish_draft')){
    const body=route.request().postDataJSON();requests.push(body);
    if(fail)return route.fulfill({status:503,json:{message:'发布草稿保存失败'} });
    if(hold&&requests.length===1)await new Promise(r=>release=r);
    const row=records.get(body.p_video_id);
    if((row?.revision||0)!==body.p_expected_revision)return route.fulfill({json:{conflict:true,current:row}});
    const next={project_id:body.p_project_id,video_id:body.p_video_id,draft_data:clone(body.p_draft),revision:(row?.revision||0)+1};records.set(body.p_video_id,next);return route.fulfill({json:{conflict:false,current:next}});
   }
   if(u.pathname.endsWith('creator_os_publish_drafts')){
    const video=u.searchParams.get('video_id')?.replace(/^eq\./,'');return route.fulfill({json:video?[records.get(video)].filter(Boolean):Array.from(records.values())});
   }
   if(u.pathname.includes('creator-project-api')){legacy.push(route.request().postDataJSON());return route.fulfill({status:500,json:{error:'Legacy API must not receive independent video drafts'}});}
   return route.fulfill({json:[]});
  }}});
  await context.addInitScript(seed=>localStorage.setItem('gucc_publish_console_v1',JSON.stringify(seed)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://gucc.test/apps/publishing-console/');await page.waitForFunction(()=>window.GuccPublishDrafts);
  // Exercise the real compatibility bridge too: it must leave a video-scoped draft alone.
  await page.evaluate(()=>import('/assets/creator-pipeline-bridge.mjs'));
  return {context,page,records,requests,release:()=>release(),errors,legacy};
 }
 {
  const e=await setup({hold:true});await e.page.waitForFunction(()=>document.querySelector('#publishCloudState').textContent.includes('正在检查'));
  await e.page.fill('#projectNote','请求期间的新修改');await e.page.waitForTimeout(220);e.release();
  await e.page.waitForFunction(()=>document.querySelector('#publishCloudState').dataset.mode==='ok');
  assert.equal(e.requests.length,2);assert.equal(e.records.get('QA-VIDEO-ONE').draft_data.project.note,'请求期间的新修改');
  assert(!JSON.stringify(e.requests).includes('private'));assert(!e.requests[0].p_draft.preflight);assert.deepEqual(e.legacy,[]);assert.deepEqual(e.errors,[]);
  const handoff={schemaVersion:'gucc-creator-handoff-1',projectId:'QA-BROWSER',videoId:'QA-VIDEO-TWO',projectTitle:'第二条视频'};
  await e.page.locator('#workspaceFile').setInputFiles({name:'handoff.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(handoff))});await e.page.fill('#projectNote','独立的第二条视频发布文案');
  await e.page.waitForTimeout(250);await e.page.waitForFunction(()=>document.querySelector('#publishCloudState').dataset.mode==='ok');assert.equal(e.records.size,2);assert.equal(e.records.get('QA-VIDEO-ONE').draft_data.project.note,'请求期间的新修改');assert.equal(e.records.get('QA-VIDEO-TWO').draft_data.project.note,'独立的第二条视频发布文案');
  await e.context.close();
 }
 {
  const remote={project_id:'QA-BROWSER',video_id:'QA-VIDEO-ONE',revision:4,draft_data:seed('QA-VIDEO-ONE','云端的不同文案')};delete remote.draft_data.common.videoPath;delete remote.draft_data.common.coverPath;
  const e=await setup({remote});await e.page.waitForFunction(()=>document.querySelector('#publishCloudConflict')?.open);assert.equal(e.requests.length,0);await e.page.click('[data-choice="remote"]');
  await e.page.waitForFunction(()=>document.querySelector('#publishCloudState').dataset.mode==='ok');assert.equal(await e.page.inputValue('#projectNote'),'云端的不同文案');
  const all=await e.page.evaluate(()=>JSON.parse(localStorage.getItem('gucc_publish_video_drafts_v1')));assert(Object.keys(all).some(k=>k.startsWith('backup:')));assert.equal(await e.page.inputValue('#localVideoPath'),'C:\\private\\video.mp4');assert(!await e.page.evaluate(()=>GuccPublishDrafts.current().preflight.checkedAt));assert.deepEqual(e.legacy,[]);await e.context.close();
 }
 {
  const e=await setup({fail:true});await e.page.waitForFunction(()=>document.querySelector('#publishCloudState').dataset.mode==='error');assert.match(await e.page.textContent('#publishCloudState'),/失败/);assert.equal(e.records.size,0);assert.equal(await e.page.inputValue('#localVideoPath'),'C:\\private\\video.mp4');await e.context.close();
 }
 await browser.close();console.log('Publish cloud browser regression passed: video-scoped CAS, concurrent edits, independent drafts, conflict backups, local paths retained only on device, no legacy release writes and no false success after outage.');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
