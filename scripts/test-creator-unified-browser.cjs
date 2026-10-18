"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),path=require("node:path");
const {chromium}=require("playwright-core");
const root=path.resolve(__dirname,".."),origin="https://gucc.test",api="https://api.gucc.test";
const projectRows=[
 {projectId:"A",name:"绝区零双视频",game:"绝区零",version:"3.3",lifecycle:"completed"},
 {projectId:"B",name:"鸣潮角色专题",game:"鸣潮",version:"3.7",lifecycle:"active"}
];
const snapshots={
 A:{projectId:"A",name:"绝区零双视频",videos:[{videoId:"FIONI",name:"菲欧妮解析"},{videoId:"SEVERIAN",name:"赛维里安解析"}],promptFlow:[]},
 B:{projectId:"B",name:"鸣潮角色专题",videos:[{videoId:"MAIN",name:"鸣潮角色解析"}],promptFlow:[]}
};
const O=require('../apps/video-workspace/production-system/orchestrator.js');
for(const [id,s] of Object.entries(snapshots)){snapshots[id]=O.createProject({...s,workflowMode:'six',game:projectRows.find(p=>p.projectId===id).game,version:projectRows.find(p=>p.projectId===id).version});O.buildWorkflow(snapshots[id]);O.compilePromptFlow(snapshots[id]);snapshots[id].status='FLOW_READY';}
const revisions={A:1,B:1};
const videos=new Map(),deliverables=new Map(),writes=[],errors=[];
for(const [id,s] of Object.entries(snapshots))for(const v of s.videos)videos.set(JSON.stringify([id,v.videoId,'']),{project_id:id,video_id:v.videoId,title:v.name,legacy_branch:v.branch||v.videoId});
const key=(p,v,k="")=>JSON.stringify([p,v,k]);
const reqJson=route=>{try{return route.request().postDataJSON()}catch{return null}};
async function main(){
 const browser=await chromium.launch({headless:true,...(process.env.GUCC_TEST_EXECUTABLE?{executablePath:process.env.GUCC_TEST_EXECUTABLE}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({serviceWorkers:"block",viewport:{width:390,height:844}});
 const guard=await fs.readFile(path.join(root,"assets/access-guard.js"),"utf8"),hash=guard.match(/ACCESS_HASH = '([^']+)'/)[1];
 await context.addInitScript(h=>{localStorage.setItem("gucc_access_hash_v2",h);localStorage.setItem("gameup_session_v5",JSON.stringify({access_token:"fixture",user:{id:"owner"}}));},hash);
 const handleRoute=async route=>{
  const u=new URL(route.request().url()),method=route.request().method(),data=reqJson(route);
  if(u.origin===api){
   const name=u.pathname.replace("/rest/v1/","");
   if(name==='rpc/creator_os_save_project'){
    const id=data.p_project.projectId;
    if((revisions[id]||null)!==data.p_expected_revision)return route.fulfill({status:409,json:{message:'CREATOR_OS_REVISION_CONFLICT'}});
    snapshots[id]=data.p_project;revisions[id]=(revisions[id]||0)+1;
    if(!projectRows.some(p=>p.projectId===id))projectRows.push({projectId:id,name:data.p_project.name,game:data.p_project.game,version:data.p_project.version,lifecycle:'active'});
    for(const v of data.p_project.videos||[])videos.set(key(id,v.videoId),{project_id:id,video_id:v.videoId,title:v.name});
    return route.fulfill({json:{project_id:id,project_data:snapshots[id],revision:revisions[id]}});
   }
   if(name==='rpc/creator_workspace_register_video'){
    const id=data.p_project_id,v={videoId:data.p_video_id,branch:data.p_video_id,name:data.p_title};
    snapshots[id].videos.push(v);revisions[id]++;
    const row={project_id:id,video_id:v.videoId,title:v.name};videos.set(key(id,v.videoId),row);
    return route.fulfill({json:{video:row,snapshot:{project_id:id,project_data:snapshots[id],revision:revisions[id]}}});
   }
   if(name==='creator_os_publish_drafts')return route.fulfill({json:[]});
   if(name==='rpc/creator_os_save_publish_draft')return route.fulfill({json:{conflict:false,current:{project_id:data.p_project_id,video_id:data.p_video_id,draft_data:data.p_draft,revision:1}}});
   if(name==="rpc/creator_os_portal_dashboard")return route.fulfill({json:projectRows});
   if(name==="creator_os_workspace_snapshots"){
    const id=u.searchParams.get("project_id")?.replace(/^eq\./,"");
    return route.fulfill({json:(id&&snapshots[id]?[id]:id?[]:Object.keys(snapshots)).map(id=>({project_id:id,project_data:snapshots[id],revision:revisions[id]}))});
   }
   if(name==="creator_deliverable_versions")return route.fulfill({json:[]});
   if(name==="creator_video_workspaces"){
    if(method==="POST"){writes.push({kind:"video",data});const id=key(data.project_id,data.video_id);if(!videos.has(id))videos.set(id,data);return route.fulfill({json:[videos.get(id)]});}
    const id=u.searchParams.get('project_id')?.replace(/^eq\./,'');return route.fulfill({json:[...videos.values()].filter(v=>!id||v.project_id===id)});
   }
   if(name==="creator_deliverable_records"){
    const p=u.searchParams.get("project_id")?.replace(/^eq\./,""),v=u.searchParams.get("video_id")?.replace(/^eq\./,"");
    const k=u.searchParams.get("deliverable_key")?.replace(/^eq\./,"");if(method==="GET")return route.fulfill({json:[...deliverables.values()].filter(r=>r.project_id===p&&(!v||r.video_id===v)&&(!k||r.deliverable_key===k))});
   }
   if(name==="rpc/creator_workspace_save_deliverable"){
    writes.push({kind:"deliverable",data});
    const id=key(data.p_project_id,data.p_video_id,data.p_key),cur=deliverables.get(id);
    if((cur?.revision||0)!==data.p_expected_revision)return route.fulfill({status:400,json:{message:"Revision conflict"}});
    if(data.p_status==="confirmed"&&(!data.p_evidence?.humanConfirmed||(!(data.p_evidence?.confirmationMethod==="manual"&&data.p_evidence?.confirmationSource==="human_ui")&&(!data.p_evidence?.fileName||!(data.p_evidence?.sizeBytes>0)))))
      return route.fulfill({status:400,json:{message:"Confirmed requires observed file and human QC"}});
    const row={project_id:data.p_project_id,video_id:data.p_video_id,deliverable_key:data.p_key,
       status:data.p_status,evidence:data.p_evidence,review_note:data.p_note,revision:(cur?.revision||0)+1};
    deliverables.set(id,row);return route.fulfill({json:row});
   }
   return route.fulfill({status:404,json:{message:"unmocked API "+u.pathname}});
  }
  if(u.origin!==origin)return route.abort();
  if(u.pathname==="/apps/command-center/src/config.js")return route.fulfill({contentType:"text/javascript",body:'export const CONFIG={SUPABASE_URL:"https://api.gucc.test",SUPABASE_ANON_KEY:"fixture"};'});
  if(u.pathname==="/apps/command-center/src/auth.js")return route.fulfill({contentType:"text/javascript",body:'export const getSession=()=>({access_token:"fixture",user:{id:"owner"}});export const getAccessToken=async()=>"fixture";'});
  const target=path.resolve(root,"."+decodeURIComponent(u.pathname),u.pathname.endsWith("/")?"index.html":"");
  if(!target.startsWith(root+path.sep))return route.abort();
  try{const contentType=({".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"})[path.extname(target)]||"application/octet-stream";return route.fulfill({body:await fs.readFile(target),contentType});}catch{return route.fulfill({status:404,body:"missing fixture"});}
 };
 await context.route("**/*",handleRoute);
 const page=await context.newPage();page.on("pageerror",e=>errors.push("studio: "+e.message));page.on("dialog",d=>d.accept());
 const openSwitcher=async()=>{if(await page.locator('.gcc-outcome-dialog[open]').count())await page.keyboard.press('Escape');if(!await page.locator('#guccProjectSwitcher[open]').count())await page.locator('.gcc-context-trigger').click();};
 const project=page.locator('#guccProjectSwitcher select[aria-label="选择 GUCC 项目"]');
 const video=page.locator('#guccProjectSwitcher select[aria-label="选择项目中的视频"]');
 const apply=page.locator('#guccProjectSwitcher button').filter({hasText:"在此工具使用"});
 try{
  await page.goto(origin+"/apps/video-workspace/legacy-prompt-studio-v6.html");
  await openSwitcher();await project.selectOption("A");await openSwitcher();await video.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#titleInput"),"菲欧妮解析");
  await page.locator('.studio-settings > summary').click();await page.click("#contextToggle");await page.fill("#notesInput","菲欧妮独立的锁稿约定");
  await openSwitcher();await project.selectOption("B");await openSwitcher();await video.selectOption("MAIN");await apply.click();
  assert.equal(await page.inputValue("#titleInput"),"鸣潮角色解析");
  await openSwitcher();await project.selectOption("A");await openSwitcher();await video.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#notesInput"),"菲欧妮独立的锁稿约定");
  await page.locator(".gcc-outcome-trigger").click();
  await page.locator('.gcc-outcome-chips [data-gcc-outcome=script]').click();
  await page.locator(".gcc-outcome-editor select").nth(1).selectOption("in_progress");
  await page.getByRole("button",{name:"保存成果状态",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector(".gcc-outcome-editor > small")?.textContent.includes("已同步"));
  assert.equal(deliverables.get(key("A","FIONI","script")).status,"in_progress");
  await page.locator(".gcc-outcome-editor select").nth(1).selectOption("confirmed");
  await page.getByRole("button",{name:"保存成果状态",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector(".gcc-outcome-editor > small")?.textContent.includes("版本 2"));
  const manual = deliverables.get(key("A","FIONI","script"));
  assert.equal(manual.status,"confirmed");
  assert.equal(manual.evidence.confirmationMethod,"manual");
  assert.equal(manual.evidence.confirmationSource,"human_ui");
  assert.equal(manual.evidence.fileName,"");
  assert.deepEqual(manual.evidence.artifacts,[]);
  assert.equal(manual.evidence.recording,null);
  // Reopen preserves the explicit lock and revision history; file inspection remains optional.
  await page.getByRole("button",{name:"重新打开已锁定成果",exact:true}).click();
  await page.locator(".gcc-confirm input").fill("补充可选附件");
  await page.locator(".gcc-confirm button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector(".gcc-outcome-editor > small")?.textContent.includes("版本 3"));
  await page.locator(".gcc-optional-files > summary").click();
  await page.locator(".gcc-outcome-editor select").nth(1).selectOption("confirmed");
  await page.locator('[aria-label="选择实际成果文件"]').setInputFiles({name:'SCRIPT_FINAL.md',mimeType:'text/markdown',buffer:Buffer.from('真实字节')});
  await page.waitForFunction(()=>document.querySelector('.gcc-files').textContent.includes('SCRIPT_FINAL.md'));
  await page.locator(".gcc-evidence input").check();
  await page.getByRole("button",{name:"保存成果状态",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector(".gcc-outcome-editor > small")?.textContent.includes("版本 4"));
  assert.equal(deliverables.get(key("A","FIONI","script")).status,"confirmed");
  assert.equal(deliverables.get(key("A","FIONI","script")).evidence.humanConfirmed,true);
  await page.goto(origin+"/apps/cover-generator/");
  await page.locator("#aiPromptLab summary").click();
  const p2=page.locator('#guccProjectSwitcher select[aria-label="选择 GUCC 项目"]'),v2=page.locator('#guccProjectSwitcher select[aria-label="选择项目中的视频"]');
  await openSwitcher();await p2.selectOption("A");await openSwitcher();await v2.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#aiPromptTitle"),"菲欧妮解析");
  await page.fill("#aiPromptTitle","菲欧妮的独立封面");
  await openSwitcher();await p2.selectOption("B");await openSwitcher();await v2.selectOption("MAIN");await apply.click();
  assert.equal(await page.inputValue("#aiPromptTitle"),"鸣潮角色解析");
  await openSwitcher();await p2.selectOption("A");await openSwitcher();await v2.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#aiPromptTitle"),"菲欧妮的独立封面");
  await openSwitcher();await v2.selectOption('SEVERIAN');await apply.click();
  await page.fill('#aiPromptTitle','赛维里安的独立封面');
  await openSwitcher();await v2.selectOption('FIONI');await apply.click();
  assert.equal(await page.inputValue('#aiPromptTitle'),'菲欧妮的独立封面');
  // Real PNG bytes are exported and associated as review, never auto-approved.
  await page.click('#quickExportBtn');
  await page.waitForFunction(()=>document.querySelector('.gcc-outcome-chips').textContent.includes('正式封面待审核'));
  assert(deliverables.get(key('A','FIONI','cover')).evidence.artifacts.length>=3);
  assert.equal(deliverables.get(key('A','FIONI','cover')).status,'review');
  await page.goto(origin+"/apps/publishing-console/");
  const p3=page.locator('#guccProjectSwitcher select[aria-label="选择 GUCC 项目"]'),v3=page.locator('#guccProjectSwitcher select[aria-label="选择项目中的视频"]');
  await openSwitcher();await p3.selectOption("A");await openSwitcher();await v3.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#projectTitle"),"菲欧妮解析");
  await page.fill("#projectTitle","菲欧妮正式发布单");
  await openSwitcher();await p3.selectOption("B");await openSwitcher();await v3.selectOption("MAIN");await apply.click();
  const savedA=await page.evaluate(()=>{const all=JSON.parse(localStorage.getItem("gucc_publish_video_drafts_v1")||"{}");return {keys:Object.keys(all),a:all[JSON.stringify(["A","FIONI"])]?.project?.title,active:JSON.parse(localStorage.getItem("gucc_publish_console_v1")||"{}")?.project?.title};});
  assert.equal(savedA.a,"菲欧妮正式发布单","A publish draft must be persisted before switching to B: "+JSON.stringify(savedA));
  assert.equal(await page.inputValue("#projectTitle"),"鸣潮角色解析");
  await openSwitcher();await p3.selectOption("A");await openSwitcher();await v3.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#projectTitle"),"菲欧妮正式发布单");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("gucc_creator_active_context_v1")).videoId),"FIONI");
  await openSwitcher();await v3.selectOption('SEVERIAN');await apply.click();await page.fill('#projectTitle','赛维里安的独立发布单');
  await openSwitcher();await v3.selectOption('FIONI');await apply.click();assert.equal(await page.inputValue('#projectTitle'),'菲欧妮正式发布单');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/apps/video-workspace/production-system/');
  await page.waitForFunction(()=>window.GuccCreatorOS?.current()?.projectId==='A');
  await page.locator('.gcc-outcome-trigger').click();
  await page.waitForFunction(()=>document.querySelector('.gcc-outcome-chips').textContent.includes('文案已确认'));
  await fs.mkdir(path.join(root,'tmp/unified-workspace-browser'),{recursive:true});
  await page.screenshot({path:path.join(root,'tmp/unified-workspace-browser/creator-desktop.png'),fullPage:true});
  // Both videos inside A keep independent official content and SRT drafts.
  const p4=page.getByLabel('选择 GUCC 项目',{exact:true}),v4=page.getByLabel('选择项目中的视频',{exact:true});
  await openSwitcher();await p4.selectOption('A');await openSwitcher();await v4.selectOption('SEVERIAN');await apply.click();
  await page.waitForFunction(()=>document.querySelector('.gucc-creator-context').textContent.includes('赛维里安'));
  assert.match(await page.locator('#currentTaskName').textContent(),/赛维里安/);
  await page.locator('.gcc-outcome-trigger').click();await page.getByLabel('成果内容',{exact:true}).fill('赛维里安的独立文案');
  await page.getByLabel('成果状态',{exact:true}).selectOption('in_progress');
  assert.equal(await page.getByLabel('成果内容',{exact:true}).inputValue(), '赛维里安的独立文案');
  await page.getByRole('button',{name:'保存成果状态',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.gcc-outcome-editor > small').textContent.includes('已同步'));
  assert.equal(deliverables.get(key('A','FIONI','script')).status,'confirmed');
  assert.equal(deliverables.get(key('A','SEVERIAN','script')).evidence.content,'赛维里安的独立文案',JSON.stringify({writes:writes.slice(-3),drafts:await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('gucc_outcome')).map(k=>[k,JSON.parse(localStorage.getItem(k))])))}));
  // Simulate another device changing this exact outcome, then verify explicit reconciliation.
  const remote=deliverables.get(key('A','SEVERIAN','script'));remote.revision++;remote.evidence={...remote.evidence,content:'云端另一设备的版本'};
  await page.getByLabel('成果内容',{exact:true}).fill('本浏览器保留的修订');
  await page.getByRole('button',{name:'保存成果状态',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.gcc-outcome-editor > small').textContent.includes('保存未完成'));
  assert.equal(await page.getByLabel('成果内容',{exact:true}).inputValue(),'本浏览器保留的修订');
  assert.equal(deliverables.get(key('A','SEVERIAN','script')).evidence.content,'云端另一设备的版本');
  await page.getByRole('button',{name:'读取云端最新版本',exact:true}).click();
  await page.getByRole('button',{name:'核对后保留本浏览器草稿',exact:true}).click();await page.locator('.gcc-confirm button[type=submit]').click();
  await page.getByRole('button',{name:'保存成果状态',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.gcc-outcome-editor > small').textContent.includes('已同步'));
  assert.equal(deliverables.get(key('A','SEVERIAN','script')).evidence.content,'本浏览器保留的修订');
  await page.locator('.gcc-outcome-chips [data-gcc-outcome=subtitle]').click();
  await page.getByLabel('成果内容',{exact:true}).fill('1\n00:00:00,000 --> 00:00:01,000\n真实字幕');
  await page.getByLabel('成果状态',{exact:true}).selectOption('review');
  await page.getByRole('button',{name:'保存成果状态',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.gcc-outcome-editor > small').textContent.includes('已同步'));
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.gucc-creator-context').textContent.includes('赛维里安'));
  assert.equal(await page.getByLabel('选择项目中的视频',{exact:true}).inputValue(),'SEVERIAN');
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
  await page.locator('.gcc-outcome-trigger').click();
  await page.screenshot({path:path.join(root,'tmp/unified-workspace-browser/creator-mobile.png'),fullPage:true});
  const freshContext=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await freshContext.route('**/*',handleRoute);
  await freshContext.addInitScript(h=>localStorage.setItem('gucc_access_hash_v2',h),hash);
  const fresh=await freshContext.newPage();fresh.on('pageerror',e=>errors.push('fresh: '+e.message));
  await fresh.goto(origin+'/apps/video-workspace/legacy-prompt-studio-v6.html?project=A&video=SEVERIAN');
  await fresh.locator('.gcc-outcome-trigger').click();
  await fresh.waitForFunction(()=>document.querySelector('[aria-label="成果内容"]').value==='本浏览器保留的修订');
  assert.equal(await fresh.evaluate(()=>Object.keys(localStorage).includes('gucc_creator_studio_scoped_drafts_v1')),true);
  await freshContext.close();
  // Create once from the shared surface, then reuse the exact identity in every tool.
  await openSwitcher();await page.getByRole('button',{name:'＋ 新项目',exact:true}).click();
  await page.locator('.gcc-dialog label input').nth(0).fill('单视频验收项目');
  await page.locator('.gcc-dialog label input').nth(1).fill('绝区零');
  await page.locator('.gcc-dialog label input').nth(2).fill('3.3');
  await page.locator('.gcc-dialog button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('.gucc-creator-context').textContent.includes('单视频验收项目'));
  const created=await page.evaluate(()=>window.GuccCreatorContext.read());assert.match(created.projectId,/^PROJECT-/);assert.equal(created.videoId,'MAIN');
  for(const url of ['/apps/video-workspace/legacy-prompt-studio-v6.html','/apps/cover-generator/','/apps/publishing-console/']){
    await page.goto(origin+url);await page.waitForFunction(()=>document.querySelector('.gucc-creator-context').textContent.includes('单视频验收项目'));
    assert.deepEqual(await page.evaluate(()=>window.GuccCreatorContext.read()),created);
  }
  await openSwitcher();await page.getByRole('button',{name:'＋ 视频',exact:true}).click();
  await page.locator('.gcc-dialog label input').nth(0).fill('新增第二条视频');
  await page.locator('.gcc-dialog button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('.gucc-creator-context').textContent.includes('新增第二条视频'));
  assert.equal(await page.evaluate(()=>window.GuccCreatorContext.read().projectId),created.projectId);
  assert.equal(snapshots[created.projectId].videos.length,2);
  assert.equal(snapshots[created.projectId].promptFlow.length,12);
  await openSwitcher();await page.getByLabel('搜索创作项目',{exact:true}).fill('单视频');
  assert.equal(await page.locator('[aria-label="选择 GUCC 项目"] option').count(),2);
  assert.equal(writes.filter(w=>w.kind==="deliverable").length,9,"No implicit outcome writes on draft switching");
  assert.deepEqual(errors,[]);
  console.log("Unified Creator browser QA passed: single-project creation, same-project dual videos, Creator/Studio/Cover/Publish context, completed access, real-byte QC, scoped text/SRT drafts, refresh, search, desktop and mobile screenshots.");
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
