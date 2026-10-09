// Read-only GUCC Portal presentation logic. The single source is the Creator OS
// server-side joined canonical project + snapshot read model. No legacy task synthesis.
const LIFE = Object.freeze(["active","completed","archived","trash","legacy"]);
export const LABELS = Object.freeze({active:"进行中",completed:"已完成",archived:"已归档",trash:"回收站",legacy:"待接入"});
export function normalizeProjects(payload) {
  if(!Array.isArray(payload)) throw Error("云端项目数据格式不正确");
  const seen=new Set();
  return payload.filter(row=>{
    if(!row||typeof row.projectId!=="string"||!row.projectId.trim()||seen.has(row.projectId))return false;
    seen.add(row.projectId);return true;
  }).map(row=>{
    const life=LIFE.includes(row.lifecycle)?row.lifecycle:"legacy";
    const total=Math.max(0,Number(row.totalNodes)||0);
    const done=Math.min(total,Math.max(0,Number(row.doneNodes)||0));
    return {
      ...row,
      lifecycle:life,
      name:String(row.name||"未命名项目"),
      game:String(row.game||"未设置游戏"),
      version:String(row.version||""),
      status:String(row.status||"LEGACY"),
      doneNodes:done,totalNodes:total,
      nextNode:row.nextNode&&typeof row.nextNode==="object"?row.nextNode:null
    };
  });
}
export function countsFor(projects){
  const counts={active:0,completed:0,archived:0,trash:0,legacy:0};
  for(const project of projects)counts[project.lifecycle]=(counts[project.lifecycle]||0)+1;
  return counts;
}
export function nextTask(project){
  if(project.lifecycle!=="active")return null;
  const status=project.status;
  if(status==="DRAFT"||status==="IMPORTED_LEGACY")return {
    title:"建立项目事实与制作方向",reason:"确认选题价值，生成 PROJECT_BRIEF 和 VIDEO_CONTRACT",
    label:"待立项",owner:"Chat / Work"
  };
  if(status==="BRIEF_REVIEW")return {
    title:"确认项目方向",reason:"审核立项核心结论与证据边界",
    label:"需要人工确认",owner:"你"
  };
  if(status==="BRIEF_READY")return {
    title:"编排项目专属制作路线",reason:"导入 AI 生成的 GUCC_FLOW_RESULT",
    label:"流程编排",owner:"Chat / Work"
  };
  if(project.nextNode?.name)return {
    title:String(project.nextNode.name),
    reason:project.nextNode.status==="WAITING"?"任务等待核验或批准":"按当前项目 Prompt Flow 执行下一节点",
    label:project.nextNode.status==="WAITING"?"待审核":"下一节点",
    owner:String(project.nextNode.executor||"按节点指定")
  };
  if(project.totalNodes>0&&project.doneNodes===project.totalNodes)return {
    title:"审核项目完成情况",reason:"所有已编排任务已结束；确认后可在项目档案标记已完成",
    label:"收尾确认",owner:"你"
  };
  return {
    title:"查看当前制作任务",reason:"前往创作中枢核对真实节点与输入",
    label:"待继续",owner:"创作中枢"
  };
}
export function activeTasks(projects){
  return projects.filter(p=>p.lifecycle==="active").map(project=>({project,task:nextTask(project)})).filter(x=>x.task);
}
