'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
const out=path.resolve(__dirname,'../tmp/gucc-premium-browser');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.GUCC_TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});await fs.mkdir(out,{recursive:true});
 const errors=[];
 for(const width of [1600,1280,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},serviceWorkers:'block',reducedMotion:'reduce'});const p=F.project();await F.routes(context,{project:p});
  await context.addInitScript(p=>localStorage.setItem('gucc_creator_os_v2',JSON.stringify({projects:[p],selectedProjectId:p.projectId})),p);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  for(const [name,url] of Object.entries({portal:'/',studio:'/apps/video-workspace/legacy-prompt-studio-v6.html',creator:'/apps/video-workspace/production-system/',command:'/apps/command-center/',cover:'/apps/cover-generator/',publish:'/apps/publishing-console/',library:'/reference/resource-library.html'})){
   await page.goto('https://gucc.test'+url);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} ${width} horizontal overflow`);
   if(name==='command'){
    const metrics=await page.evaluate(()=>{
      const rail=document.querySelector('.gucc-shell-dock'),box=rail.getBoundingClientRect(),links=[...rail.querySelectorAll(':scope > a')];
      return {railWidth:box.width,railRight:box.right,appLeft:document.querySelector('#app').getBoundingClientRect().left,
        appWidth:document.querySelector('#app').getBoundingClientRect().width,viewport:innerWidth,
        labels:links.map(a=>{const t=a.querySelector('span'),r=t.getBoundingClientRect(),st=getComputedStyle(t);return {text:t.textContent,whiteSpace:st.whiteSpace,height:r.height,scrollWidth:t.scrollWidth,clientWidth:t.clientWidth};})};
    });
    assert.equal(metrics.labels.length,5,'Global Dock keeps five destinations');
    assert(metrics.labels.every(x=>x.whiteSpace==='nowrap'&&x.height<=22&&x.scrollWidth<=x.clientWidth+2),
      `No navigation label may stack vertically: ${JSON.stringify(metrics)}`);
    if(width>=1024){
      assert(metrics.railWidth>=78,`Desktop rail must be readable, got ${metrics.railWidth}`);
      assert(metrics.appLeft>=0&&metrics.appWidth>width*.67,'DB content should use available desktop width');
      assert(metrics.railRight<=width+1,'Rail stays inside desktop viewport');
    }else{
      assert(metrics.railWidth>=Math.min(width-24,350),'Mobile Dock should remain a full-width navigation bar');
    }
   }
   await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});
  }
  if(width===1280){
    await page.goto('https://gucc.test/apps/cover-generator/');await page.evaluate(()=>document.fonts.ready);
    await page.locator('#elementList .element-item').first().click();await page.fill('#propX','177');await page.dispatchEvent('#propX','input');
    await page.click('[data-ratio="r4_3"]');assert.notEqual(await page.inputValue('#propX'),'177');
    await page.click('[data-ratio="r16_9"]');assert.equal(await page.inputValue('#propX'),'177');
    for(const [key,w,h] of [['r16_9',1920,1080],['r4_3',1600,1200],['r3_4',1200,1600]]){
      for(const box of await page.locator('[data-export]').all())await box.uncheck();await page.locator(`[data-export="${key}"]`).check();
      await page.click(`[data-ratio="${key}"]`);await page.waitForTimeout(100);const preview=await page.locator('#exactPreview').evaluate(c=>c.toDataURL('image/png'));
      const downloaded=page.waitForEvent('download');await page.click('#exportBtn');const file=await (await downloaded).path();const png=await fs.readFile(file);assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);assert.deepEqual(png,Buffer.from(preview.split(",")[1],"base64"),"Export bytes must match the actual preview canvas");
    }
  }
  await page.goto('https://gucc.test/apps/video-workspace/production-system/');await page.waitForFunction(()=>window.GuccCreatorOS?.current()?.projectId==='QA-BROWSER');assert.equal(await page.locator('[data-branch]').count(),2);
  await page.locator('[data-branch="TWO"]').click();assert.equal(await page.locator('#flowList .flow-node').count(),1);await page.click('#clearBranchFilter');
  async function receipt(r){await page.click('#applyResultBtn');await page.fill('#resultInput',JSON.stringify(r));await page.click('#applyResultConfirm');}
  await receipt({promptId:'QA-1'});assert.equal(await page.evaluate(()=>GuccCreatorOS.current().promptFlow[0].status),'PENDING');await page.locator('#resultDialog').evaluate(d=>d.close());
  await receipt({projectId:'QA-BROWSER',promptId:'QA-1',status:'DONE',videoId:'QA-VIDEO-ONE',outputs:['SCRIPT.md']});assert.equal(await page.evaluate(()=>GuccCreatorOS.current().promptFlow[0].status),'DONE');assert.equal(await page.evaluate(()=>GuccCreatorOS.current().promptFlow[0].receiptEvidence.fileVerified),false);
  await page.click('#rewindTaskBtn');await page.click('#confirmRewindBtn');assert.equal(await page.evaluate(()=>GuccCreatorOS.current().promptFlow[0].status),'PENDING');
  await receipt({projectId:'QA-BROWSER',promptId:'QA-1',status:'NEED_INPUT'});assert.equal(await page.evaluate(()=>GuccCreatorOS.current().promptFlow[0].receiptEvidence.blocked),true);
  await page.click('#rewindTaskBtn');await page.click('#confirmRewindBtn');
  await page.click('#applyResultBtn');await page.fill('#resultInput',JSON.stringify({GUCC_FLOW_DIFF:{projectId:'QA-BROWSER',expectedFlowRevision:1,flowOps:[{op:'REORDER',promptId:'QA-2',toIndex:0}]}}));await page.click('#applyResultConfirm');assert.equal(await page.evaluate(()=>GuccCreatorOS.current().flowRevision),2);
  const download=page.waitForEvent('download');await page.locator('[data-handoff]').first().click();const d=await download;const file=await d.path();const handoff=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(handoff.videoId,'QA-VIDEO-ONE');
  await page.goto('https://gucc.test/apps/publishing-console/');const jsonFile=value=>({name:'handoff.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await page.locator('#workspaceFile').setInputFiles(jsonFile(handoff));await page.waitForFunction(()=>document.querySelector('#creatorIdentity').textContent.includes('QA-VIDEO-ONE'));await page.fill('#projectNote','第一条视频的独立备注');await page.waitForTimeout(300);
  await page.locator('#workspaceFile').setInputFiles(jsonFile({...handoff,videoId:'QA-VIDEO-TWO',projectTitle:'第二条视频'}));await page.waitForTimeout(300);assert.equal(await page.inputValue('#projectNote'),'');await page.locator('.publish-utilities > summary').click();await page.locator('.publish-local-drafts > summary').click();await page.selectOption('#publishDraftSelect',JSON.stringify(['QA-BROWSER','QA-VIDEO-ONE']));assert.equal(await page.inputValue('#projectNote'),'第一条视频的独立备注');await page.locator('.publish-utilities > summary').click();
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};});await page.fill('#projectNote','空间不足测试');await page.waitForTimeout(300);assert.match(await page.textContent('#saveState'),/未保存/);
  await context.close();
 }
 for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:1000},serviceWorkers:'block'}),requests=[];
   await F.routes(context,{auth:true,cloud:{route:async route=>{const body=route.request().postDataJSON();requests.push(body);return route.fulfill({json:{ok:true,data:[]}});}}});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://gucc.test/apps/command-center/');await page.waitForSelector('#charGame');
   for(const game of ['崩','绝','鸣','终','异','阴']){await page.selectOption('#charGame',game);await page.waitForTimeout(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   // Real DOM/layout regression: previous CSS leaked narrow, stacked actions into DB cards.
   await page.evaluate(()=>{
     const card=document.createElement('article');card.className='item';card.id='gucc-layout-sentinel';
     card.innerHTML='<div class="item-head"><div class="item-summary"><div class="item-title">排版检查角色</div></div><div class="actions"><button type="button">收起</button><button type="button">详情/编辑</button><button type="button">删除</button></div></div>';
     document.querySelector('#characterResults').appendChild(card);
   });
   const card=await page.locator('#gucc-layout-sentinel .actions').evaluate(el=>{
      const b=[...el.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
      return {rect:el.getBoundingClientRect().toJSON(),buttons:b.map(x=>x.toJSON())};
   });
   assert(card.buttons.every(x=>x.width>=60&&x.height>=35),'DB action buttons must remain readable and touchable');
   if(width>=1024)assert(Math.max(...card.buttons.map(x=>x.y))-Math.min(...card.buttons.map(x=>x.y))<4,'DB desktop actions must not stack in a column');
   await page.locator('#gucc-layout-sentinel').remove();
   await page.screenshot({path:path.join(out,`command-workspace-${width}.png`),fullPage:true});assert(await page.locator('.gucc-shell-dock').isVisible());await page.click('#newCharBtn');await page.waitForSelector('#characterEditor[aria-modal="true"]');assert.equal(await page.locator('.gucc-shell-dock').isVisible(),false);await page.screenshot({path:path.join(out,`command-drawer-${width}.png`),fullPage:true});await page.keyboard.press('Escape');assert.equal(await page.locator('#characterEditor').isVisible(),false);assert(await page.locator('.gucc-shell-dock').isVisible());assert(!requests.some(r=>r?.action?.startsWith('save')));await context.close();
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('Premium browser regression passed: 7 pages × 3 widths; branch filters, strict receipts, rollback, DIFF, per-video handoff/drafts, quota failures, independent cover layouts and actual PNG dimensions, reduced motion. Production network is blocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
