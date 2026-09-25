'use strict';
// Offline browser fixture. No production Auth, data, API writes, or publish calls.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const Engine = require('../apps/video-workspace/production-system/engine.js');
const root = path.resolve(__dirname,'..');
const out = path.join(root,'tmp','creator-workflow-browser');
const origin = 'https://gucc.test';
async function run(){
  await fs.mkdir(out,{recursive:true});
  const channel=process.env.GUCC_TEST_BROWSER || (process.platform==='win32' ? 'msedge' : undefined);
  const browser=await chromium.launch({...(channel?{channel}:{}),...(process.env.GUCC_TEST_BROWSER_PATH?{executablePath:process.env.GUCC_TEST_BROWSER_PATH}:{})});
  const errors=[];
  try {
    for(const [width,height] of [[1440,900],[768,1024],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
      await context.route('**/*',async(route)=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin){errors.push(`External request: ${url.origin}`);return route.abort();}
        if(url.pathname==='/assets/access-guard.js')return route.fulfill({contentType:'text/javascript',body:'// Isolated visual fixture; no owner Auth.'});
        if(url.pathname==='/apps/command-center/src/auth.js')return route.fulfill({contentType:'text/javascript',body:'export const getSession=()=>null; export const getAccessToken=async()=>"";'});
        if(url.pathname==='/apps/command-center/src/config.js')return route.fulfill({contentType:'text/javascript',body:'export const CONFIG={SUPABASE_URL:"https://blocked.invalid",SUPABASE_ANON_KEY:"fixture"};'});
        const file=path.resolve(root,`.${decodeURIComponent(url.pathname)}`,url.pathname.endsWith('/')?'index.html':'');
        if(!file.startsWith(`${root}${path.sep}`))return route.abort();
        try{const ext=path.extname(file);return route.fulfill({contentType:({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.md':'text/markdown','.svg':'image/svg+xml'})[ext]||'application/octet-stream',body:await fs.readFile(file)});}catch{errors.push(`Missing asset: ${url.pathname}`);return route.fulfill({status:404,body:'Missing'});}
      });
      const fixture=Engine.createProject({projectId:'VISUAL-QA',name:'心与锁暝机制解析',game:'鸣潮',targetPublishDate:'2026-10-01'});
      await context.addInitScript((project)=>{localStorage.setItem('gucc_ai_video_production_v1',JSON.stringify({projects:[project],selectedProjectId:project.projectId,musicLibrary:[]}));},fixture);
      const page=await context.newPage();page.on('pageerror',(error)=>errors.push(error.message));
      await page.goto(`${origin}/apps/video-workspace/`);
      await page.locator('.lane').first().waitFor();
      assert.equal(await page.locator('.stage-node').count(),7);
      assert.match(await page.locator('#heroProject').innerText(),/心与锁暝/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`Hub overflow ${width}`);
      await page.locator('[data-stage="1"]').click();assert.match(await page.locator('#stageDetail').innerText(),/先解析音画/);
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:path.join(out,`hub-${width}-top.png`)});
      await page.screenshot({path:path.join(out,`hub-${width}.png`),fullPage:true});
      const pixel=page.locator('#task-PIXEL_PACKAGE a');assert.match(await pixel.getAttribute('href'),/command=/);
      await pixel.click();
      await page.locator('#creatorAiTaskInput').waitFor();
      assert.equal(await page.locator('#creatorAiTaskInput').inputValue(),'制作像素包');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`Production overflow ${width}`);
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:path.join(out,`production-${width}-top.png`)});
      await page.screenshot({path:path.join(out,`production-${width}.png`),fullPage:true});
      await context.close();
    }
    assert.deepEqual(errors,[]);
    console.log(`Workflow Hub browser regression passed. Screenshots: ${out}`);
  } finally {await browser.close();}
}
run().catch((error)=>{console.error(error);process.exitCode=1;});
