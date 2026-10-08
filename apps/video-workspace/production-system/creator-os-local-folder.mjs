// Local-only directory structure scanner. Never reads file bytes and never calls the cloud.
const $=id=>document.getElementById(id), KEY="gucc_creator_os_local_folders_v1", DB="gucc_creator_os_handles_v1";
let currentHandle=null,handleId="";
function id(){return window.GuccCreatorOS?.selectedId()||"";}
function all(){try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch{return {};}}
function info(){return all()[id()]||{};}
function show(){
  const d=info();
  if($("folderSelectionStatus"))$("folderSelectionStatus").textContent=d.name?"📁 "+d.name+" · "+(d.count||0)+" 项 · "+(d.scannedAt||"尚未扫描"):"尚未授权本地工作目录";
  if($("folderTreePreview"))$("folderTreePreview").textContent=d.tree||"选择工作目录后显示 tree /f 风格的目录快照。";
  if($("folderRootPath"))$("folderRootPath").value=d.rootPath||"";
}
function save(d){const a=all();a[id()]={...info(),...d};localStorage.setItem(KEY,JSON.stringify(a));show();}
async function db(){
  return await new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore("folders");
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function dbSet(key,value){
  const d=await db();
  await new Promise((resolve,reject)=>{
    const t=d.transaction("folders","readwrite");t.objectStore("folders").put(value,key);
    t.oncomplete=resolve;t.onerror=()=>reject(t.error);
  });d.close();
}
async function dbGet(key){
  const d=await db();
  const value=await new Promise((resolve,reject)=>{
    const r=d.transaction("folders","readonly").objectStore("folders").get(key);
    r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
  });d.close();return value;
}
const SKIP=new Set([".git","node_modules",".next","__pycache__","venv",".venv"]);
const LIMIT=7500, DEPTH=14;
async function walk(handle,depth,prefix,stats){
  if(depth>DEPTH){stats.skipped++;return ["[目录层级超过扫描上限]"];}
  const entries=[];
  for await(const [name,entry] of handle.entries()){
    if(SKIP.has(name)){stats.skipped++;continue;}
    if(entries.length+stats.count>=LIMIT){stats.skipped++;break;}
    entries.push([name,entry]);
  }
  entries.sort((a,b)=>a[1].kind===b[1].kind?a[0].localeCompare(b[0],"zh"):a[1].kind==="directory"?-1:1);
  const lines=[];
  for(let i=0;i<entries.length;i++){
    if(stats.count>=LIMIT){stats.skipped++;break;}
    const [name,entry]=entries[i],last=i===entries.length-1;
    stats.count++;
    lines.push(prefix+(last?"└─":"├─")+name+(entry.kind==="directory"?"/":""));
    if(entry.kind==="directory"){
      try{lines.push(...await walk(entry,depth+1,prefix+(last?"   ":"│  "),stats));}
      catch{lines.push(prefix+"[无法读取目录]");}
    }
  }
  return lines;
}
async function scan(handle){
  $("folderSelectionStatus").textContent="正在扫描文件夹名称和结构…";
  const stats={count:0,skipped:0};
  const lines=await walk(handle,0,"",stats);
  save({name:handle.name,tree:handle.name+"/\n"+lines.join("\n")+(stats.skipped?"\n[已跳过 "+stats.skipped+" 个项目或受限目录]":""),count:stats.count,scannedAt:new Date().toLocaleString("zh-CN")});
}
async function choose(){
  if(!id())return;
  if(!("showDirectoryPicker" in window)){$("folderInputFallback").click();return;}
  try{
    const handle=await window.showDirectoryPicker({mode:"read"});
    currentHandle=handle;handleId=id();
    try{await dbSet(id(),handle);}catch{}
    await scan(handle);
  }catch(err){if(err?.name!=="AbortError")$("folderSelectionStatus").textContent="选择失败："+err.message;}
}
async function rescan(){
  let handle=handleId===id()?currentHandle:null;
  if(!handle){try{handle=await dbGet(id());}catch{}}
  if(!handle){$("folderSelectionStatus").textContent="请重新授权当前项目文件夹";return;}
  try{
    const permitted=await handle.queryPermission({mode:"read"});
    if(permitted!=="granted"&&(await handle.requestPermission({mode:"read"}))!=="granted")return;
    currentHandle=handle;handleId=id();await scan(handle);
  }catch(err){$("folderSelectionStatus").textContent="重扫失败："+err.message;}
}
function fallback(files){
  const paths=[...files].slice(0,LIMIT).map(f=>f.webkitRelativePath||f.name).filter(Boolean);
  if(!paths.length)return;
  const root=paths[0].split("/")[0],tree={};
  for(const path of paths){
    let curr=tree;
    const parts=path.split("/").slice(1);
    for(const part of parts){curr[part]??={};curr=curr[part];}
  }
  const lines=[];
  function visit(obj,pre,depth){
    if(depth>DEPTH)return;
    const arr=Object.entries(obj).sort((a,b)=>{
      const ad=Object.keys(a[1]).length>0,bd=Object.keys(b[1]).length>0;
      return ad===bd?a[0].localeCompare(b[0],"zh"):ad?-1:1;
    });
    arr.forEach(([name,child],i)=>{
      const last=i===arr.length-1,dir=Object.keys(child).length>0;
      lines.push(pre+(last?"└─":"├─")+name+(dir?"/":""));
      if(dir)visit(child,pre+(last?"   ":"│  "),depth+1);
    });
  }
  visit(tree,"",0);
  save({name:root,tree:root+"/\n"+lines.join("\n"),count:paths.length,scannedAt:new Date().toLocaleString("zh-CN")});
}
async function copyPrompt(){
  const project=window.GuccCreatorOS?.current(),d=info();
  if(!project||!d.tree){$("folderSelectionStatus").textContent="请先选择项目文件夹";return;}
  const root=d.rootPath?.trim()||"【请填入此项目文件夹在 Windows 上的绝对路径】";
  const prompt=[
    "【GameUp Creator OS｜本地视频项目整理】",
    "项目："+project.name,"项目 ID："+project.projectId,
    "目录："+d.name,"本地执行根路径："+root,
    "以下是真实扫描的文件名称及层级，不含文件内容；不得假装看过音视频：",
    "----- TREE START -----",d.tree,"----- TREE END -----",
    "目标：评估目录结构，尽量保留已有合理结构，必要时按素材来源、录音、字幕、机制动画、BGM、SFX、Covers、剪辑蓝图、最终导出等类别整理。",
    "先给短小的变更方案，再给可直接复制的 Windows PowerShell 命令；第一轮只预览移动计划（-WhatIf），明确确认后才能真正执行。",
    "禁止自动删除、覆盖、重命名被引用的源文件、修改 LOCK 文件、触碰原素材内容，禁止把任何本地素材上传云端或 GitHub。",
    "路径有歧义或剪辑项目可能引用时保留原位，提供安全方案。输出必要的 ASSET_INDEX.md 建议和简短 NEXT_HANDOFF。"
  ].join("\n");
  try{await navigator.clipboard.writeText(prompt);$("folderSelectionStatus").textContent="整理 Prompt 已复制，可粘贴给 AI";}catch{$("folderSelectionStatus").textContent="复制失败，请检查剪贴板权限";}
}
$("chooseProjectFolder")?.addEventListener("click",()=>{void choose();});
$("rescanProjectFolder")?.addEventListener("click",()=>{void rescan();});
$("copyFolderOrganizePrompt")?.addEventListener("click",()=>{void copyPrompt();});
$("folderRootPath")?.addEventListener("change",e=>save({rootPath:e.target.value}));
$("folderInputFallback")?.addEventListener("change",e=>{if(e.target.files?.length)fallback(e.target.files);e.target.value="";});
window.addEventListener("gucc:creator-os:rendered",show);
show();
