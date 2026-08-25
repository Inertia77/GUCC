const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const Core = await import(pathToFileURL(path.join(__dirname, '..', 'assets', 'creator-pipeline-core.mjs')).href);
  const Engine = require('../apps/video-workspace/production-system/engine.js');
  const Rules = require('../apps/publishing-console/platform-rules.js');

  const snapshot = {
    projectId: 'project_test_unified',
    __workspaceVersion: 'studio-v5.1-test',
    projectTitle: '洛克茜前瞻机制解析',
    game: '绝区零',
    type: '角色机制攻略',
    coreQuestion: '洛克茜到底给队伍带来了什么？',
    coreConclusion: '先看资源循环，再看站场价值。',
    audience: '想在前瞻后快速理解角色的玩家',
    officialInfo: '官方前瞻资料待导入',
    chapterTable: '1. 核心机制\n2. 队伍影响',
    script: '这里是完整口播。[AV:UI]',
    gameFootage: '角色技能说明页与真实实机',
    visualPlan: '核心资源条特写',
    publishCN: '',
  };

  const project = Core.studioSnapshotToProduction(Engine, snapshot);
  assert.equal(project.projectId, snapshot.projectId, 'Studio -> Production must preserve canonical project_id');
  assert.equal(project.name, snapshot.projectTitle);
  assert.equal(project.currentState, 'RESEARCHING', 'handoff must not auto-cross human locks');
  assert.equal(project.locks.contentLock, false);
  assert.equal(project.files.RESEARCH.status, 'Ready');
  assert.equal(project.files.VOICE_MASTER.status, 'Ready');
  assert.equal(project.integration.drive.rootId, Core.DRIVE_ROOT.id);

  project.releasePack = `## B站\n### 最终标题\n【绝区零】洛克茜前瞻机制解析\n### 最终简介\n看懂资源循环和队伍价值。\n### 普通标签\n绝区零,洛克茜,攻略\n### 置顶评论\n你最关心哪一段？\n\n## 抖音\n### 最终发布文案\n洛克茜机制先看资源循环 #绝区零\n### 置顶评论\n完整机制见正片\n\n## 小红书视频\n### 最终标题\n洛克茜机制速懂\n### 最终正文\n先看资源，再看队伍。\n### 话题\n绝区零,洛克茜\n### 置顶评论\n欢迎补充问题\n\n## 微信视频号\n### 最终完整描述\n洛克茜前瞻机制解析\n### 话题\n绝区零,洛克茜\n### 置顶评论\n欢迎讨论\n\n## YouTube 简体中文\n### 最终标题\nZenless Zone Zero 洛克茜机制解析\n### 最终简介\nResource loop and team value explained.\n### Hashtags\n#绝区零,#洛克茜\n### 后台 Tags\n绝区零,洛克茜,ZZZ\n\n## TikTok 简体中文\n### 最终 Caption\n洛克茜机制解析 #绝区零\n### 置顶评论\n完整分析见视频`;
  project.files.RELEASE_PACK.content = project.releasePack;
  project.files.RELEASE_PACK.status = 'Ready';

  const publishState = Core.productionToPublishState(null, project, Rules);
  assert.equal(publishState.source.creatorProjectId, project.projectId);
  assert.equal(publishState.platforms.bilibili.title, '【绝区零】洛克茜前瞻机制解析');
  assert.equal(publishState.platforms.douyin.caption, '洛克茜机制先看资源循环 #绝区零');
  assert.equal(publishState.platforms.youtube.language, '简体中文');
  assert.equal(publishState.platforms.bilibili.copyright, '原创');

  const releasePrompt = Core.buildReleasePrompt('BASE', project);
  for (const heading of ['## B站', '## 抖音', '## 小红书视频', '## 微信视频号', '## YouTube 简体中文', '## TikTok 简体中文']) {
    assert.ok(releasePrompt.includes(heading), `release prompt must include ${heading}`);
  }

  const local = {
    schemaVersion: Engine.SCHEMA_VERSION,
    projects: [{ ...project, updatedAt: '2026-08-25T00:00:00.000Z' }],
    musicLibrary: [],
    selectedProjectId: project.projectId,
  };
  const remoteProject = { ...project, topic: 'remote-newer', updatedAt: '2026-08-25T01:00:00.000Z' };
  const merged = Core.mergeCloudProjects(local, [{ project_data: remoteProject, updated_at: '2026-08-25T01:00:01.000Z' }], Engine);
  assert.equal(merged.changed, true);
  assert.equal(merged.store.projects[0].topic, 'remote-newer');

  console.log('creator pipeline tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
