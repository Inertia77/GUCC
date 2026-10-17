'use strict';
// Actual Chromium rendering with isolated auth/data. Never connects to production.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { fixture } = require('./gucc-unified-fixture.cjs');
const out = path.resolve('tmp/atelier-polish-interactions');
const routes = {creator:'/apps/video-workspace/production-system/',studio:'/apps/video-workspace/legacy-prompt-studio-v6.html',publish:'/apps/publishing-console/',cover:'/apps/cover-generator/'};
let browser;
(async()=>{
 await fs.mkdir(out,{recursive:true});
 browser = await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const f=fixture(),c=await browser.newContext({serviceWorkers:'block',hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 await f.install(c);
 await c.grantPermissions(['clipboard-read','clipboard-write']);
 const p=await c.newPage(),errors=[],metrics=[];
 p.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>{await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});};
 const go=async(name)=>{await p.goto(f.origin+routes[name]+'?project=A&video=FIONI');await p.waitForFunction(()=>window.GuccCreatorWorkspace?.context().videoId==='FIONI');await p.waitForFunction(()=>!document.querySelector('.gcc-outcome-trigger').textContent.includes('读取中'));};
 const choose=async(label,index)=>{
  await p.getByRole('button',{name:'选择'+label,exact:true}).click();
  const sheet=p.getByRole('dialog',{name:'选择'+label,exact:true});
  assert(await sheet.isVisible());assert(!(await p.locator('.gucc-shell-dock').isVisible()));
  const b=sheet.locator('nav > button').nth(index);const expected=(await b.locator('span').nth(1).innerText()).trim();
  await b.click();
  assert.equal((await p.getByRole('button',{name:'选择'+label,exact:true}).innerText()).trim(),expected);
  assert(!(await sheet.isVisible()));
  return expected;
 };
 // Every workspace remains reachable with a full label at all three phone widths.
 for(const [width,height] of [[360,800],[390,844],[430,932]]){
  await p.setViewportSize({width,height});await go('creator');
  const dock=p.locator('.gucc-shell-dock'),bounds=await dock.boundingBox();
  assert(bounds.height<=58,'Dock should remain quiet and compact');
  for(const link of await dock.locator(':scope > a').all()){
   const box=await link.boundingBox();assert(box.width>=44&&box.height>=44,'Dock keeps touch targets');
  }
  await p.getByRole('button',{name:'选择工作区',exact:true}).click();
  await shot(`creator-navigation-${width}`);
  for(let i=0;i<14;i++)await p.keyboard.press('Tab');
  assert(await p.getByRole('dialog',{name:'选择工作区'}).evaluate(d=>d===document.activeElement||d.contains(document.activeElement)),'Sheet traps keyboard focus (dialog container itself is a valid focus stop)');
  await p.keyboard.press('Escape');
  await p.waitForFunction(()=>document.querySelector('[aria-label=选择工作区]').getAttribute('aria-expanded')==='false');
  for(let i=3;i>=0;i--){await choose('工作区',i);assert(await p.locator(['#view-outcomes','#view-creation','#view-release','#view-knowledge'][i]).isVisible());}
  assert(await p.locator('.os-nav').isHidden(),'No duplicate phone navigation');
  await shot(`creator-returned-${width}`);
  await p.evaluate(()=>window.scrollTo({top:450,behavior:'instant'}));
  assert(Math.abs((await p.getByRole('button',{name:'选择工作区',exact:true}).boundingBox()).y)<4,'Current workspace remains visible while scrolling');
  if(width===390)await shot('creator-scroll-390');
  metrics.push({width,dockHeight:bounds.height,minTouch:44});
 }
 await p.setViewportSize({width:768,height:1024});await go('studio');
 for (const title of await p.locator('.six-step-copy strong').all()) {
  assert((await title.boundingBox()).height<50,'Tablet outcome labels must not collapse into vertical text');
 }
 await shot('studio-tablet-768');
 await p.setViewportSize({width:390,height:844});await go('studio');
 await p.getByRole('button',{name:'选择成果',exact:true}).click();await shot('studio-outcomes-390');await p.keyboard.press('Escape');
 for(let i=5;i>=0;i--){const name=await choose('成果',i);assert.equal(await p.locator('#taskTitle').innerText(),name);assert((await p.inputValue('#promptText')).length>100);}
 await p.locator('#copyButton').click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),await p.inputValue('#promptText'),'Copy contains the complete actual Prompt');
 await p.locator('#advancedModeButton').click();assert(await p.locator('#taskList').isVisible());await p.locator('#simpleModeButton').click();
 // Keyboard focus plus a reduced viewport exercises layout while text entry owns the phone.
 await p.locator('#promptText').focus();await p.setViewportSize({width:390,height:500});
 assert(!(await p.locator('.gucc-shell-dock').isVisible()),'Dock yields to text input');await shot('studio-keyboard-layout-390');
 await p.locator('#promptText').blur();await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>!document.body.classList.contains('gucc-shell-keyboard'));
 assert(await p.locator('.gucc-shell-dock').isVisible(),'Dock recovers after text input');
 await p.getByRole('button',{name:'创作',exact:true}).click();await shot('dock-menu-390');await p.keyboard.press('Escape');
 assert.equal(await p.getByRole('button',{name:'创作',exact:true}).getAttribute('aria-expanded'),'false');
 await go('publish');await p.getByRole('button',{name:'选择流程',exact:true}).click();await shot('publish-flow-390');await p.keyboard.press('Escape');
 for(const i of [1,2,3,0]){await choose('流程',i);assert(await p.locator(['#view-prepare','#view-preflight','#view-execute','#view-review'][i]).isVisible());}
 await p.getByRole('button',{name:'选择平台',exact:true}).click();await shot('publish-platforms-390');await p.keyboard.press('Escape');
 for(const i of [0,1,2,3,4,5]){
  await choose('平台',i);assert.equal(await p.locator('.platform-form:visible').count(),1);
  if([0,3,5].includes(i))await shot(`publish-platform-${i}-390`);
 }
 await p.locator('.platform-form:visible textarea').first().focus();await p.setViewportSize({width:390,height:500});
 assert(!(await p.locator('.gucc-shell-dock').isVisible()));await shot('publish-keyboard-layout-390');
 await p.setViewportSize({width:390,height:844});await p.locator('.platform-form:visible textarea').first().blur();
 await p.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await shot('publish-bottom-390');
 const last=await p.locator('.sticky-actions:visible').boundingBox(),dock=await p.locator('.gucc-shell-dock').boundingBox();
 assert(last.y+last.height<dock.y,'Final actions stay clear of Dock');
 await go('cover');
 for(const view of ['materials','inspector','canvas']){await p.locator(`[data-cover-view="${view}"]`).click();await shot(`cover-${view}-390`);}
 // Actual exports and preview equality are covered by test-gucc-premium-browser.cjs.
 assert.equal(f.writes.length,0,'Navigation, copy, panels and preview must not write formal projects or deliverables');
 // Completed projects continue to foreground their outcome overview.
 f.snapshots.A.completedAt='2026-10-15T00:00:00Z';await go('creator');await shot('creator-completed-390');
 assert(await p.locator('#view-outcomes').isVisible());assert(!(await p.locator('#copyCurrentPrompt').isVisible()));
 // Long project/video names remain readable inside selectors and do not widen the page.
 f.projectRows[0].name='绝区零 3.3｜菲欧妮与赛维里安双视频前瞻项目｜共享研究资料与多视频制作';
 f.videos.get(f.key('A','FIONI')).title='菲欧妮角色解析｜机制、队伍与实战策略的完整制作版本';
 f.snapshots.A.videos[0].name=f.videos.get(f.key('A','FIONI')).title;
 await go('studio');await shot('long-identity-390');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.locator('.gcc-context-trigger').click();assert.match(await p.locator('.gcc-connection').innerText(),/菲欧妮角色解析/);await shot('long-identity-selector-390');await p.keyboard.press('Escape');
 await p.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await p.locator('.gucc-shell-link').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await p.keyboard.press('Tab');await p.locator('.gcc-context-trigger').focus();assert.notEqual(await p.locator('.gcc-context-trigger').evaluate(e=>getComputedStyle(e).outlineStyle),'none','Keyboard focus stays visible');
 const empty=fixture();empty.projectRows.splice(0);for(const id of Object.keys(empty.snapshots))delete empty.snapshots[id];empty.videos.clear();
 const ec=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});await empty.install(ec);const ep=await ec.newPage();
 await ep.goto(empty.origin+'/');await ep.waitForFunction(()=>document.querySelector('.gcc-context-trigger'));
 await ep.evaluate(()=>document.fonts.ready);await ep.screenshot({path:path.join(out,'portal-empty-390.png'),animations:'disabled'});assert.equal(empty.writes.length,0);await ec.close();
 // Desktop regression: full Chinese labels must never collapse into vertical glyphs.
 await p.setViewportSize({width:1440,height:900});await go('creator');
 const desktopDock=p.locator('.gucc-shell-dock');
 const desktopBounds=await desktopDock.boundingBox();
 assert(desktopBounds.width>=90&&desktopBounds.width<=110,'Desktop Dock has a legible dedicated rail');
 for(const entry of await desktopDock.locator(':scope > :is(a,button)').all()){
  const label=entry.locator(':scope > span');
  if(await label.count()){
   const bb=await label.boundingBox();
   const style=await label.evaluate(e=>({whiteSpace:getComputedStyle(e).whiteSpace,writingMode:getComputedStyle(e).writingMode}));
   assert(style.whiteSpace==='nowrap'&&style.writingMode==='horizontal-tb','Desktop Dock labels must have horizontal no-wrap styles');
   assert(bb.width>=10,'Desktop Dock label must have usable horizontal width (short labels such as DB are allowed)');
  }
 }
 await shot('creator-desktop-dock-1440');
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Desktop Dock must not cause horizontal overflow');
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({source:'isolated actual Chromium; synthetic records; viewport reduction models keyboard layout, not an Android OS keyboard',metrics,errors,formalWrites:f.writes.length},null,2));
 await browser.close();console.log('Atelier polish interactions passed: all workspace/outcome/platform choices, Dock, keyboard layout, copy, panels, completed/long identity and no formal writes.');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
