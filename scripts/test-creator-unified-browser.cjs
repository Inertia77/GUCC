"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const path=require("node:path");
const {chromium}=require("playwright-core");
const base=path.resolve(__dirname,".."),origin="https://unified.gucc.test";
async function main(){
 const browser=await chromium.launch({headless:true,...(process.env.GUCC_TEST_EXECUTABLE?{executablePath:process.env.GUCC_TEST_EXECUTABLE}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({serviceWorkers:"block"});
 const external=[],errors=[],videos=[],results=new Map();
 const project={project_id:"PROJECT-TEST-A",name:"绝区零3.3 双视频",game:"绝区零",topic:"前瞻",current_state:"IDEA",updated_at:"2026-10-14T00:00:00Z"};
 await context.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname==="rubjeqnuxuvupjwyksmo.supabase.co"){
     const prefix="/rest/v1/",pathname=url.pathname;
     if(!pathname.startsWith(prefix))return route.fulfill({status:404,body:"not found"});
     const target=pathname.slice(prefix.length),method=req.method();
     const body=method==="POST"?JSON.parse(req.postData()||"{}"):null;
     const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
     if(target==="creator_projects"&&method==="GET")return send([project]);
     if(target==="creator_video_workspaces"&&method==="GET")return send(videos.filter(v=>v.project_id===url.searchParams.get("project_id")?.replace(/^eq\./,"")));
     if(target==="creator_video_workspaces"&&method==="POST"){const row={...body,updated_at:new Date().toISOString()};videos.push(row);return send([row],201);}
     if(target==="creator_deliverable_records"&&method==="GET"){
       const p=url.searchParams.get("project_id")?.replace(/^eq\./,""),v=url.searchParams.get("video_id")?.replace(/^eq\./,"");
       return send([...results.values()].filter(x=>x.project_id===p&&x.video_id===v));
     }
     if(target==="rpc/creator_workspace_save_deliverable"&&method==="POST"){
       const key=JSON.stringify([body.p_project_id,body.p_video_id,body.p_key]),old=results.get(key);
       if((old?.revision||0)!==body.p_expected_revision)return send({message:"Revision conflict"},409);
       if(body.p_status==="confirmed"&&(!body.p_evidence?.humanConfirmed||!(body.p_evidence?.sizeBytes>0)))return send({message:"Missing actual file proof"},400);
       const row={project_id:body.p_project_id,video_id:body.p_video_id,deliverable_key:body.p_key,status:body.p_status,revision:(old?.revision||0)+1,review_note:body.p_note,evidence:body.p_evidence};
       results.set(key,row);return send(row);
     }
     return send({message:"Unexpected mocked API: "+method+" "+target},404);
   }
   if(url.origin!==origin){external.push(url.origin);return route.abort();}
   const target=path.resolve(base,"."+decodeURIComponent(url.pathname),url.pathname.endsWith("/")?"index.html":"");
   if(!target.startsWith(base+path.sep))return route.abort();
   try{const body=await fs.readFile(target);const type=({".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".png":"image/png",".woff2":"font/woff2"})[path.extname(target)]||"text/plain";return route.fulfill({body,contentType:type});}
   catch{return route.fulfill({status:404,body:"fixture missing"});}
 });
 const guard=await fs.readFile(path.join(base,"assets/access-guard.js"),"utf8");
 const hash=guard.match(/ACCESS_HASH = '([^']+)'/)[1];
 await context.addInitScript(({hash})=>{
   localStorage.setItem("gucc_access_hash_v2",hash);
   localStorage.setItem("gameup_session_v5",JSON.stringify({access_token:"isolated-jwt",expires_at:9999999999,user:{id:"tester"}}));
 },{hash});
 const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(origin+"/apps/video-workspace/legacy-prompt-studio-v6.html?project=PROJECT-TEST-A");
  await page.waitForSelector(".gucc-unified-bar select");
  await page.waitForFunction(()=>document.querySelector(".gucc-u-message")?.textContent.includes("项目已连接"));
  assert.equal(await page.locator(".gucc-u-deliverables button").count(),6);
  page.once("dialog",d=>d.accept("菲欧妮解析"));
  await page.getByRole("button",{name:"＋ 新视频"}).click();
  await page.waitForURL(/video=VID-/);
  const firstUrl=new URL(page.url()),id=firstUrl.searchParams.get("video");
  assert.equal(firstUrl.searchParams.get("project"),project.project_id);
  assert.equal(videos.length,1);
  await page.waitForFunction(()=>document.querySelector(".gucc-u-message")?.textContent.includes("云端已连接"));
  assert.equal(await page.inputValue("#titleInput"),"菲欧妮解析");
  await page.click("#copyButton");
  await page.waitForFunction(()=>document.querySelector(".gucc-u-deliverables button")?.textContent.includes("制作中"));
  const initial=results.get(JSON.stringify([project.project_id,id,"script"]));
  assert.equal(initial.status,"in_progress");
  await page.locator(".gucc-u-deliverables button").first().click();
  await page.selectOption("#guccUStatus","confirmed");
  await page.locator("#guccUForm [type=submit]").click();
  assert.equal(results.get(JSON.stringify([project.project_id,id,"script"])).status,"in_progress","No file must not confirm");
  await page.locator("#guccUFile").setInputFiles({name:"SCRIPT_FINAL.md",mimeType:"text/markdown",buffer:Buffer.from("# 正式文案\n已复核")});
  await page.locator("#guccUChecked").check();
  await page.locator("#guccUForm [type=submit]").click();
  await page.waitForFunction(()=>document.querySelector(".gucc-u-deliverables button")?.textContent.includes("已确认"));
  assert.equal(results.get(JSON.stringify([project.project_id,id,"script"])).status,"confirmed");
  const pub=page.locator(".gucc-u-tools a").filter({hasText:"发布"});
  await pub.click();
  await page.waitForURL(/publishing-console\/\?project=/);
  await page.waitForFunction(()=>window.GuccPublishDrafts?.current()?.project?.videoId);
  const current=await page.evaluate(()=>window.GuccPublishDrafts.current().project);
  assert.equal(current.creatorProjectId,project.project_id);
  assert.equal(current.videoId,id);
  assert.equal(current.title,"菲欧妮解析");
  assert.deepEqual(errors,[],"No runtime page errors");
  assert(!external.some(e=>e.includes("supabase")),"Actual production Supabase was never contacted");
  console.log("Unified browser QA passed: identity -> independent video -> draft -> actual file QC -> publish draft.");
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
