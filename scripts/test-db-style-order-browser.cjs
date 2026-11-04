'use strict';
// The DB final stylesheet contract must be validated in the *rendered DOM*.
// This fixture reads real repository HTML/CSS/modules in headless Chromium.
// No production session, Supabase writes, or Service Worker is involved.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const fixture = require('./gucc-browser-fixture.cjs');

const root = path.resolve(__dirname, '..');
const out = path.resolve(root, 'tmp/db-style-order-browser');
const viewports = [[320,700],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
const expected = [
  ['gucc-search-ux-final', '/apps/command-center/styles/game-os.css', '4'],
  ['gucc-game-themes-final', '/apps/command-center/styles/game-themes.css', '9'],
  ['gucc-game-premium-final', '/apps/command-center/styles/game-premium.css', '1'],
  ['gucc-interface-chrome-final', '/apps/command-center/styles/interface-chrome.css', '1'],
  ['gucc-responsive-layout-final', '/apps/command-center/styles/responsive-layout.css', '4'],
  ['gucc-mobile-layout-final', '/apps/command-center/styles/mobile-layout.css', '4'],
  ['gucc-premium-final', '/assets/gucc-premium.css', '4'],
  ['gucc-chroma-final', '/assets/gucc-chroma-v1.css', '1']
];

const rgb = s => String(s).match(/[\\d.]+/g)?.slice(0,3).map(Number);
const luminance = s => rgb(s).map(n => {
  const x = n/255; return x<=0.04045 ? x/12.92 : ((x+0.055)/1.055)**2.4;
}).reduce((n,v,i) => n+v*[0.2126,0.7152,0.0722][i],0);
const contrast = (a,b) => {
  const x=luminance(a), y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
};

(async () => {
  await fs.mkdir(out,{recursive:true});
  const browser = await chromium.launch({
    headless:true,
    executablePath:process.env.GUCC_TEST_EXECUTABLE,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    const cloudActions = [];
    await fixture.routes(context,{auth:true,cloud:{route:async route => {
      let action='';
      try { action=String(route.request().postDataJSON()?.action||''); } catch {}
      if (/^(save|delete|update|create)/i.test(action)) cloudActions.push(action);
      await route.fulfill({json:{ok:true,data:[]}});
    }}});
    const page = await context.newPage();
    const errors = [], reports = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if(m.type()==='error') errors.push(m.text())});

    async function inspect(label,width,height) {
      await page.setViewportSize({width,height});
      await page.goto('https://gucc.test/apps/command-center/',{waitUntil:'networkidle'});
      await page.waitForSelector('#mainView:not(.hidden)');
      await page.waitForFunction(ids => ids.every(([id]) => {
        const link=document.getElementById(id);
        return link instanceof HTMLLinkElement && link.sheet;
      }),expected,{timeout:15000});
      const state = await page.evaluate((ids) => {
        const head=[...document.head.querySelectorAll('link')];
        const entries=ids.map(([id]) => {
          const matches=[...document.querySelectorAll('[id]')].filter(el=>el.id===id);
          const link=matches[0];
          return {id,count:matches.length,href:link?.href,rel:link?.rel,
            index:head.indexOf(link),sheet:!!link?.sheet};
        });
        const body=getComputedStyle(document.body);
        const search=document.querySelector('#charKeyword');
        const s=getComputedStyle(search);
        return {entries,background:body.backgroundColor,color:body.color,
          search:{fontSize:s.fontSize,color:s.color,background:s.backgroundColor},
          overflow:document.documentElement.scrollWidth-innerWidth,
          selected:document.querySelector('#tab-characters')?.getAttribute('aria-selected')};
      },expected);
      for(let i=0;i<expected.length;i++){
        const [id,pathname,version]=expected[i],entry=state.entries[i],url=new URL(entry.href);
        assert.equal(entry.count,1,label+': duplicate/missing '+id);
        assert.equal(entry.rel,'stylesheet',label+': invalid rel '+id);
        assert.equal(url.pathname,pathname,label+': wrong path '+id);
        assert.equal(url.searchParams.get('v'),version,label+': stale CSS query '+id);
        assert(entry.sheet,label+': CSS failed to load '+id);
        if(i) assert(entry.index>state.entries[i-1].index,label+': final CSS order drift '+id);
      }
      assert(state.overflow<=1,label+': horizontal overflow '+state.overflow);
      assert.equal(state.selected,'true',label+': lost tab selection');
      assert(contrast(state.color,state.background)>=7,label+': base text under 7:1');
      assert(parseFloat(state.search.fontSize)>=14,label+': search text too small');
      if(width===390||width===1440)
        await page.screenshot({path:path.join(out,label+'.png'),animations:'disabled'});
      reports.push({label,width,height,...state});
    }

    for(const [width,height] of viewports) await inspect('db-'+width,width,height);

    // Reproduce the actual failure mode: a stale HTML link on an older app shell.
    // The JavaScript must repair this at runtime, not merely trust the source tag.
    await page.route('https://gucc.test/apps/command-center/',async route=>{
      const html=await fs.readFile(path.join(root,'apps/command-center/index.html'),'utf8');
      assert(html.includes('styles/mobile-layout.css?v=4'));
      await route.fulfill({contentType:'text/html',
        body:html.replace('styles/mobile-layout.css?v=4','styles/mobile-layout.css?v=2')});
    });
    await inspect('db-stale-html-recovered',390,844);
    assert.deepEqual(errors,[],'Chromium console/page errors');
    assert.deepEqual(cloudActions,[],'Read-only UI fixture must never save production data');
    await fs.writeFile(path.join(out,'results.json'),JSON.stringify({
      source:'real Chromium + repository CSS/modules + isolated API; no production writes',
      viewports,staleHtmlSelfRepair:true,errors,cloudActions,reports
    },null,2));
    await context.close();
    console.log('DB CSS contract passed: '+viewports.length+' viewport sizes + stale HTML repair, real computed styles and DOM order.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
