'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function stamp(text,sha){
 // Stamp local code references, including static imports and worker shell URLs.
 return text.replace(/(["'`])((?:\.\.?\/|\/|assets\/|apps\/)[^"'`\s<>]*?\.(?:m?js|css)(?:\?[^"'`\s<>]*)?)\1/g,(all,quote,url)=>{
  if(url.includes('${'))return all;
  const [base,query='']=url.split('?');const params=new URLSearchParams(query);params.set('release',sha);
  return quote+base+'?'+params+quote;
 });
}
function build(out,sha){
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Full commit SHA required');
 fs.mkdirSync(out,{recursive:true});
 // Site files only. Never include developer fixtures, migrations, caches or local credentials.
 for(const name of ['apps','assets','reference','data','docs','scripts','automation','index.html','offline.html','manifest.webmanifest','.nojekyll','sw.js']){
  fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
 }
 const walk=dir=>{
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,e.name);if(e.isDirectory()){walk(file);continue;}
   if(!/\.(html|m?js|css)$/.test(e.name))continue;
   let text=stamp(fs.readFileSync(file,'utf8'),sha);
   if(e.name==='sw.js')text=text.replace(/gucc-static-v\d+/,`gucc-static-${sha}`).replace(/gucc-runtime-v\d+/,`gucc-runtime-${sha}`);
   fs.writeFileSync(file,text);
  }
 };walk(out);
 fs.writeFileSync(path.join(out,'release.json'),JSON.stringify({sha}));
}
module.exports={stamp,build};
if(require.main===module)build(path.resolve(process.argv[2]||'_site'),process.env.GITHUB_SHA||cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim());
