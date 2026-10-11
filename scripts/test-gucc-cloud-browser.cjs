'use strict';
const assert=require('node:assert/strict');const {chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.GUCC_TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function setup({remoteName,fail=false,hold=false}={}){
  const p=F.project();p.localFolderPath='C:\\private\\local-only';let row={project_id:p.projectId,project_data:clone(p),revision:1};delete row.project_data.localFolderPath;if(remoteName)row.project_data.name=remoteName;
  const requests=[];let release;
  const context=await browser.newContext({serviceWorkers:'block'});await F.routes(context,{project:p,auth:true,cloud:{route:async(route,u)=>{
   if(u.pathname.endsWith('creator_os_save_project')){
    const body=route.request().postDataJSON();requests.push(body);
    if(fail)return route.fulfill({status:503,json:{message:'Temporary network outage'}});
    if(hold&&requests.length===1)await new Promise(r=>release=r);
    if(body.p_expected_revision!==row.revision)return route.fulfill({status:409,json:{message:'GUCC_REVISION_CONFLICT'}});
    row={...row,project_data:clone(body.p_project),revision:row.revision+1};return route.fulfill({json:row});
   }
   return route.fulfill({json:[row]});
  }}});await context.addInitScript(p=>localStorage.setItem('gucc_creator_os_v2',JSON.stringify({projects:[p],selectedProjectId:p.projectId})),p);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://gucc.test/apps/video-workspace/production-system/');await page.waitForFunction(()=>window.GuccCreatorOS);
  return {context,page,requests,release:()=>release(),row:()=>row,errors};
 }
 {
  const e=await setup({hold:true});await e.page.waitForFunction(()=>document.querySelector('#cloudSyncStatus').dataset.state==='ok');assert.equal(e.requests.length,0);
  await e.page.evaluate(()=>{const p=GuccCreatorOS.current();p.name='编辑一';GuccCreatorOS.putProject(p);});await e.page.waitForFunction(()=>document.querySelector('#cloudSyncStatus').textContent.includes('正在保存'));
  await e.page.evaluate(()=>{const p=GuccCreatorOS.current();p.name='编辑二';GuccCreatorOS.putProject(p);});e.release();
  await e.page.waitForFunction(()=>document.querySelector('#cloudSyncStatus').dataset.state==='ok');assert.deepEqual(e.requests.map(r=>r.p_project.name),['编辑一','编辑二']);assert.equal(e.row().project_data.name,'编辑二');assert(!JSON.stringify(e.requests).includes('private'));
  const bases=await e.page.evaluate(()=>JSON.parse(localStorage.getItem('gucc_creator_os_cloud_bases_v1')));assert(bases['QA-BROWSER'].hash);assert(!bases['QA-BROWSER'].project);assert.deepEqual(e.errors,[]);await e.context.close();
 }
 {
  const e=await setup({fail:true});await e.page.waitForFunction(()=>document.querySelector('#cloudSyncStatus').dataset.state==='ok');await e.page.evaluate(()=>{const p=GuccCreatorOS.current();p.name='网络失败后的本地编辑';GuccCreatorOS.putProject(p);});await e.page.waitForFunction(()=>document.querySelector('#cloudSyncStatus').dataset.state==='error');await e.page.waitForTimeout(150);assert.equal(await e.page.locator('#cloudConflictDialog').evaluate(d=>d.open),false);assert.equal(e.row().revision,1);assert.match(await e.page.textContent('#cloudSyncStatus'),/失败/);await e.context.close();
 }
 {
  const e=await setup({remoteName:'不同的云端版本'});await e.page.waitForFunction(()=>document.querySelector('#cloudConflictDialog').open);await e.page.click('[data-cloud-choice="local"]');await e.page.waitForFunction(()=>!document.querySelector('#cloudConflictDialog').open);const state=await e.page.evaluate(()=>GuccCreatorOS.current());assert.equal(state.conflictBackups[0].snapshot.name,'不同的云端版本');assert.equal(e.requests.length,1);assert.equal(e.row().revision,2);await e.context.close();
 }
 await browser.close();console.log('Cloud browser regression passed: concurrent edits survive, SHA-256 compact bases, local paths excluded, no false sync after outage, both conflict versions retained. All APIs are isolated fixtures.');
})().catch(e=>{console.error(e);process.exitCode=1});
