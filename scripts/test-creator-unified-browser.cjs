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
const videos=new Map(),deliverables=new Map(),writes=[],errors=[];
const key=(p,v,k="")=>JSON.stringify([p,v,k]);
const reqJson=route=>{try{return route.request().postDataJSON()}catch{return null}};
async function main(){
 const browser=await chromium.launch({headless:true,...(process.env.GUCC_TEST_EXECUTABLE?{executablePath:process.env.GUCC_TEST_EXECUTABLE}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({serviceWorkers:"block",viewport:{width:390,height:844}});
 const guard=await fs.readFile(path.join(root,"assets/access-guard.js"),"utf8"),hash=guard.match(/ACCESS_HASH = '([^']+)'/)[1];
 await context.addInitScript(h=>{localStorage.setItem("gucc_access_hash_v2",h);localStorage.setItem("gameup_session_v5",JSON.stringify({access_token:"fixture"}));},hash);
 await context.route("**/*",async route=>{
  const u=new URL(route.request().url()),method=route.request().method(),data=reqJson(route);
  if(u.origin===api){
   const name=u.pathname.replace("/rest/v1/","");
   if(name==="rpc/creator_os_portal_dashboard")return route.fulfill({json:projectRows});
   if(name==="creator_os_workspace_snapshots"){
    const id=u.searchParams.get("project_id")?.replace(/^eq\./,"");
    return route.fulfill({json:id&&snapshots[id]?[{project_id:id,project_data:snapshots[id]}]:[]});
   }
   if(name==="creator_videos"){
    if(method==="POST"){writes.push({kind:"video",data});const id=key(data.project_id,data.video_id);if(!videos.has(id))videos.set(id,data);return route.fulfill({json:[videos.get(id)]});}
    return route.fulfill({json:[...videos.values()]});
   }
   if(name==="creator_video_deliverables"){
    const p=u.searchParams.get("project_id")?.replace(/^eq\./,""),v=u.searchParams.get("video_id")?.replace(/^eq\./,"");
    if(method==="GET")return route.fulfill({json:[...deliverables.values()].filter(r=>r.project_id===p&&r.video_id===v)});
    if(method==="POST"){writes.push({kind:"deliverable",data});const id=key(data.project_id,data.video_id,data.deliverable_key);if(deliverables.has(id))return route.fulfill({status:409,json:{message:"duplicate"}});
      const row={...data,revision:1};deliverables.set(id,row);return route.fulfill({json:[row]});}
    if(method==="PATCH"){writes.push({kind:"deliverable",data});const k=u.searchParams.get("deliverable_key")?.replace(/^eq\./,""),id=key(p,v,k),cur=deliverables.get(id),rev=Number(u.searchParams.get("revision")?.replace(/^eq\./,""));if(!cur||cur.revision!==rev)return route.fulfill({json:[]});
      const row={...cur,...data};deliverables.set(id,row);return route.fulfill({json:[row]});}
   }
   return route.fulfill({status:404,json:{message:"unmocked API "+u.pathname}});
  }
  if(u.origin!==origin)return route.abort();
  if(u.pathname==="/apps/command-center/src/config.js")return route.fulfill({contentType:"text/javascript",body:'export const CONFIG={SUPABASE_URL:"https://api.gucc.test",SUPABASE_ANON_KEY:"fixture"};'});
  if(u.pathname==="/apps/command-center/src/auth.js")return route.fulfill({contentType:"text/javascript",body:'export const getSession=()=>({access_token:"fixture"});export const getAccessToken=async()=>"fixture";'});
  const target=path.resolve(root,"."+decodeURIComponent(u.pathname),u.pathname.endsWith("/")?"index.html":"");
  if(!target.startsWith(root+path.sep))return route.abort();
  try{const contentType=({".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"})[path.extname(target)]||"application/octet-stream";return route.fulfill({body:await fs.readFile(target),contentType});}catch{return route.fulfill({status:404,body:"missing fixture"});}
 });
 const page=await context.newPage();page.on("pageerror",e=>errors.push("studio: "+e.message));
 const project=page.locator('#guccCreatorContextBar select[aria-label="选择 GUCC 项目"]');
 const video=page.locator('#guccCreatorContextBar select[aria-label="选择项目中的视频"]');
 const apply=page.locator('#guccCreatorContextBar button').filter({hasText:"在此工具使用"});
 try{
  await page.goto(origin+"/apps/video-workspace/legacy-prompt-studio-v6.html");
  await project.selectOption("A");await video.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#titleInput"),"菲欧妮解析");
  await page.click("#contextToggle");await page.fill("#notesInput","菲欧妮独立的锁稿约定");
  await project.selectOption("B");await video.selectOption("MAIN");await apply.click();
  assert.equal(await page.inputValue("#titleInput"),"鸣潮角色解析");
  await project.selectOption("A");await video.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#notesInput"),"菲欧妮独立的锁稿约定");
  await page.locator(".gcc-outcomes summary").click();
  await page.locator(".gcc-outcome-editor select").nth(0).selectOption("script");
  await page.locator(".gcc-outcome-editor select").nth(1).selectOption("working");
  await page.locator(".gcc-outcome-editor button").click();
  await page.waitForFunction(()=>document.querySelector(".gcc-outcome-editor small")?.textContent.includes("已保存到 Supabase"));
  assert.equal(deliverables.get(key("A","FIONI","script")).status,"working");
  await page.locator(".gcc-outcome-editor select").nth(1).selectOption("confirmed");
  await page.locator(".gcc-outcome-editor button").click();
  assert.match(await page.locator(".gcc-outcome-editor small").textContent(),/请先填真实产物/);
  assert.equal(deliverables.get(key("A","FIONI","script")).revision,1);
  await page.locator(".gcc-outcome-editor>input").fill("SCRIPT_FINAL.md");
  await page.locator(".gcc-evidence input").check();
  await page.locator(".gcc-outcome-editor button").click();
  await page.waitForFunction(()=>document.querySelector(".gcc-outcome-editor small")?.textContent.includes("Revision 2"));
  assert.equal(deliverables.get(key("A","FIONI","script")).status,"confirmed");
  assert.equal(deliverables.get(key("A","FIONI","script")).verification.humanApproved,true);
  await page.goto(origin+"/apps/cover-generator/");
  await page.locator("#aiPromptLab summary").click();
  const p2=page.locator('#guccCreatorContextBar select[aria-label="选择 GUCC 项目"]'),v2=page.locator('#guccCreatorContextBar select[aria-label="选择项目中的视频"]');
  await p2.selectOption("A");await v2.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#aiPromptTitle"),"菲欧妮解析");
  await page.fill("#aiPromptTitle","菲欧妮的独立封面");
  await p2.selectOption("B");await v2.selectOption("MAIN");await apply.click();
  assert.equal(await page.inputValue("#aiPromptTitle"),"鸣潮角色解析");
  await p2.selectOption("A");await v2.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#aiPromptTitle"),"菲欧妮的独立封面");
  await page.goto(origin+"/apps/publishing-console/");
  const p3=page.locator('#guccCreatorContextBar select[aria-label="选择 GUCC 项目"]'),v3=page.locator('#guccCreatorContextBar select[aria-label="选择项目中的视频"]');
  await p3.selectOption("A");await v3.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#projectTitle"),"菲欧妮解析");
  await page.fill("#projectTitle","菲欧妮正式发布单");
  await p3.selectOption("B");await v3.selectOption("MAIN");await apply.click();
  const savedA=await page.evaluate(()=>{const all=JSON.parse(localStorage.getItem("gucc_publish_video_drafts_v1")||"{}");return {keys:Object.keys(all),a:all[JSON.stringify(["A","FIONI"])]?.project?.title,active:JSON.parse(localStorage.getItem("gucc_publish_console_v1")||"{}")?.project?.title};});
  assert.equal(savedA.a,"菲欧妮正式发布单","A publish draft must be persisted before switching to B: "+JSON.stringify(savedA));
  assert.equal(await page.inputValue("#projectTitle"),"鸣潮角色解析");
  await p3.selectOption("A");await v3.selectOption("FIONI");await apply.click();
  assert.equal(await page.inputValue("#projectTitle"),"菲欧妮正式发布单");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("gucc_creator_active_context_v1")).videoId),"FIONI");
  assert.equal(writes.filter(w=>w.kind==="deliverable").length,2,"No implicit outcome writes on draft switching");
  assert.deepEqual(errors,[]);
  console.log("Unified Creator browser QA passed: completed project, dual video context, Studio/Cover/Publish draft isolation, QC gate and CAS status.");
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
