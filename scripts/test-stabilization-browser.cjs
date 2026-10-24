'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright-core'),{fixture}=require('./gucc-unified-fixture.cjs');
(async()=>{
 const out=path.resolve('tmp/stabilization-browser');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),F=fixture(),errors=[],records=[],reports=[];
  F.projectRows[0].totalDeliverables=12;F.projectRows[0].confirmedDeliverables=6;F.projectRows[0].videoCount=2;
  F.projectRows[1].totalDeliverables=6;F.projectRows[1].confirmedDeliverables=0;F.projectRows[1].videoCount=1;
  F.snapshots.A.completedAt='2026-10-01T00:00:00Z';F.snapshots.B.name='长中文标题｜角色机制与配队策略、资源规划及实战操作的完整说明';F.projectRows[1].name=F.snapshots.B.name;
  await F.install(context);
  await context.route('**/rest/v1/rpc/creator_*',async route=>{
   const u=new URL(route.request().url()),name=u.pathname.split('/').pop(),b=route.request().postDataJSON();
   if(name==='creator_publication_history')return route.fulfill({json:records.filter(r=>r.project_id===b.p_project_id&&r.video_id===b.p_video_id).slice().reverse()});
   if(name==='creator_record_publication'){
    const p=b.p_payload,old=records.find(r=>r.metadata.requestId===p.requestId);if(old)return route.fulfill({json:old});
    const row={publication_id:crypto.randomUUID(),project_id:b.p_project_id,video_id:b.p_video_id,status:p.status,post_url:p.postUrl,post_id:p.postId,created_at:new Date().toISOString(),failure_reason:p.note,metadata:{platformKey:p.platform,requestId:p.requestId}};records.push(row);return route.fulfill({json:row});
   }
   if(name==='creator_record_performance'){reports.push(b);return route.fulfill({json:{performance_report_id:crypto.randomUUID(),publication_id:b.p_publication_id}});}
   return route.fallback();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(F.origin+'/apps/publishing-console/?project=A&video=FIONI');await page.waitForFunction(()=>window.GuccPublishDrafts?.current().project.videoId==='FIONI');
  await page.locator('.flow-nav [data-view="execute"]').click();
  const status=key=>page.locator(`[data-exec-field="status"][data-exec-platform="${key}"]`),link=key=>page.locator(`[data-exec-field="postUrl"][data-exec-platform="${key}"]`),button=key=>page.locator(`[data-record-publication="${key}"] button`);
  await button('bilibili').waitFor();await status('bilibili').selectOption('失败 / 待处理');await button('bilibili').click();await page.waitForFunction(()=>document.querySelector('[data-record-publication=bilibili] small')?.textContent.includes('1 次'));
  await status('bilibili').selectOption('已发布');await link('bilibili').fill('https://example.invalid/isolated/bv1');await button('bilibili').click();await page.waitForFunction(()=>document.querySelector('[data-record-publication=bilibili] small')?.textContent.includes('2 次'));
  assert.equal(records.length,2);assert.equal(records[1].video_id,'FIONI');assert.equal(records[0].status,'FAILED');assert.equal(records[1].status,'PUBLISHED');
  await page.locator('.flow-nav [data-view="review"]').click();await page.locator('#snapshotPlatform').selectOption('bilibili');await page.locator('#snapshotPublication').selectOption(records[1].publication_id);await page.locator('#metricViews').fill('300');await page.locator('#snapshotForm button[type="submit"]').click();
  assert.equal((await page.evaluate(()=>window.GuccPublishDrafts.current().snapshots))[0].publicationId,records[1].publication_id);
  await page.getByRole('button',{name:'同步已关联的复盘快照',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.publication-record-feedback')?.textContent.includes('同步 1 条'));
  assert.equal(reports.length,1);assert.equal(reports[0].p_video_id,'FIONI');assert(reports[0].p_snapshot.capturedAt.endsWith('Z'));
  await page.goto(F.origin+'/apps/publishing-console/?project=A&video=SEVERIAN');await page.waitForFunction(()=>window.GuccPublishDrafts?.current().project.videoId==='SEVERIAN');assert.equal((await page.evaluate(()=>window.GuccPublishDrafts.current().snapshots)).length,0);
  await page.locator('.flow-nav [data-view="execute"]').click();await button('bilibili').waitFor();assert.match(await page.locator('[data-record-publication=bilibili] small').textContent(),/尚未登记/);assert.equal(records.length,2);
  for(const width of [320,360,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(F.origin+'/');await page.waitForSelector('.cp-project');assert.match(await page.locator('.cp-project-side').first().textContent(),/正式成果 0\/6/);assert.equal(await page.locator('.cp-task').count(),1);assert(!await page.locator('.cp-task').textContent().then(t=>t.includes('绝区零双视频')));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Portal overflow '+width);await page.screenshot({path:path.join(out,`portal-${width}.png`),animations:'disabled'});
   for(const view of ['outcomes','creation','release','knowledge']){
    await page.goto(F.origin+'/apps/video-workspace/production-system/?project=B&video=MAIN&view='+view);await page.waitForSelector('[data-creator-context] .gcc-context-trigger');await page.evaluate(()=>document.fonts.ready);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view+' overflow '+width);await page.screenshot({path:path.join(out,`${view}-${width}.png`),animations:'disabled'});
   }
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({viewports:[320,360,390,430,768,1024,1440],records:records.length,reports:reports.length,productionWrites:0},null,2));
  console.log('Stabilization Chromium: manual publication history/retry, metrics association, video isolation; portal + four workspaces at 7 widths, real screenshots, zero production writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
