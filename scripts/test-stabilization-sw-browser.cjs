'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('playwright-core'),{build,stamp}=require('./build-pages.cjs');
(async()=>{
 const out=path.resolve('tmp/stabilization-sw'),shaA='a'.repeat(40),shaB='b'.repeat(40);await fsp.mkdir(out,{recursive:true});
 build(path.join(out,'old'),shaA);build(path.join(out,'new'),shaB);
 // Baseline contains duplicate shell entries; deduplicate only the old fixture so
 // its legacy caching/update strategy can be installed and exercised for upgrade.
 const oldSource=fs.readFileSync(path.join(__dirname,'fixtures/legacy-sw.js'),'utf8');
 fs.writeFileSync(path.join(out,'old/sw.js'),stamp(oldSource,shaA).replace('cache.addAll(APP_SHELL)','cache.addAll([...new Set(APP_SHELL)])').replace('gucc-static-v59','gucc-static-'+shaA).replace('gucc-runtime-v50','gucc-runtime-'+shaA));
 let stage='old';
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);const file=path.resolve(out,stage,'.'+name+(name.endsWith('/')?'index.html':''));
  if(!file.startsWith(path.resolve(out,stage)+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=await fsp.readFile(file);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{console.error('fixture missing',name);res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'allow'});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  let page=await context.newPage();await page.goto(origin+'/offline.html');
  console.log('installing old worker');await page.evaluate(async()=>{localStorage.setItem('gucc_creator_os_v2','draft-preserve');await navigator.serviceWorker.register('/sw.js');await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('old worker failed to activate')),25000))]);});console.log('old active');
  await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);
  const oldCaches=await page.evaluate(()=>caches.keys());assert(oldCaches.some(k=>k.includes('a'.repeat(40))));
  console.log('upgrading');stage='new';await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
  for(let i=0;i<120;i++){if(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting)))break;await new Promise(resolve=>setTimeout(resolve,250));}
  // The existing document stays with its original worker until it closes.
  assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),true);
  await page.reload();const release=await page.evaluate(async()=>await (await fetch('/release.json',{cache:'no-store'})).json());assert.equal(release.sha,shaB);assert.equal(await page.evaluate(()=>localStorage.getItem('gucc_creator_os_v2')),'draft-preserve');
  await page.close();page=await context.newPage();await page.goto(origin+'/offline.html');for(let i=0;i<120;i++){if(await page.evaluate(async()=>!(await navigator.serviceWorker.getRegistration())?.waiting))break;await new Promise(resolve=>setTimeout(resolve,250));}
  const activeCaches=await page.evaluate(()=>caches.keys());assert(activeCaches.includes('gucc-static-'+shaB));assert(!activeCaches.includes('gucc-static-'+shaA));
  await page.evaluate(async()=>{await fetch('/assets/creator-portal-core.mjs?release='+ 'b'.repeat(40));});
  await context.setOffline(true);await page.reload();assert(await page.title());assert.equal(await page.evaluate(()=>localStorage.getItem('gucc_creator_os_v2')),'draft-preserve');
  const offlineCode=await page.evaluate(async()=>{const r=await fetch('/assets/creator-portal-core.mjs?release='+'b'.repeat(40));return {ok:r.ok,text:await r.text()}});assert(offlineCode.ok);assert(offlineCode.text.includes('confirmedDeliverables'));
  for(const asset of ['apps/publishing-console/publication-records.mjs?v=1&release='+shaB,'apps/command-center/src/date-window.mjs?release='+shaB]){
   const available=await page.evaluate(async asset=>(await fetch('/'+asset)).ok,asset);assert(available,'new module missing from offline shell: '+asset);
  }
  await fsp.writeFile(path.join(out,'results.json'),JSON.stringify({old:shaA,current:shaB,upgrade:'passed',offline:'passed',draftPreserved:true},null,2));
  console.log('Real Service Worker upgrade passed: previous worker → waiting → activation, SHA resource identity, offline code and user draft preservation.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
