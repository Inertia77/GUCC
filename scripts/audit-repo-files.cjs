#!/usr/bin/env node
'use strict';
/* GUCC repository reachability inventory. Conservative: absence of a literal
 * reference is NOT proof that a file is safe to remove (dynamic loaders,
 * standalone URLs, manual Windows scripts, externally shared links).
 * Run in a full git checkout: node scripts/audit-repo-files.cjs
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'), sep='/';
const ignored=new Set(['.git','node_modules','_site','tmp','.cache','.next','coverage']);
const files=[];
function walk(dir=''){
 for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  if(ignored.has(entry.name))continue;
  const rel=[dir,entry.name].filter(Boolean).join(sep);
  if(entry.isDirectory())walk(rel);
  else if(entry.isFile())files.push(rel);
 }
}
walk();files.sort();
const isText=p=>/\.(?:html?|m?js|cjs|css|md|json|webmanifest|ya?ml|toml|sql|bat|ps1|txt|csv|svg)$/i.test(p);
const textFiles=new Map();
for(const file of files){
 if(!isText(file))continue;
 const stat=fs.statSync(path.join(root,file));
 if(stat.size>1024*1024)continue;
 try{textFiles.set(file,fs.readFileSync(path.join(root,file),'utf8'))}catch{}
}
function references(target){
 const result=[];
 const name=path.posix.basename(target), directory=path.posix.dirname(target);
 for(const [from,content] of textFiles){
  if(from===target || from.startsWith('archive/'))continue;
  const relative=path.posix.relative(path.posix.dirname(from),target);
  const variants=[target,'/'+target,'./'+target,relative,'./'+relative];
  const exact=variants.some(t=>t.length>3 && content.includes(t));
  // Name-only matches are weak: duplicate filenames or product copy can match.
  const weak=!exact && name.length>8 && content.includes(name);
  if(exact||weak)result.push({from,confidence:exact?'explicit':'name-only',
    deployment:from==='sw.js'?'precache':from.startsWith('.github/')?'ci':from==='package.json'?'npm':from.match(/\.(?:js|cjs|mjs|html|css|ts)$/)?'code':'documentation'});
 }
 return result;
}
const knownProtected=p=>
 /^supabase\/(migrations|functions|rollback|sql)\//.test(p)||
 /^scripts\/test-|^scripts\/check-|^scripts\/fixtures\//.test(p)||
 /^apps\/video-workspace\/legacy\//.test(p)||
 /^reference\/story-library\/story-library\/games\//.test(p)||
 /\.(?:psd|woff2|png|jpe?g|webp|svg)$/i.test(p)||
 /(^|\/)(?:README|AGENTS)\.md$/.test(p);
const cohorts={
 'supabase-csv-snapshot':p=>p.startsWith('data/exports from supabase/'),
 'creator-example-fixture':p=>p.startsWith('apps/video-workspace/production-system/fixtures/'),
 'historical-uiux-report':p=>/^docs\/uiux-audit-2026-08-25/.test(p),
 'historical-ateliers':p=>/^docs\/gucc-(?:atelier-v2-acceptance|atelier-visual-acceptance|mobile-layout-repair)-/.test(p),
 'historical-research-archive':p=>p.startsWith('reference/legacy/'),
 'local-artwork':p=>p.startsWith('assets/creative/'),
 'standalone-legacy':p=>p.startsWith('apps/video-workspace/legacy/'),
 'local-automation':p=>p.startsWith('automation/')
};
const list=Object.entries(cohorts).map(([kind,predicate])=>({
 kind,items:files.filter(predicate).map(file=>{
   const r=references(file),s=fs.statSync(path.join(root,file)).size;
   return {file,bytes:s,explicit:r.filter(x=>x.confidence==='explicit'),
     weak:r.filter(x=>x.confidence==='name-only').slice(0,5),
     humanReview:knownProtected(file)||r.some(x=>x.deployment==='code'||x.deployment==='npm'||x.deployment==='ci')}
 })}));
const byTop={};
for(const p of files){const top=p.includes('/')?p.split('/')[0]:'(root)';
 const stat=fs.statSync(path.join(root,p));
 (byTop[top]??={files:0,bytes:0}).files++;
 byTop[top].bytes+=stat.size;
}
const results={generated_at:new Date().toISOString(),
 rules:{literal_references_only:true,caution:'No reference does not prove unneeded. Never automatically delete runtime, data, creative masters or legacy compatibility.'},
 counts:{files:files.length,bytes:Object.values(byTop).reduce((sum,v)=>sum+v.bytes,0)},
 byTop,cohorts:list};
fs.mkdirSync(path.join(root,'tmp','repo-archive-audit'),{recursive:true});
fs.writeFileSync(path.join(root,'tmp','repo-archive-audit','inventory.json'),JSON.stringify(results,null,2));
console.log('GUCC REPO INVENTORY '+results.counts.files+' files, '+(results.counts.bytes/1048576).toFixed(1)+' MiB');
for(const group of list){
 console.log('\n-- '+group.kind+' '+group.items.length+' files --');
 for(const item of group.items.slice(0,40))
  console.log((item.bytes/1024).toFixed(1)+'KiB '+item.file+' | explicit='+item.explicit.map(x=>x.from).join(',')+' | weak='+item.weak.map(x=>x.from).join(',')+(item.humanReview?' [MANUAL/PROTECTED]':''));
 if(group.items.length>40)console.log('... remaining '+(group.items.length-40)+' in inventory.json');
}
if(process.argv.includes('--check')){
 const manifestPath=path.join(root,'archive','ARCHIVE_MANIFEST.json');
 if(fs.existsSync(manifestPath)){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  for(const row of manifest.items){
   if(fs.existsSync(path.join(root,row.from)))throw Error('Archived source still active: '+row.from);
   if(!fs.existsSync(path.join(root,row.to)))throw Error('Archive target missing: '+row.to);
   const sha=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.to))).digest('hex');
   if(row.sha256 && sha!==row.sha256)throw Error('Archive content changed: '+row.to);
   const refs=references(row.from).filter(r=>!r.from.startsWith('archive/'));
   if(refs.some(r=>r.confidence==='explicit'&&r.deployment!=='documentation'))throw Error('Active path still references archived file: '+row.from);
  }
  console.log('ARCHIVE MANIFEST VERIFIED '+manifest.items.length+' items');
 }
}
