'use strict';
// Actual Chromium, local repository + isolated fixture API. No production data writes.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
const phase=process.env.MOBILE_REPAIR_PHASE||'after',verify=phase!=='before',out=path.resolve('tmp/mobile-reference-'+phase);
const sizes=[[320,740],[360,800],[390,844],[430,932],[768,1024],[1440,900],[1920,1080],[1024,768]];
const pages={db:'/apps/command-center/',story:'/reference/story-library.html',prompt:'/reference/ai-prompts.html',resource:'/reference/resource-library.html'};
let browser;
(async()=>{
 await fs.mkdir(out,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const c=await browser.newContext({serviceWorkers:'block',hasTouch:true,isMobile:true}),writes=[],errors=[],metrics=[];
 await F.routes(c,{repo:process.env.MOBILE_REPAIR_REPO||path.resolve(__dirname,'..'),auth:true,cloud:{route:async route=>{
  const req=route.request().postDataJSON();if(/^(save|delete|update|create)/i.test(req?.action))writes.push(req);
  const row={id:'isolated-layout-example',character_name:'界面验收示例',full_name:'界面验收示例（隔离数据）',game_code:req?.payload?.game_code||'终',research_status:'✕',build_status:'△',research_note:'仅用于排版回归，不对应真实角色或正式记录。'};
  return route.fulfill({json:{ok:true,data:req?.action==='searchCharacters'?[row]:[]}});
 }}});
 const p=await c.newPage();c.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>{await p.mouse.move(0,0);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});};
 const go=async name=>{await p.goto('https://gucc.test'+pages[name]);await p.waitForSelector('.gucc-shell-dock');if(name==='db')await p.waitForSelector('#characterResults .item');if(name==='story')await p.waitForFunction(()=>document.querySelector('#doc')?.textContent.includes('崩坏'));await p.evaluate(()=>document.fonts.ready);};
 for(const [w,h]of sizes){
  await p.setViewportSize({width:w,height:h});
  for(const name of Object.keys(pages)){
   await go(name);await shot(name+'-'+w);
   const info=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,links:[...document.querySelectorAll('.gucc-shell-dock>a')].map(a=>{const span=a.querySelector('span'),s=getComputedStyle(span),r=span.getBoundingClientRect(),ar=a.getBoundingClientRect();return{text:span.textContent,w:ar.width,h:ar.height,spanHeight:r.height,lineHeight:parseFloat(s.lineHeight),fontSize:parseFloat(s.fontSize),whiteSpace:s.whiteSpace,writingMode:s.writingMode}})}));
   metrics.push({page:name,...info});
   if(!verify)continue;
   assert(info.scrollWidth<=w+1,`${name} ${w}: viewport overflow`);assert.equal(info.links.length,5);if(w<1024)assert.equal(await p.locator('.gucc-shell-dock').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),5,'Phone Dock must have exactly five equal slots');
   for(const a of info.links){assert(a.w>=44&&a.h>=44,`${name} ${w}: Dock target collapsed (${a.w}×${a.h})`);assert.equal(a.whiteSpace,'nowrap');assert(a.spanHeight<=a.lineHeight+1,`${name} ${w}: Dock label wraps`);assert(a.fontSize>=12);}
   if(name==='story'||name==='prompt'){
    const brand=await p.locator('.brand').boundingBox(),back=await p.locator('.back').boundingBox();
    assert(brand.x+brand.width<=back.x+1||brand.y+brand.height<=back.y,`${name}: brand / return overlap`);
    assert((await p.locator('.hero h1').boundingBox()).height<100,`${name}: hero text inflated`);
   }
   if(w>=1024){const dock=await p.locator('.gucc-shell-dock').boundingBox();const content=await p.locator(name==='db'?'#mainView':name==='resource'?'.library-shell':'.wrap').boundingBox();assert(content.x+content.width<=dock.x-8,`${name} ${w}: content overlaps desktop rail`);}
   if(name==='db')assert.equal(await p.locator('#tab-more').evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
   if(name==='prompt')assert.match(await p.locator('pre code').first().evaluate(e=>getComputedStyle(e).fontFamily),/GUCC Sans/);
   if(name==='db'&&w<=760){
    assert((await p.locator('.topbar').boundingBox()).height<=76,'DB header must stay compact');
    assert(!(await p.locator('#charGame').isVisible()),'Filters start collapsed');
    assert((await p.locator('#characters .filter-toolbar').boundingBox()).height<245,'Results should not be pushed below a full screen of filters');
    assert((await p.locator('#characterResults .item').boundingBox()).y<470,'A result belongs in the first screen');
    await p.locator('.filter-mobile-toggle').first().click();assert(await p.locator('#charGame').isVisible());
    if(w===390)await shot('db-filters-open-390');
    await p.selectOption('#charGame','终');await p.locator('#searchCharBtn').click();
    assert(!(await p.locator('#charGame').isVisible()),'Search restores focus to results');
    await p.locator('#newCharBtn').click();assert(!(await p.locator('.gucc-shell-dock').isVisible()));
    if(w===390)await shot('db-editor-390');await p.keyboard.press('Escape');await p.locator('.gucc-shell-dock').waitFor({state:'visible'});
   }
  }
 }
 if(verify){
  await p.setViewportSize({width:390,height:844});await go('story');
  await p.locator('#libraryNavToggle').click();assert.equal(await p.locator('#libraryNavToggle').getAttribute('aria-expanded'),'true');await shot('story-catalog-390');
  await p.locator('#search').fill('时间线');const target=p.locator('.doc-link').filter({hasText:'时间线'}).first();await target.click();await p.waitForFunction(()=>document.querySelector('#readerTitle').textContent.includes('时间线'));assert.equal(await p.locator('#libraryNavToggle').getAttribute('aria-expanded'),'false');await shot('story-reading-390');
  await p.getByRole('button',{name:'资料',exact:true}).click();await shot('reference-menu-390');await p.keyboard.press('Escape');
  await go('resource');for(const name of ['official','intel','projects']){await p.locator(`.view-switch[data-view="${name}"]`).click();assert.equal(await p.locator(`.view-switch[data-view="${name}"]`).getAttribute('aria-pressed'),'true');await shot('resource-'+name+'-390');}
  await go('db');for(const code of ['崩','绝','鸣','终','异','阴']){await p.locator('.filter-mobile-toggle').first().click();await p.selectOption('#charGame',code);await p.locator('#searchCharBtn').click();await p.waitForFunction(code=>document.querySelector('#characterResults .item')?.dataset.gameCode===code,code);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  for(const tab of ['parties','mechanisms','versions']){await p.locator(`[data-tab="${tab}"]`).click();const panel=p.locator('#'+tab);assert.equal(await panel.locator('.filter-mobile-toggle').count(),1,`${tab}: mobile filter control missing`);assert(!(await panel.locator('[data-game-filter], #mechanismGame').isVisible()),`${tab}: filters must start collapsed`);await panel.locator('.filter-mobile-toggle').click();assert(await panel.locator('[data-game-filter], #mechanismGame').isVisible(),`${tab}: expanded filters remain hidden`);}
  await p.locator('[data-tab="more"]').click();await shot('db-more-390');
  await p.setViewportSize({width:390,height:500});await p.getByRole('button',{name:'资料',exact:true}).click();await shot('short-screen-menu-390');await p.keyboard.press('Escape');
  await p.emulateMedia({reducedMotion:'reduce'});await p.keyboard.press('Tab');
  assert(await p.locator('.gucc-shell-link').first().evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<=.001));
  assert.equal(writes.length,0,'Layout and navigation never write records');assert.deepEqual(errors,[]);
 }
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({source:'isolated actual Chromium; synthetic DB row; real repo reference files',sizes,metrics,errors,writes},null,2));
 await browser.close();console.log(`Mobile reference ${phase}: four pages × ${sizes.length} viewports; ${errors.length} errors, ${writes.length} writes.`);
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
