"use strict";
// Real Chromium rendering of the selected source revision. Requests are isolated:
// project data is an optional read-only local snapshot, never a production write.
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright-core');
const repo=path.resolve(process.env.GUCC_CAPTURE_ROOT||path.join(__dirname,'..'));
const output=path.resolve(process.env.GUCC_CAPTURE_OUTPUT||path.join(__dirname,'../tmp/upgrade/after'));
const paths={portal:'/',studio:'/apps/video-workspace/legacy-prompt-studio-v6.html',creator:'/apps/video-workspace/production-system/',command:'/apps/command-center/',cover:'/apps/cover-generator/',publish:'/apps/publishing-console/',library:'/reference/resource-library.html'};
(async()=>{
 const project=process.env.GUCC_CAPTURE_PROJECT?JSON.parse(await fs.readFile(process.env.GUCC_CAPTURE_PROJECT,'utf8')):require('./gucc-browser-fixture.cjs').project();
 const browser=await chromium.launch({executablePath:process.env.GUCC_TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 await fs.mkdir(output,{recursive:true});const results=[];
 for(const width of [1600,1280,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},serviceWorkers:'block'});
  await context.addInitScript(p=>localStorage.setItem('gucc_creator_os_v2',JSON.stringify({projects:[p],selectedProjectId:p.projectId})),project);
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin==='https://fixture.test'){
    if(u.pathname.endsWith('creator_os_portal_dashboard'))return route.fulfill({json:[{projectId:project.projectId,name:project.name,game:project.game,version:project.version,status:project.status,lifecycle:'active',totalNodes:project.promptFlow.length,doneNodes:project.promptFlow.filter(n=>n.status==='DONE').length,nextNode:project.promptFlow.find(n=>n.status==='PENDING')}]});
    return route.fulfill({json:[]});
   }
   if(u.origin!=='https://gucc.test')return route.abort();
   const js=body=>route.fulfill({contentType:'text/javascript',body});
   if(u.pathname==='/assets/access-guard.js')return js(`window.GuccAccess={hasAccess:()=>true,redirectTarget:()=>'',clearAccess:()=>{}};const s=document.createElement('script');s.src='/assets/gucc-shell.js';s.dataset.root='/';document.head.append(s);`);
   if(u.pathname==='/apps/command-center/src/config.js')return js(`export const CONFIG={SUPABASE_URL:'https://fixture.test',SUPABASE_ANON_KEY:'isolated',EDGE_FUNCTION_NAME:'gameup-api'};`);
   if(u.pathname==='/apps/command-center/src/auth.js')return js(`export const getSession=()=>null;export const getAccessToken=async()=>'';export const restoreSession=async()=>null;export const clearSession=()=>{};export const isLoggedIn=()=>false;export const signIn=async()=>null;export const signOut=()=>{};export const signUp=()=>{throw Error('Disabled')};`);
   if(u.pathname==='/__test-font.woff2')return route.fulfill({body:await fs.readFile(path.join(__dirname,'../assets/fonts/noto-sc/noto-sans-sc-chinese-simplified-400-normal.woff2')),contentType:'font/woff2'});
   let target=path.resolve(repo,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
   if(!target.startsWith(repo+path.sep))return route.abort();
   try{const body=await fs.readFile(target);return route.fulfill({body,contentType:({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.png':'image/png'})[path.extname(target)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:'Missing asset'});}
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,url] of Object.entries(paths)){
   await page.goto('https://gucc.test'+url);await page.addStyleTag({content:['Noto Sans SC','Microsoft YaHei','PingFang SC','Noto Sans CJK SC','Source Han Sans SC'].map(f=>`@font-face{font-family:"${f}";src:url('/__test-font.woff2') format('woff2');font-weight:100 900;font-display:swap}`).join('')});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});
   await page.screenshot({path:path.join(output,`${name}-${width}-viewport.png`)});
   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));results.push({name,width,...dimensions,errors:errors.splice(0)});
  }
  if(!process.env.GUCC_CAPTURE_ROOT&&[1280,390].includes(width)){
   await page.goto('https://gucc.test/apps/video-workspace/production-system/');await page.waitForFunction(()=>window.GuccCreatorOS);
   await page.click('#applyResultBtn');await page.screenshot({path:path.join(output,`creator-import-${width}.png`)});await page.locator('#resultDialog').evaluate(d=>d.close());
   await page.click('#editProjectBtn');await page.screenshot({path:path.join(output,`creator-project-${width}.png`)});await page.locator('#editProjectDialog').evaluate(d=>d.close());
  }
  await context.close();
 }
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
