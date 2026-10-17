"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
const fs=require("node:fs/promises");
const {chromium}=require("playwright-core");
const {fixture}=require("./gucc-unified-fixture.cjs");
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  const f=fixture(),context=await b.newContext({serviceWorkers:"block"});await f.install(context);
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const out=path.resolve("tmp/creator-four-workspaces");
  await fs.mkdir(out,{recursive:true});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:900});
   await page.goto(f.origin+"/apps/video-workspace/production-system/?project=A&video=FIONI");
   await page.waitForFunction(()=>window.GuccCreatorOS?.current()?.projectId==="A");
   await page.waitForSelector("#projectPortfolio .portfolio-card",{state:"attached"});
   assert.equal(await page.locator(".os-nav button[data-view]").count(),4);
   assert(await page.locator("#view-outcomes").isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Portfolio must not overflow");
   await page.screenshot({path:path.join(out,"dashboard-"+width+".png"),fullPage:true,animations:"disabled"});
   await page.locator('[data-view="creation"]').evaluate(el=>el.click());
   assert(await page.locator('#view-creation').isVisible());
   assert(await page.locator('[data-creation-pane="fixed"]').isVisible());
   const studio=page.frameLocator("#fixedStudioFrame");
   await studio.locator("#sixNavList .six-step").first().waitFor({state:"attached"});
   await studio.locator("#sixNavList .six-step").first().evaluate(el=>el.click());
   assert(await studio.locator("#coverAssistant").isHidden());
   if(width<=700){
    await studio.getByRole("button",{name:"选择成果",exact:true}).click();
    await studio.getByRole("dialog",{name:"选择成果"}).locator("nav button").nth(4).click();
   }else{
    await studio.locator("#sixNavList .six-step").nth(4).click();
   }
   assert(await studio.locator("#coverAssistant").isVisible(),"Advanced cover helper only alongside the cover Prompt");
   await page.screenshot({path:path.join(out,"creation-fixed-"+width+".png"),fullPage:true,animations:"disabled"});
   await page.locator('[data-creation-mode="dynamic"]').click();
   assert(await page.locator('[data-creation-pane="dynamic"]').isVisible());
   assert(await page.locator('#currentTaskName').isVisible());
   await page.screenshot({path:path.join(out,"creation-flexible-"+width+".png"),fullPage:true,animations:"disabled"});
   await page.locator('[data-view="release"]').evaluate(el=>el.click());
   const publish=page.frameLocator("#publishConsoleFrame");
   await publish.locator('.flow-nav [data-view="review"]').waitFor();
   await publish.locator('.flow-nav [data-view="review"]').evaluate(el=>el.click());
   assert(await publish.locator("#view-review").isVisible());
   await page.screenshot({path:path.join(out,"release-"+width+".png"),fullPage:true,animations:"disabled"});
   await page.locator('[data-view="knowledge"]').evaluate(el=>el.click());
   assert(await page.locator('#view-core').isVisible());
   await page.locator('[data-reference="capabilities"]').click();
   assert(await page.locator("#view-capabilities").isVisible());
   await page.locator('[data-reference="libraries"]').click();
   assert(await page.locator("#view-libraries").isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"All four workspaces fit viewport");
   await page.screenshot({path:path.join(out,"knowledge-"+width+".png"),fullPage:true,animations:"disabled"});
  }
  assert.deepEqual(errors,[],"No uncaught errors in embedded tools");
  await context.close();
  console.log("Four-workspace browser acceptance passed: desktop/mobile, fixed cover assistant, flexible flow, release review, reference tabs.");
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
