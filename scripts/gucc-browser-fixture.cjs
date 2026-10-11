'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
require('../apps/video-workspace/production-system/core-rules.js');require('../apps/video-workspace/production-system/capability-library.js');require('../apps/video-workspace/production-system/failure-prevention.js');
const O=require('../apps/video-workspace/production-system/orchestrator.js');
function project(){const p=O.createProject({name:'浏览器隔离回归｜长标题与双视频创作',idea:'仅用于隔离回归，验证共享研究、多视频、长 Prompt 与恢复。',game:'绝区零'});p.projectId='QA-BROWSER';p.name='浏览器隔离回归｜长标题与双视频创作';p.status='FLOW_READY';p.flowRevision=1;p.promptFlow=[
 {promptId:'QA-1',name:'第一条视频的文案',branch:'ONE',capabilityUsed:'SCRIPT_DRAFT',executor:'Chat',reviewMode:'REVIEW_OPTIONAL',qcLevel:'Q2',status:'PENDING',dependencies:[]},
 {promptId:'QA-2',name:'第二条视频的文案',branch:'TWO',capabilityUsed:'SCRIPT_DRAFT',executor:'Chat',reviewMode:'REVIEW_OPTIONAL',qcLevel:'Q2',status:'PENDING',dependencies:[]},
 {promptId:'QA-3',name:'第一条视频的人工批准',branch:'ONE',capabilityUsed:'SCRIPT_LOCK_GATE',executor:'Human',reviewMode:'APPROVAL_REQUIRED',qcLevel:'Q2',status:'PENDING',dependencies:['QA-1']}].map(n=>({...n,isCompiledExternal:true,prompt:'【隔离浏览器检查】保持成熟方法，实际文件与人工批准分开验证。\n'.repeat(90),saveAs:['SCRIPT.md']}));p.rawVideoContract={VIDEO_TRACKS:[{VIDEO_ID:'QA-VIDEO-ONE',FOLDER:'ONE',CHARACTER:'独立视频一'},{VIDEO_ID:'QA-VIDEO-TWO',FOLDER:'TWO',CHARACTER:'独立视频二'}]};return p;}
async function routes(context,{repo=root,project:p=project(),auth=false,cloud={}}={}){
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url()),js=body=>route.fulfill({contentType:'text/javascript',body});
  if(u.origin==='https://fixture.test'){
   if(cloud.route)return cloud.route(route,u);
   if(u.pathname.endsWith('creator_os_portal_dashboard'))return route.fulfill({json:[{projectId:p.projectId,name:p.name,game:p.game,status:p.status,lifecycle:'active',totalNodes:p.promptFlow.length,doneNodes:p.promptFlow.filter(n=>n.status==='DONE').length,nextNode:p.promptFlow.find(n=>n.status==='PENDING')}]});
   return route.fulfill({json:[]});
  }
  if(u.origin!=='https://gucc.test')return route.abort();
  if(u.pathname==='/assets/access-guard.js')return js(`window.GuccAccess={hasAccess:()=>true,redirectTarget:()=>'',clearAccess:()=>{}};const s=document.createElement('script');s.src='/assets/gucc-shell.js';s.dataset.root='/';document.head.append(s);`);
  if(u.pathname==='/apps/command-center/src/config.js')return js(`export const CONFIG={SUPABASE_URL:'https://fixture.test',SUPABASE_ANON_KEY:'isolated',EDGE_FUNCTION_NAME:'gameup-api'};`);
  if(u.pathname==='/apps/command-center/src/auth.js')return js(`export const getSession=()=>${auth?"({user:{id:'isolated-owner'},access_token:'isolated'})":"null"};export const getAccessToken=async()=>'';export const restoreSession=async()=>null;export const clearSession=()=>{};export const isLoggedIn=()=>${auth};export const signIn=async()=>null;export const signOut=()=>{};export const signUp=()=>{throw Error('Disabled')};`);
  const target=path.resolve(repo,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
  if(!target.startsWith(repo+path.sep))return route.abort();
  try{return route.fulfill({body:await fs.readFile(target),contentType:({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.png':'image/png'})[path.extname(target)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:'Missing fixture'});}
 });
}
module.exports={project,routes};
