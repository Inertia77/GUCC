import { CONFIG } from '../command-center/src/config.js';
import { getAccessToken, getSession } from '../command-center/src/auth.js';
import { buildCreatorDashboard } from '../../assets/creator-dashboard-core.mjs';

const Map = window.GuccCreatorWorkflow;
const Tasks = window.GuccCreatorAiTask;
const Engine = window.GuccProductionEngine;
const Global = window.GuccCreatorGlobal;
const api = `${CONFIG.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/creator-project-api`;
const $ = (selector) => document.querySelector(selector);
const h = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projectUrl = (id, command) => `./production-system/?project=${encodeURIComponent(id)}${command ? `&tab=prompt&command=${encodeURIComponent(command)}` : ''}`;
let current = null;
let projects = [];
let selectedStage = 0;
function localStore() { try { return JSON.parse(localStorage.getItem('gucc_ai_video_production_v1') || 'null') || {}; } catch { return {}; } }
function localRows() {
  return (localStore().projects || []).map((p) => {
    const action = Engine.nextAction(p);
    return { projectId:p.projectId, name:p.name, game:p.game, currentState:p.currentState, targetPublishDate:p.targetPublishDate,
      locks:p.locks || {}, nextAction:action.title, missing: [...action.missingInputs,...action.missingOutputs].slice(0,2).map((key) => Engine.FILE_DEFINITIONS[key]?.filename || key), globalStage:'', cloud:false };
  });
}
function globalAction(data, row) {
  if (!Global?.nextGlobalAction) return null;
  const snapshot = { project:row };
  for (const key of ['languageTracks','scopedArtifacts','visualMasters','variants','publishPackages','publications','metricSnapshots','performanceReports','learnings']) snapshot[key] = (data[key] || []).filter((item) => item.project_id === row.project_id);
  return Global.nextGlobalAction(snapshot);
}
async function loadProjects() {
  const local = localRows();
  projects = local;
  renderProjects();
  if (!getSession()?.access_token && !getSession()?.refresh_token) return;
  try {
    const token = await getAccessToken();
    const response = await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},body:JSON.stringify({action:'dashboard'})});
    if (!response.ok) throw new Error(`Creator API ${response.status}`);
    const data = await response.json();
    const dashboard = buildCreatorDashboard(data,{localProjects:localStore().projects || [],now:new Date()});
    const byLocal = new Map(local.map((p) => [p.projectId,p]));
    projects = dashboard.activeProjects.map((p) => {
      const source = (data.projects || []).find((row) => row.project_id === p.projectId);
      const global = source && globalAction(data, source);
      return { ...byLocal.get(p.projectId), projectId:p.projectId, name:p.name, game:p.game, currentState:p.currentState,
        targetPublishDate:p.targetPublishDate, locks:p.locks, nextAction:global?.title || p.nextAction,
        globalStage:global?.stage || '', missing:(global?.blockers || p.nextRequirements?.map((x) => x.label) || []).slice(0,2), cloud:true };
    });
    for (const p of local) if (!projects.some((item) => item.projectId === p.projectId)) projects.push(p);
    renderProjects();
  } catch (error) {
    $('#projectLanes').insertAdjacentHTML('beforeend',`<p class="cr-muted">云端队列暂时不可用；上面显示本机已有项目。${h(error.message)}</p>`);
  }
}
function renderProjects() {
  const saved = localStore().selectedProjectId;
  const requested = new URLSearchParams(location.search).get('project');
  current = projects.find((p) => p.projectId === requested) || projects.find((p) => p.projectId === saved) || projects[0] || null;
  $('#continueProject').href = current ? projectUrl(current.projectId) : './production-system/';
  $('#heroProject').textContent = current?.name || '尚未选择制作项目';
  const macro = Map.stageFor(current?.currentState, current?.globalStage);
  $('#heroStage').textContent = current ? `${String(macro.index+1).padStart(2,'0')} / ${macro.title}` : 'STAGE / —';
  $('#heroNext').textContent = current?.nextAction || '在 Production 建立第一条视频';
  $('#heroMissing').textContent = current?.missing?.length ? `缺口：${current.missing.join(' · ')}` : '当前没有已知必需文件缺口';
  $('#projectLanes').innerHTML = projects.length ? projects.map((p,i) => {
    const stage = Map.stageFor(p.currentState,p.globalStage);
    const locks = [['contentLock','C'],['scriptLock','S'],['audioLock','A'],['pictureLock','P']].map(([k,c]) => p.locks?.[k] ? c : '·').join(' ');
    return `<a class="lane" href="${projectUrl(p.projectId)}"><span class="lane-index">${String(i+1).padStart(2,'0')}</span><span class="lane-title"><b>${h(p.name)}</b><small>${h(p.game || '未设置游戏')} · 目标 ${h(p.targetPublishDate || '未设置')}</small></span><span class="lane-stage">${String(stage.index+1).padStart(2,'0')} / ${h(stage.title)}<span class="lane-locks" aria-label="Content Script Audio Picture 锁状态">LOCK ${locks}</span></span><span class="lane-next"><b>${h(p.nextAction)}</b><small>${p.missing?.length ? `缺口 · ${h(p.missing.join(' · '))}` : '无已知文件缺口'}</small></span><span class="lane-go">继续 →</span></a>`;
  }).join('') : '<div class="lane-empty">暂无 Production 项目。<a href="./production-system/?new=1">建立第一条视频 →</a></div>';
  if (current) selectedStage = macro.index;
  renderStages(); renderTasks();
}
function renderStages() {
  const currentIndex = current ? Map.stageFor(current.currentState,current.globalStage).index : -1;
  $('#stageTrack').innerHTML = Map.stages.map((s,i) => `<button type="button" class="stage-node ${i === currentIndex ? 'current' : i < currentIndex ? 'past' : ''}" data-stage="${i}" aria-pressed="${i===selectedStage}"><span class="stage-no">${String(i+1).padStart(2,'0')}</span><b>${h(s.title)}</b><small>${h(s.code)}</small></button>`).join('');
  const s = Map.stages[selectedStage];
  $('#stageDetail').innerHTML = `<div class="detail-code">${String(selectedStage+1).padStart(2,'0')}<small>${h(s.code)} / VIDEO LIFECYCLE</small></div><div><h3>${h(s.title)}</h3><div class="detail-grid"><div><b>WHY / 为什么</b>${h(s.purpose)}</div><div><b>INPUT / 输入</b>${h(s.input)}</div><div><b>WORK / 做什么</b>${h(s.work)}</div><div><b>OUTPUT / 产出</b>${h(s.output)}</div><div><b>OWNER / 谁负责</b>${h(s.owner)}</div><div><b>HUMAN GATE / 何时 Lock</b><span class="detail-gate">${h(s.gate)}</span></div><div><b>NEXT / 下一步</b>${h(s.next)}</div></div><div class="detail-actions">${s.tasks.map((key) => {const task=Tasks.TASKS[key];return `<a class="cr-button secondary" href="#commands" data-task-jump="${h(key)}">${h(task.aliases[0])} →</a>`;}).join('')}<a class="cr-button" href="${current ? projectUrl(current.projectId) : './production-system/'}">进入 Production →</a></div></div>`;
}
const help = {OFFICIAL_VIDEO_EVIDENCE:['解析官方视频 / 实机音画证据','官方视频链接 / 原视频','视频证据表'],SCRIPT_REVIEW:['检查事实、机制和稿件结构','当前完整稿','局部审核建议'],NATURALNESS_REVIEW:['降低口播 AI 味','当前完整稿','局部替换建议'],SRT_ALIGNMENT:['根据最终真实录音生成时间线','Audio Lock','SRT / Timeline Bundle'],PIXEL_PACKAGE:['制作机制解释动画','Timeline Lock','Pixel Mechanic Package'],EDIT_BLUEPRINT:['将画面需求绑定真实时间线','Timeline Lock','Editing Blueprint'],PUBLISH_PACKAGE:['生成平台发布字段和交接包','Picture Lock','Release Package']};
function renderTasks() {
  $('#taskGrid').innerHTML = Object.entries(Tasks.TASKS).map(([key,task]) => {const info=help[key] || [task.title,'当前项目','任务交付'];const command=task.aliases[0];return `<article class="task-card" id="task-${key}"><span class="cr-mono">${h(task.label)}</span><h3>${h(command)}</h3><p>${h(info[0])}</p><p>需要：${h(info[1])}<br>输出：${h(info[2])}</p><a class="cr-button secondary" href="${current ? projectUrl(current.projectId,command) : '#commands'}" ${current ? '' : `data-generic="${h(command)}"`}>${current ? '打开当前项目 Prompt →' : '复制通用模板'}</a></article>`;}).join('');
}
$('#stageTrack').addEventListener('click',(event) => {const button=event.target.closest('[data-stage]');if (!button)return;selectedStage=Number(button.dataset.stage);renderStages();});
$('#stageDetail').addEventListener('click',(event)=>{const link=event.target.closest('[data-task-jump]');if(!link)return;event.preventDefault();document.getElementById(`task-${link.dataset.taskJump}`)?.scrollIntoView({behavior:'smooth',block:'center'});});
$('#taskGrid').addEventListener('click',async(event)=>{const link=event.target.closest('[data-generic]');if(!link)return;event.preventDefault();try{const response=await fetch('../../docs/ai-video-production/CREATOR_CONSTITUTION.md');if(!response.ok)throw new Error('Creator Constitution 未载入');const result=Tasks.buildAiTaskPrompt({command:link.dataset.generic,constitutionText:await response.text()});await navigator.clipboard.writeText(result.prompt);$('#commandStatus').textContent='通用模板已复制；需要选择项目并补齐 Video Contract 才能执行。';link.textContent='已复制 · 需项目上下文';}catch(error){$('#commandStatus').textContent=`复制失败：${error.message}`;}});
window.addEventListener('storage',(e)=>{if(['gucc_ai_video_production_v1','gameup_session_v5'].includes(e.key))loadProjects();});
renderStages();renderTasks();loadProjects();
