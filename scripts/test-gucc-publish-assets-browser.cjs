'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
let browser;
const seed={schemaVersion:'gucc-publish-console-1',project:{creatorProjectId:'QA-BROWSER',videoId:'ONE',title:'路径登记与视频身份回归'},common:{videoPath:'C:\\private\\ONE\\FINAL_MASTER.mp4'},source:{workspaceVersion:'creator-os-v3'}};
const handoff={schemaVersion:'gucc-creator-handoff-1',projectId:'QA-BROWSER',videoId:'TWO',projectTitle:'独立的第二条视频'};
const file={name:'handoff.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(handoff))};
(async()=>{
 browser=await chromium.launch({executablePath:process.env.GUCC_TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block'});await F.routes(context);
 const requests=[];let resolveFirst;
 await context.route('http://127.0.0.1:17877/**',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api/health')return route.fulfill({status:503,json:{ok:false}});
  if(u.pathname!=='/api/discover-project-assets')throw Error('Unexpected fixture request');
  const id=route.request().postDataJSON();requests.push(id);if(requests.length===1)await new Promise(r=>resolveFirst=r);
  return route.fulfill({json:{ok:true,...id,status:'resolved',video:{status:'found',name:'FINAL_MASTER.mp4',path:`C:\\private\\${id.videoId}\\FINAL_MASTER.mp4`,sizeBytes:1088},covers:{preferred:{status:'missing'}}}});
 });
 await context.addInitScript(seed=>localStorage.setItem('gucc_publish_console_v1',JSON.stringify(seed)),seed);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://gucc.test/apps/publishing-console/');
 await page.click('#goPreflightButton');assert.match(await page.textContent('#checkResults'),/核验实际文件/);assert.deepEqual(errors,[]);
 await page.click('[data-view="prepare"]');await page.click('#discoverProjectAssetsButton');await page.waitForTimeout(100);
 await page.locator('#workspaceFile').setInputFiles(file);resolveFirst();await page.waitForTimeout(250);
 assert.equal(await page.inputValue('#localVideoPath'),'','late result from ONE cannot change TWO');assert.deepEqual(requests[0],{projectId:'QA-BROWSER',videoId:'ONE'});
 await page.click('#discoverProjectAssetsButton');await page.waitForTimeout(250);
 assert.equal(await page.inputValue('#localVideoPath'),'C:\\private\\TWO\\FINAL_MASTER.mp4');assert.equal(await page.locator('#videoFile').evaluate(e=>e.files.length),0,'no placeholder browser File');
 assert.equal(await page.evaluate(()=>GuccPublishDrafts.current().common.video.registration),'assistant-path');assert.equal(await page.evaluate(()=>GuccPublishDrafts.current().common.video.size),1088);
 await page.locator('#videoFile').setInputFiles({name:'manual.mp4',mimeType:'video/mp4',buffer:Buffer.from('real browser-selected fixture bytes')});
 assert.equal(await page.inputValue('#localVideoPath'),'','manual browser file clears a previous assistant path');await page.click('#discoverProjectAssetsButton');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>GuccPublishDrafts.current().common.video.name),'manual.mp4');assert.match(await page.textContent('#videoMeta'),/保留当前手动选择/);assert.deepEqual(errors,[]);
 await context.close();
 const jobContext=await browser.newContext({serviceWorkers:'block'});await F.routes(jobContext);let releaseJob;
 await jobContext.route('http://127.0.0.1:17877/**',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/api/health')return route.fulfill({json:{ok:true}});
  if(u.pathname.startsWith('/api/jobs/')){await new Promise(r=>releaseJob=r);return route.fulfill({json:{ok:true,job:{id:'QA-JOB-ONE',status:'completed',platforms:{bilibili:{status:'ready_for_review'}}}}});}
  return route.fulfill({json:{ok:false}});
 });
 await jobContext.addInitScript(seed=>localStorage.setItem('gucc_publish_console_v1',JSON.stringify({...seed,assistantJobId:'QA-JOB-ONE',assistantJobStatus:'running'})),seed);
 const jobPage=await jobContext.newPage();await jobPage.goto('https://gucc.test/apps/publishing-console/');await jobPage.waitForTimeout(120);await jobPage.locator('#workspaceFile').setInputFiles(file);releaseJob();await jobPage.waitForTimeout(200);
 assert.equal(await jobPage.evaluate(()=>GuccPublishDrafts.current().execution.bilibili.status),'未开始','old video job cannot advance the new video');await jobContext.close();
 await browser.close();console.log('Publish assets browser regression passed: path-only preflight, scoped assistant discovery, stale reply discarded, no zero-byte placeholders, manual selection wins and previous video jobs cannot overwrite the active draft.');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
