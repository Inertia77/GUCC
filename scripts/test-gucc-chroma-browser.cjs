'use strict';
/* Real Chromium color acceptance, isolated fixture only; never writes production data. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright-core');
const fixture=require('./gucc-browser-fixture.cjs');
const out=path.resolve('tmp/chroma-browser');
const pages=[
 {key:'portal',url:'/'},
 {key:'creator',url:'/apps/video-workspace/production-system/'},
 {key:'db',url:'/apps/command-center/'},
 {key:'publish',url:'/apps/publishing-console/'},
 {key:'resources',url:'/reference/resource-library.html'},
 {key:'story',url:'/reference/story-library.html'},
 {key:'cover',url:'/apps/cover-generator/'}
];
const rgb=(color)=>{
 const values=String(color).match(/rgba?\(([^)]+)\)/)?.[1].split(/[,\s/]+/).map(Number);
 return values?.slice(0,3)||null;
};
const contrast=(foreground,background)=>{
 const linear=n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4};
 const luminance=v=>v.map(linear).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
 const a=luminance(rgb(foreground)),b=luminance(rgb(background));
 return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
};
let browser;
(async()=>{
 await fs.mkdir(out,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const reports=[];
 for(const width of [390,1366,1440]){
  const ctx=await browser.newContext({serviceWorkers:'block',hasTouch:width===390,isMobile:width===390,viewport:{width,height:width===390?844:900}});
  await fixture.routes(ctx,{auth:true,cloud:{route:route.fulfill({json:{ok:true,data:[]}})}});
  const p=await ctx.newPage();
  for(const entry of pages){
   await p.goto('https://gucc.test'+entry.url,{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>document.body.classList.contains('gucc-enhanced')&&
     !!document.querySelector('link[data-gucc-chroma]'),{timeout:15000});
   await p.evaluate(()=>document.fonts.ready);
   const result=await p.evaluate(key=>{
    const root=getComputedStyle(document.documentElement),body=getComputedStyle(document.body);
    const first=selector=>{const e=document.querySelector(selector);if(!e)return null;
      const s=getComputedStyle(e);
      return {color:s.color,background:s.backgroundColor,label:e.textContent?.trim().slice(0,70)||''};};
    return {
      iris:root.getPropertyValue('--ch-iris').trim().toLowerCase(),
      blue:root.getPropertyValue('--ch-blue').trim().toLowerCase(),
      body:{color:body.color,background:body.backgroundColor},
      primary:first(key==='creator'?'.button.primary':key==='publish'?'.button.primary':key==='resources'?'.view-switch.is-active':null),
      dock:first('.gucc-shell-dock'),
      cssCount:[...document.querySelectorAll('link[href*="gucc-chroma-v1.css"]')].length,
      overflow:document.documentElement.scrollWidth-innerWidth
    };
   },entry.key);
   assert.equal(result.iris,'#a6a3ff',entry.key+' brand token');
   assert.equal(result.blue,'#85bcff',entry.key+' secondary brand token');
   assert.equal(result.cssCount,1,entry.key+' should not load duplicate brand CSS');
   assert.equal(result.body.background,'rgb(14, 16, 32)',entry.key+' must not have old green/black base');
   assert(contrast(result.body.color,result.body.background)>=7,entry.key+' body text below AAA contrast');
   if(result.primary){
    assert.equal(result.primary.background,'rgb(166, 163, 255)',entry.key+' main action is not the intended violet');
    assert(contrast(result.primary.color,result.primary.background)>=7,entry.key+' primary action label below AAA');
   }
   assert(result.overflow<=2,entry.key+' '+width+' horizontal overflow: '+result.overflow);
   await p.screenshot({path:path.join(out,entry.key+'-'+width+'.png'),animations:'disabled'});
   reports.push({page:entry.key,width,...result});
  }
  await ctx.close();
 }
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({screenshots:reports.length,palette:'GUCC Chromatic Edition v1',reports},null,2));
 await browser.close();console.log('Chroma browser acceptance passed: '+reports.length+' viewport/page combinations; AAA body and primary-action contrast.');
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1});
