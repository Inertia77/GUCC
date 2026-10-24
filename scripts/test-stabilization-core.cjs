'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
 const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const portal=await import('../assets/creator-portal-core.mjs');
 const projects=portal.normalizeProjects([{projectId:'A',lifecycle:'active',videoCount:1,totalDeliverables:6,confirmedDeliverables:6,totalNodes:6,doneNodes:0},{projectId:'B',lifecycle:'completed',totalDeliverables:6,confirmedDeliverables:0,totalNodes:6,doneNodes:6}]);
 assert.equal(portal.activeTasks(projects).length,1);assert.equal(portal.nextTask(projects[0]).title,'六项成果已确认');assert.equal(portal.nextTask(projects[1]),null);
 const date=await import('../apps/command-center/src/date-window.mjs'),now=Date.parse('2026-10-24T12:00:00Z');
 for(const [start,end,status] of [[null,null,'unknown'],[null,'2026-10-23T12:00Z','ended'],['2026-10-25T12:00Z',null,'upcoming'],['2026-10-23T12:00Z',null,'unknown'],['2026-10-23T12:00Z','2026-10-25T12:00Z','current'],['2026-10-25T12:00Z','2026-10-23T12:00Z','invalid']])assert.equal(date.classifyWindow(start,end,now).status,status);
 assert.equal(date.classifyWindow('2026-10-23T12:00:00','2026-10-25T12:00:00',now).status,'unknown');
 assert.match(date.formatWindow(null,null),/待核实/);assert.match(date.formatWindow('2026-10-24T12:00:00',null),/时区待核实/);
 const out=require('../apps/video-workspace/production-system/creator-os-outcomes.js');assert.equal(out.confirmationLabel({status:'confirmed',evidence:{confirmationMethod:'manual'}}),'已确认 · 人工判断');
 const flow=read('.github/workflows/ci.yml');
 const deploy=flow.slice(flow.indexOf('\n  deploy:'));
 assert.match(deploy,/needs: \[test, pages-source\]/);assert.match(deploy,/github.event_name == 'push' && github.ref == 'refs\/heads\/main'/);assert.doesNotMatch(deploy,/always\(\)|continue-on-error/);assert.match(flow,/build_type: 'workflow'/);assert.match(deploy,/Reject obsolete main build/);
 // Execute dependency truth table, including skipped/cancelled/failed prerequisites.
 const eligible=(event,ref,test,source)=>event==='push'&&ref==='refs/heads/main'&&[test,source].every(x=>x==='success');
 for(const test of ['success','failure','cancelled','skipped'])for(const source of ['success','failure','cancelled','skipped'])assert.equal(eligible('push','refs/heads/main',test,source),test==='success'&&source==='success');
 assert(!eligible('pull_request','refs/heads/main','success','success'));assert(!eligible('push','refs/heads/fix/test','success','success'));
 const {stamp}=require('./build-pages.cjs');const sha='a'.repeat(40);const text=stamp('import "./module.mjs?v=2"; <script src="assets/app.js"></script>',sha);assert.equal((text.match(/release=aaaaaaaa/g)||[]).length,2);assert(!stamp('https://api.example.com/path',sha).includes('release='));
 // Real worker handlers, isolated CacheStorage: bounds and unrelated cache preservation.
 const handlers={},cacheMap=new Map();
 const caches={keys:async()=>[...cacheMap.keys()],delete:async k=>cacheMap.delete(k),open:async name=>{if(!cacheMap.has(name))cacheMap.set(name,new Map());const cache=cacheMap.get(name);return{put:async(k,v)=>{cache.set(typeof k==='string'?k:k.url,v)},keys:async()=>[...cache.keys()],delete:async k=>cache.delete(k)}}};
 cacheMap.set('gucc-user-drafts',new Map([['keep',true]]));cacheMap.set('gucc-static-v59',new Map());
 let claimed=false,skipped=false;
 const context=vm.createContext({self:{addEventListener:(n,fn)=>handlers[n]=fn,location:{origin:'https://gucc.test'},clients:{claim:()=>{claimed=true}},skipWaiting:()=>{skipped=true}},caches,URL,Response,Promise,fetch:async()=>new Response('fresh')});vm.runInContext(read('sw.js'),context);
 let activation;handlers.activate({waitUntil:p=>activation=p});await activation;assert(cacheMap.has('gucc-user-drafts'));assert(!cacheMap.has('gucc-static-v59'));assert(!claimed&&!skipped);
 await Promise.all(Array.from({length:240},(_,i)=>vm.runInContext(`putRuntime('https://gucc.test/image-${i}',new Response('x'))`,context)));
 assert.equal(cacheMap.get('gucc-runtime-v51').size,180);
 console.log('Stabilization core: formal progress, independent lifecycle, date uncertainty, release stamping, CI failure gate matrix and worker cache bounds passed.');
})().catch(e=>{console.error(e);process.exit(1)});
