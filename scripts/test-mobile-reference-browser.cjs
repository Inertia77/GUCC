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
  // Real Chromium contract: every non-character card collapses to a single
  // horizontal scan row without exposing destructive actions.
  const compactPanels = [
   {tab:'parties',id:'partyResults',title:'队伍速切'},
   {tab:'mechanisms',id:'mechanismResults',title:'异常积蓄'},
   {tab:'versions',id:'versionResults',title:'版本代号'}
  ];
  for(const width of [320,360,390,430]){
   await p.setViewportSize({width,height:844});
   for(const fixture of compactPanels){
    await p.locator(`[data-tab="${fixture.tab}"]`).click();
    await p.waitForTimeout(80);
    await p.evaluate(({id,tab,title})=>{
     const el=document.getElementById(id);
     if(!el)throw new Error(`Missing ${id}`);
     const titleMarkup=tab==='versions'
      ? `<div class="item-title version-title"><span class="version-no">3.2</span><span>${title}</span></div>`
      : `<div class="item-title">${title}</div>`;
     el.innerHTML=`<article class="item" data-game-code="鸣" data-item-id="isolated-compact-row">
      <div class="item-head">
       <div class="item-summary">${titleMarkup}
        <div class="meta"><span class="badge">数据标签</span></div>
       </div>
       <div class="actions collapsible-actions">
        <button type="button" class="secondary collapse-toggle" data-card-toggle aria-expanded="true">收起</button>
        <button type="button" class="secondary">编辑</button>
        <button type="button" class="danger">删除</button>
       </div>
      </div>
      <div class="item-content" data-card-content>可展开的完整详情</div>
     </article>`;
    },fixture);
    const card=p.locator(`#${fixture.id} .item`).first();
    const toggle=card.locator('[data-card-toggle]');
    await toggle.click();
    assert(await card.evaluate(e=>e.classList.contains('is-collapsed')), `${fixture.tab}: collapse click did not work`);
    const state=await card.evaluate(e=>{
     const rect=o=>o.getBoundingClientRect();
     const title=e.querySelector('.item-title'),button=e.querySelector('.collapse-toggle');
     const actions=e.querySelector('.collapsible-actions'),head=e.querySelector('.item-head');
     return {
      height:rect(e).height,
      titleRight:rect(title).right,
      buttonLeft:rect(button).left,
      buttonHeight:rect(button).height,
      gridColumns:getComputedStyle(head).gridTemplateColumns.split(' ').length,
      metaDisplay:getComputedStyle(e.querySelector('.meta')).display,
      editDisplay:getComputedStyle(actions.querySelector('button.secondary:not(.collapse-toggle)')).display,
      deleteDisplay:getComputedStyle(actions.querySelector('.danger')).display,
      viewportOverflow:document.documentElement.scrollWidth>innerWidth+1
     };
    });
    assert.equal(state.gridColumns,2,`${fixture.tab} ${width}: collapsed card needs two columns`);
    assert.equal(state.metaDisplay,'none',`${fixture.tab} ${width}: meta remains visible`);
    assert.equal(state.editDisplay,'none',`${fixture.tab} ${width}: edit remains visible`);
    assert.equal(state.deleteDisplay,'none',`${fixture.tab} ${width}: delete remains visible`);
    assert(state.buttonHeight>=44,`${fixture.tab} ${width}: expand target is too small`);
    assert(state.titleRight<=state.buttonLeft+1,`${fixture.tab} ${width}: title overlaps expand`);
    assert(state.height<=76,`${fixture.tab} ${width}: collapsed row is still too tall (${state.height})`);
    assert(!state.viewportOverflow,`${fixture.tab} ${width}: horizontal overflow`);
    if(width===390)await shot(`db-${fixture.tab}-compact-390`);
    await toggle.click();
    assert(!(await card.evaluate(e=>e.classList.contains('is-collapsed'))), `${fixture.tab}: expand click did not work`);
    assert(await card.locator('.danger').isVisible(),`${fixture.tab}: expanded card lost delete action`);
    assert(await card.locator('.meta').isVisible(),`${fixture.tab}: expanded card lost metadata`);
   }
  }
  // Isolated Chromium acceptance: all six material skins must keep identical
  // folded desktop heights. Very long translated names remain in expanded
  // records and a complete primary title stays available as a tooltip.
  for(const width of [1024,1366,1440]){
   await p.setViewportSize({width,height:900});
   await go('db');
   for(const fixture of [
    {tab:'characters',id:'characterResults'},
    {tab:'parties',id:'partyResults'},
    {tab:'mechanisms',id:'mechanismResults'},
    {tab:'versions',id:'versionResults'}
   ]){
    await p.locator(`[data-tab="${fixture.tab}"]`).click();
    await p.evaluate(({id,tab})=>{
     const list=document.getElementById(id);
     const games=['崩','绝','鸣','终','异','阴'];
     const buttons=`<div class="actions collapsible-actions">
      <button type="button" data-card-toggle class="secondary collapse-toggle">展开</button>
      <button type="button" class="secondary">详情/编辑</button>
      <button type="button" class="danger">删除</button></div>`;
     list.innerHTML=games.map((game,i)=>{
      const name=i===1?'非常长的角色姓名及专项完整描述测试其他字段不可压迫布局':'砂金 · 戏浪';
      const title=tab==='characters'
       ? `<div class="item-title character-title">
        <div class="character-title-mainline"><span class="character-title-primary">${name}</span>
        <span class="character-title-localized"><span>EN ExtremelyLongCharacterName</span><span>JP アベンチュリンとても長い名前</span><span>KR 아주 긴 이름</span></span></div>
        <span class="character-title-full">全名 超长登记资料</span></div>`
       : tab==='versions'
       ? `<div class="item-title version-title"><span class="version-no">3.2</span><span>${name} 超长版本名</span></div>`
       : `<div class="item-title">${name} 超长机制标题或阵容名称</div>`;
      return `<article class="item is-collapsed" data-item-id="desktop-${i}" data-game-code="${game}">
       <div class="item-head"><div class="item-summary">${title}
       <div class="meta"><span class="badge">游戏</span><span class="badge">机制分类</span>
       <span class="badge">来源</span><span class="badge status-highlight">研究 △</span>
       <span class="badge status-highlight">养成 ×</span><span class="badge">扩展说明</span></div></div>
       ${buttons}</div><div class="item-content" data-card-content hidden>完整展开信息</div>
       </article>`;
     }).join('');
    },fixture);
    const data=await p.locator(`#${fixture.id} > .item`).evaluateAll(cards=>cards.map(card=>{
     const rect=o=>o.getBoundingClientRect(),r=rect(card),
       name=card.querySelector('.character-title-primary, .item-title'),
       nr=rect(name),button=card.querySelector('.collapse-toggle'),br=rect(button),
       actions=rect(card.querySelector('.actions'));
     return {game:card.dataset.gameCode,height:r.height,titleRight:nr.right,
       buttonLeft:br.left,buttonRight:br.right,actionsRight:actions.right,
       cardRight:r.right,cardLeft:r.left,
       localized:card.querySelector('.character-title-localized')
        ?getComputedStyle(card.querySelector('.character-title-localized')).display:null,
       expandedHidden:card.querySelector('.item-content').hidden,
       metaWrap:getComputedStyle(card.querySelector('.meta')).flexWrap
     };
    }));
    assert.equal(data.length,6,`${fixture.tab} ${width}: expected six game variants`);
    for(const d of data){
     assert(Math.abs(d.height-76)<=1,`${fixture.tab} ${width} ${d.game}: collapsed height ${d.height}`);
     assert(d.buttonLeft>=d.titleRight-1,`${fixture.tab} ${width} ${d.game}: title overlaps controls`);
     assert(d.buttonRight<=d.cardRight+1,`${fixture.tab} ${width} ${d.game}: button clipped`);
     assert(d.actionsRight<=d.cardRight+1,`${fixture.tab} ${width} ${d.game}: actions clipped`);
     assert.equal(d.metaWrap,'nowrap',`${fixture.tab} ${width} ${d.game}: badges wrap`);
     assert(d.expandedHidden,`${fixture.tab} ${width} ${d.game}: content leaked into folded row`);
     if(fixture.tab==='characters')assert.equal(d.localized,'none',`${width} ${d.game}: localized name breaks row height`);
    }
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${fixture.tab} ${width}: horizontal overflow`);
    if(width===1366&&fixture.tab==='characters')await shot('db-desktop-compact-six-skins-1366');
   }
  }
  await p.setViewportSize({width:390,height:844});await go('db');
  await p.setViewportSize({width:390,height:844});
  await p.locator('[data-tab="more"]').click();await shot('db-more-390');
  await p.setViewportSize({width:390,height:500});await p.getByRole('button',{name:'资料',exact:true}).click();await shot('short-screen-menu-390');await p.keyboard.press('Escape');
  await p.emulateMedia({reducedMotion:'reduce'});await p.keyboard.press('Tab');
  assert(await p.locator('.gucc-shell-link').first().evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<=.001));
  assert.equal(writes.length,0,'Layout and navigation never write records');assert.deepEqual(errors,[]);
 }
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({source:'isolated actual Chromium; synthetic DB row; real repo reference files',sizes,metrics,errors,writes},null,2));
 await browser.close();console.log(`Mobile reference ${phase}: four pages × ${sizes.length} viewports; ${errors.length} errors, ${writes.length} writes.`);
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
