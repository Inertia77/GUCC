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
  for(const [p,v,k] of [["A","FIONI","script"],["B","MAIN","visual"]])f.deliverables.set(f.key(p,v,k),{project_id:p,video_id:v,deliverable_key:k,status:"confirmed",revision:1});
  // More than a REST page, including rows outside registered videos, must not inflate totals.
  for(let i=0;i<201;i++)f.deliverables.set(f.key("A","ZZ-UNREGISTERED-"+i,"script"),{project_id:"A",video_id:"ZZ-UNREGISTERED-"+i,deliverable_key:"script",status:"confirmed"});
  const page=await context.newPage(),errors=[];
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  page.on("pageerror",e=>errors.push(e.message));
  const out=path.resolve("tmp/creator-four-workspaces");
  await fs.mkdir(out,{recursive:true});
  const navigate=async(view,index)=>{
   if((await page.viewportSize()).width<=700){
    await page.getByRole("button",{name:"选择工作区",exact:true}).click();
    await page.getByRole("dialog",{name:"选择工作区"}).locator("nav button").nth(index).click();
   }else await page.locator('.os-nav [data-view="'+view+'"]').click();
  };
  for(const width of [1440,390,360,430]){
   await page.setViewportSize({width,height:width===390?844:900});
   await page.goto(f.origin+"/apps/video-workspace/production-system/?project=A&video=FIONI");
   await page.waitForFunction(()=>window.GuccCreatorOS?.current()?.projectId==="A");
   await page.waitForSelector("#projectPortfolio .portfolio-card",{state:"attached"});
   assert.equal(await page.locator(".os-nav button[data-view]").count(),4);
   assert(await page.locator("#view-outcomes").isVisible());
   await page.waitForFunction(()=>document.querySelector("#portfolioStatus")?.textContent==="正式成果已核对");
   assert((await page.locator('[data-portfolio-project="A"]').innerText()).includes("1 / 12"));
   assert((await page.locator('[data-portfolio-project="B"]').innerText()).includes("1 / 6"),await page.locator('[data-portfolio-project="B"]').innerText());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Portfolio must not overflow");
   await page.screenshot({path:path.join(out,"dashboard-"+width+".png"),fullPage:true,animations:"disabled"});
   await navigate("creation",1);
   assert(await page.locator('#view-creation').isVisible());
   assert(await page.locator('[data-creation-pane="fixed"]').isVisible());
   const studio=page.frameLocator("#fixedStudioFrame");
   await studio.locator("#sixNavList .six-step").first().waitFor({state:"attached"});
   if(width>700)await studio.locator("#sixNavList .six-step").first().click();
   else{
    await studio.getByRole("button",{name:"选择成果",exact:true}).click();
    await studio.getByRole("dialog",{name:"选择成果"}).locator("nav button").first().click();
   }
   assert(await studio.locator("#coverAssistant").isHidden());
   if(width<=700){
    await studio.getByRole("button",{name:"选择成果",exact:true}).click();
    const dialog=studio.getByRole("dialog",{name:"选择成果"});
    await page.screenshot({path:path.join(out,"outcome-picker-"+width+".png"),animations:"disabled"});
    await dialog.locator("nav button").nth(4).click();
    for(const index of [0,1,2,3,5,4]){
      await studio.getByRole("button",{name:"选择成果",exact:true}).click();
      await dialog.locator("nav button").nth(index).click();
      assert.equal(await studio.locator("#coverAssistant").isVisible(),index===4);
    }
   }else{
    await studio.locator("#sixNavList .six-step").nth(4).click();
   }
   assert(await studio.locator("#coverAssistant").isVisible(),"Advanced cover helper only alongside the cover Prompt");
   assert(await studio.locator("body").evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Embedded Studio fits viewport");
   await page.screenshot({path:path.join(out,"creation-fixed-"+width+".png"),fullPage:true,animations:"disabled"});
   await page.locator('[data-creation-mode="dynamic"]').click();
   assert(await page.locator('[data-creation-pane="dynamic"]').isVisible());
   assert(await page.locator('#currentTaskName').isVisible());
   await page.screenshot({path:path.join(out,"creation-flexible-"+width+".png"),fullPage:true,animations:"disabled"});
   await navigate("release",2);
   const publish=page.frameLocator("#publishConsoleFrame");
   if(width<=700){
    await publish.getByRole("button",{name:"选择流程",exact:true}).click();
    await publish.getByRole("dialog",{name:"选择流程"}).locator("nav button").nth(3).click();
   }else await publish.locator('.flow-nav [data-view="review"]').click();
   assert(await publish.locator("#view-review").isVisible());
   if(width<=700)assert(await publish.locator(".hero-status strong").evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height<36&&el.scrollWidth<=el.clientWidth+1)),"Mobile publishing status values stay on a readable line");
   assert(await publish.locator("body").evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Embedded publishing form fits viewport");
   await page.screenshot({path:path.join(out,"release-"+width+".png"),fullPage:true,animations:"disabled"});
   await navigate("knowledge",3);
   assert(await page.locator('#view-core').isVisible());
   await page.locator('[data-reference="capabilities"]').click();
   assert(await page.locator("#view-capabilities").isVisible());
   await page.locator('[data-reference="libraries"]').click();
   assert(await page.locator("#view-libraries").isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"All four workspaces fit viewport");
   await page.screenshot({path:path.join(out,"knowledge-"+width+".png"),fullPage:true,animations:"disabled"});
   console.log("Four workspaces verified at "+width+"px");
  }
  await page.setViewportSize({width:1440,height:900});
  await navigate("outcomes",0);
  await page.locator('[data-outcome-video="FIONI"]').click();
  await navigate("creation",1);
  await page.locator('[data-creation-mode="fixed"]').click();
  const studio=page.frameLocator("#fixedStudioFrame"),publish=page.frameLocator("#publishConsoleFrame");
  await page.waitForFunction(()=>document.querySelector('#fixedStudioFrame').contentWindow.GuccCreatorWorkspace?.context().videoId==="FIONI");
  await studio.locator("#titleInput").fill("第一条视频的独立草稿");
  const changeVideo=async id=>{
   await navigate("outcomes",0);await page.locator('[data-outcome-video="'+id+'"]').click();
   await page.waitForFunction(id=>document.querySelector('#fixedStudioFrame').contentWindow.GuccCreatorWorkspace?.context().videoId===id,id);
   await page.waitForFunction(id=>document.querySelector('#publishConsoleFrame').contentWindow.GuccCreatorWorkspace?.context().videoId===id,id);
  };
  await changeVideo("SEVERIAN");await navigate("creation",1);
  assert.notEqual(await studio.locator("#titleInput").inputValue(),"第一条视频的独立草稿");
  await studio.locator("#titleInput").fill("第二条视频的独立草稿");
  await changeVideo("FIONI");await navigate("creation",1);
  assert.equal(await studio.locator("#titleInput").inputValue(),"第一条视频的独立草稿");
  await navigate("release",2);await publish.locator('.flow-nav [data-view="prepare"]').click();
  await publish.locator("#projectTitle").fill("第一条视频的发布标题");
  await changeVideo("SEVERIAN");await navigate("release",2);
  assert.notEqual(await publish.locator("#projectTitle").inputValue(),"第一条视频的发布标题");
  await publish.locator("#projectTitle").fill("第二条视频的发布标题");
  await changeVideo("FIONI");await navigate("release",2);
  assert.equal(await publish.locator("#projectTitle").inputValue(),"第一条视频的发布标题");
  await publish.locator('.flow-nav [data-view="review"]').click();
  await publish.locator("#metricViews").fill("1200");await publish.locator("#metricLikes").fill("48");
  await publish.getByRole("button",{name:"保存快照",exact:true}).click();
  assert.equal(await publish.locator("#snapshotCount").innerText(),"1 条快照");
  await changeVideo("SEVERIAN");await navigate("release",2);
  assert.equal(await publish.locator("#snapshotCount").innerText(),"0 条快照");
  await changeVideo("FIONI");await navigate("release",2);
  assert.equal(await publish.locator("#snapshotCount").innerText(),"1 条快照");
  await navigate("outcomes",0);await page.locator("#outcomeNewProject").click();
  await page.getByRole("button",{name:"＋ 新项目",exact:true}).click();
  const create=page.getByRole("dialog",{name:"创建项目或视频"});
  await create.locator(".creator-folder-command summary").click();
  const command=await create.locator(".creator-folder-command textarea").inputValue();
  assert.equal((command.match(/^  '/gm)||[]).length,8);
  assert(command.includes("04_BGM 与音效包")&&command.includes("-Path . -Name $_ -Force"));
  await create.getByRole("button",{name:"复制目录命令"}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),command);
  await page.screenshot({path:path.join(out,"new-project-folders-1440.png"),animations:"disabled"});
  await page.keyboard.press("Escape");
  await page.locator("#projectRegistryDetails > summary").click();
  await page.locator("#editProjectArchiveBtn").click();
  await page.locator("#editProjectName").fill("双视频项目 · 编辑验收");
  await page.locator('#editProjectForm button[type="submit"]').click();
  assert.equal(await page.evaluate(()=>GuccCreatorOS.current().projectId),"A");
  assert.equal(await page.evaluate(()=>GuccCreatorOS.current().videos.length),2);
  page.on("dialog",dialog=>dialog.accept());
  await page.locator("#archiveCurrentProject").click();
  assert.equal(await page.locator('[data-portfolio-project="A"]').count(),0,"Archived projects leave the active portfolio");
  await page.locator("#projectArchiveFilter").selectOption("archived");
  await page.locator('#projectCards [data-project="A"]').click();
  await page.waitForFunction(()=>GuccCreatorWorkspace.context().projectId==="A");
  await page.locator("#archiveCurrentProject").click();
  assert.equal(await page.evaluate(()=>GuccCreatorOS.current().archivedAt),null);
  assert.equal(await page.evaluate(()=>GuccCreatorOS.current().videos.length),2);
  assert.equal(await page.evaluate(()=>GuccCreatorContext.read().projectId),"A");
  assert.equal(await page.locator('[data-portfolio-project="A"]').count(),1,"Restoring an active project returns its card");
  await page.locator("#completeCurrentProject").click();
  assert.equal(await page.locator('[data-portfolio-project="A"]').count(),0,"Completed projects leave the active portfolio");
  await page.locator("#projectArchiveFilter").selectOption("completed");
  await page.locator('#projectCards [data-project="A"]').click();
  await page.locator("#completeCurrentProject").click();
  assert.equal(await page.locator('[data-portfolio-project="A"]').count(),1,"Reopening a completed project restores its card");
  assert.equal(f.writes.filter(w=>w.kind==="deliverable").length,0,"Navigation and Prompt edits never mark formal outcomes complete");
  assert.deepEqual(errors,[],"No uncaught errors in embedded tools");
  await context.close();
  // A fresh isolated owner can confirm all six deliverables without files on desktop and phone.
  for(const width of [1440,390]){
   const manual=fixture(),ctx=await b.newContext({serviceWorkers:"block",viewport:{width,height:900}});
   await manual.install(ctx);const p=await ctx.newPage();
   await p.goto(manual.origin+"/apps/video-workspace/production-system/?project=B&video=MAIN");
   await p.waitForFunction(()=>window.GuccCreatorOS?.current()?.projectId==="B");
   await p.locator('.gcc-outcome-trigger').click();
   for(const key of ["script","subtitle","visual","sound","cover","publish"]){
    await p.locator('.gcc-outcome-chips [data-gcc-outcome="'+key+'"]').click();
    await p.getByLabel("成果状态",{exact:true}).selectOption("confirmed");
    await p.getByRole("button",{name:"保存成果状态",exact:true}).click();
    await p.waitForFunction(()=>document.querySelector('.gcc-outcome-editor > small')?.textContent.includes("已同步"));
    const row=manual.deliverables.get(manual.key("B","MAIN",key));
    assert.equal(row.status,"confirmed");assert.equal(row.revision,1);
    assert.equal(row.evidence.humanConfirmed,true);assert.equal(row.evidence.locked,true);
    assert.equal(row.evidence.confirmationMethod,"manual");assert.equal(row.evidence.confirmationSource,"human_ui");
    assert.deepEqual(row.evidence.artifacts,[]);assert.equal(row.evidence.recording,null);
    assert.equal(row.evidence.fileName,"");assert.equal(row.evidence.sizeBytes,0);
   }
   await p.screenshot({path:path.join(out,"manual-confirmation-"+width+".png"),animations:"disabled"});
   await p.keyboard.press("Escape");await p.reload();
   await p.waitForFunction(()=>document.querySelector('[data-portfolio-project="B"]')?.textContent.includes("6 / 6"));
   assert.equal(manual.writes.filter(w=>w.kind==="deliverable").length,6,"Only explicit saves confirm outcomes");
   assert.equal([...manual.deliverables.values()].filter(r=>r.project_id==="A").length,0,"No cross-project status changes");
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await ctx.close();
  }
  console.log("Four-workspace browser acceptance passed: desktop/mobile, fixed cover assistant, flexible flow, release review, reference tabs.");
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
