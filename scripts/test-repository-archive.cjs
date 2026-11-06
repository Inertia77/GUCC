'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'archive/ARCHIVE_MANIFEST.json'),'utf8'));
assert.equal(manifest.total_files,manifest.items.length);
assert(manifest.items.length>=20);
for(const row of manifest.items){
 assert(!fs.existsSync(path.join(root,row.from)),'Archived source must leave active tree: '+row.from);
 assert(fs.existsSync(path.join(root,row.to)),'Archived bytes missing: '+row.to);
}
const {build}=require('./build-pages.cjs');
const out=path.join(root,'tmp','archive-build-smoke');
fs.rmSync(out,{recursive:true,force:true});
try{
 build(out,'0'.repeat(40));
 const exists=p=>fs.existsSync(path.join(out,p));
 for(const entry of ['index.html','sw.js','apps/command-center/index.html',
   'apps/video-workspace/legacy-prompt-studio-v6.html',
   'apps/video-workspace/production-system/legacy-v1.html',
   'reference/story-library.html','reference/resource-library.html',
   'data/schema.md','data/imports/gacha-leak-sources-2026-08-07.json',
   'assets/icons/gucc-icon.svg']){
  assert(exists(entry),'Required site resource missing: '+entry);
 }
 for(const entry of ['scripts','automation','archive','data/exports from supabase',
   'apps/video-workspace/production-system/fixtures']){
  assert(!exists(entry),'Developer/archive-only path leaked into Pages: '+entry);
 }
 assert(fs.existsSync(path.join(root,'scripts','test-command-center.cjs')),
   'Local developer tools must remain in repository');
 assert(fs.existsSync(path.join(root,'automation','automation-launcher.bat')),
   'Windows launchers must remain in repository');
 console.log('Repository archive & Pages bundle isolation OK: '+manifest.items.length+' originals preserved; runtime and compatibility routes retained.');
}finally{fs.rmSync(out,{recursive:true,force:true})}
