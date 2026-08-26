const assert = require('assert');
const fs = require('fs');
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
  assert.equal(project.projectType, 'STANDARD_VIDEO', 'Studio must no longer guess A/B/C/D');
  assert.equal(project.legacyProjectType, '');
  assert.equal(project.currentState, 'RESEARCHING', 'handoff must not auto-cross human locks');
  assert.equal(project.locks.contentLock, false);
  assert.equal(project.files.RESEARCH.status, 'Ready');
  assert.equal(project.files.VOICE_MASTER.status, 'Ready');
  assert.equal(project.integration.drive.rootId, Core.DRIVE_ROOT.id);

  let generatedIds = 0;
  let generatedWorkspaceIds = 0;
  const idFactory = () => `project_studio_${++generatedIds}`;
  const workspaceIdFactory = () => `workspace_studio_${++generatedWorkspaceIds}`;
  const firstIdentity = Core.resolveStudioWorkspaceIdentity({}, { idFactory, workspaceIdFactory });
  const repeatedIdentity = Core.resolveStudioWorkspaceIdentity(firstIdentity, { idFactory, workspaceIdFactory });
  assert.equal(repeatedIdentity.creatorProjectId, firstIdentity.creatorProjectId, 'same Studio Draft must reuse creatorProjectId');
  assert.equal(repeatedIdentity.workspaceInstanceId, firstIdentity.workspaceInstanceId, 'same Studio Draft must retain workspace identity');

  const copiedIdentity = Core.resolveStudioWorkspaceIdentity(repeatedIdentity, { forceNewProject: true, idFactory, workspaceIdFactory });
  assert.notEqual(copiedIdentity.creatorProjectId, firstIdentity.creatorProjectId, 'explicit copy/save-as-new must create another Project ID');
  assert.equal(copiedIdentity.workspaceInstanceId, firstIdentity.workspaceInstanceId, 'copying a project does not create a different Studio Draft instance');

  const freshWorkspace = Core.resolveStudioWorkspaceIdentity(repeatedIdentity, { forceNewWorkspace: true, idFactory, workspaceIdFactory });
  assert.notEqual(freshWorkspace.workspaceInstanceId, firstIdentity.workspaceInstanceId, 'a genuinely new Studio Workspace must get a new draft identity');
  assert.notEqual(freshWorkspace.creatorProjectId, firstIdentity.creatorProjectId, 'a genuinely new Studio Workspace must automatically get a new Creator Project ID');

  const migratedLegacyIdentity = Core.resolveStudioWorkspaceIdentity({}, {
    legacyProjectId: 'project_legacy_browser_key', idFactory, workspaceIdFactory,
  });
  assert.equal(migratedLegacyIdentity.creatorProjectId, 'project_legacy_browser_key', 'legacy scalar localStorage identity must migrate without breaking an existing project');
  assert.equal(migratedLegacyIdentity.migratedFromLegacy, true);

  // Runtime wiring: exports persist workspace identity; blank/import paths rotate or restore it.
  const identityRuntime = fs.readFileSync(path.join(__dirname, '..', 'assets', 'studio-workspace-identity.mjs'), 'utf8');
  const accessGuard = fs.readFileSync(path.join(__dirname, '..', 'assets', 'access-guard.js'), 'utf8');
  assert.match(identityRuntime, /__creatorWorkspaceInstanceId/);
  assert.match(identityRuntime, /__creatorProjectId/);
  assert.match(identityRuntime, /window\.collect = collectWithIdentity/);
  assert.match(identityRuntime, /window\.fill = fillWithIdentity/);
  assert.match(identityRuntime, /window\.openBlankWorkspace = openBlankWorkspaceWithIdentity/);
  assert.match(identityRuntime, /createNewStudioWorkspaceIdentity\(\)/);
  assert.match(accessGuard, /studio-workspace-identity\.mjs\?v=1/);

  // Phase 1.1 idempotency primitive remains compatible.
  const firstStudioId = Core.resolveStudioProjectId('', false, idFactory);
  const repeatedStudioId = Core.resolveStudioProjectId(firstStudioId, false, idFactory);
  assert.equal(repeatedStudioId, firstStudioId);

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
  assert.equal(merged.store.projects[0].integration.cloud.revision, 0);

  const preferred = Core.mergeCloudProjects({ ...local, projects: [project, { ...project, projectId: 'project_second' }] }, [
    { project_id: project.projectId, project_data: project, revision: 3, updated_at: project.updatedAt },
    { project_id: 'project_second', project_data: { ...project, projectId: 'project_second' }, revision: 4, updated_at: project.updatedAt },
  ], Engine, 'project_second');
  assert.equal(preferred.store.selectedProjectId, 'project_second');

  const dirtyLocal = {
    ...project,
    topic: 'local-unsynced',
    updatedAt: '2026-08-25T02:00:00.000Z',
    integration: { ...(project.integration || {}), cloud: { revision: 7, updatedAt: '2026-08-25T01:00:00.000Z' } },
  };
  const concurrentRemote = { ...project, topic: 'remote-concurrent', updatedAt: '2026-08-25T01:30:00.000Z' };
  const protectedMerge = Core.mergeCloudProjects({ ...local, projects: [dirtyLocal] }, [{
    project_id: project.projectId,
    project_data: concurrentRemote,
    revision: 8,
    updated_at: '2026-08-25T01:30:01.000Z',
  }], Engine);
  assert.equal(protectedMerge.store.projects[0].topic, 'local-unsynced');
  assert.equal(protectedMerge.store.projects[0].integration.cloud.conflict.currentRevision, 8);

  const legacyLocal = {
    ...project,
    topic: 'legacy-local-newer',
    updatedAt: '2026-08-27T02:00:00.000Z',
    integration: { ...(project.integration || {}) },
  };
  delete legacyLocal.integration.cloud;
  const olderCloud = {
    ...project,
    topic: 'cloud-existing',
    updatedAt: '2026-08-26T02:00:00.000Z',
  };
  const bootstrapProtected = Core.mergeCloudProjects({ ...local, projects: [legacyLocal] }, [{
    project_id: project.projectId,
    project_data: olderCloud,
    revision: 5,
    updated_at: '2026-08-26T02:00:01.000Z',
  }], Engine);
  assert.equal(bootstrapProtected.store.projects[0].topic, 'legacy-local-newer');
  assert.equal(bootstrapProtected.store.projects[0].integration.cloud.revision, 0, 'bootstrap conflict must not grant the local copy a writable cloud revision');
  assert.equal(bootstrapProtected.store.projects[0].integration.cloud.conflict.kind, 'bootstrap');
  assert.equal(bootstrapProtected.store.projects[0].integration.cloud.conflict.currentRevision, 5);

  console.log('creator pipeline Phase 1.2 tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});