const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const Core = await import(pathToFileURL(path.join(__dirname, '..', 'assets', 'creator-dashboard-core.mjs')).href);
  const now = new Date('2026-08-26T12:00:00.000Z');
  const baseProject = {
    projectId: 'project_dashboard_test',
    name: '清宵完整攻略',
    game: '鸣潮',
    topic: '完整攻略',
    projectType: 'A_FULL_GUIDE',
    currentState: 'PLANNING',
    targetPublishDate: '2026-08-28',
    updatedAt: '2026-08-26T10:00:00.000Z',
    locks: { contentLock: false, scriptLock: false, audioLock: false, pictureLock: false },
    files: { RESEARCH: { status: 'Missing' } },
  };
  const row = {
    project_id: baseProject.projectId,
    project_data: baseProject,
    current_state: baseProject.currentState,
    revision: 7,
    updated_at: '2026-08-26T10:00:00.000Z',
  };

  const project = Core.analyzeCreatorProject(row, [], [], { now });
  assert.equal(project.progress, 5);
  assert.equal(project.health.code, 'missing');
  assert.equal(project.missingFiles[0].label, 'RESEARCH.md');
  assert.equal(project.nextAction, '制定研究计划');
  assert.equal(project.revision, 7);

  const invalidLocks = structuredClone(baseProject);
  invalidLocks.currentState = 'AUDIO_LOCKED';
  const blocked = Core.analyzeCreatorProject({ ...row, current_state: 'AUDIO_LOCKED', project_data: invalidLocks }, [], [], { now });
  assert.equal(blocked.health.code, 'blocked');
  assert(blocked.health.reasons.some((reason) => reason.includes('Audio Lock')));

  const published = structuredClone(baseProject);
  published.currentState = 'PUBLISHED';
  published.locks = { contentLock: true, scriptLock: true, audioLock: true, pictureLock: true };
  published.files.RELEASE_PACK = { status: 'Ready' };
  const release = {
    project_id: published.projectId,
    platform: 'bilibili',
    status: '已发布',
    post_url: 'https://example.com/video',
    post_id: 'BV1test',
    published_at: '2026-08-18T12:00:00.000Z',
    snapshot: { metrics: [{ window: 'T+1 天' }, { window: 'T+3 天' }] },
  };
  const dashboard = Core.buildCreatorDashboard({ projects: [{ ...row, current_state: 'PUBLISHED', project_data: published }], files: [], releases: [release] }, { now });
  assert.deepEqual(dashboard.projects[0].analyticsDue, [7]);
  assert.equal(dashboard.actions[0].route, 'publish');
  assert.match(dashboard.actions[0].title, /T\+7/);

  const remote = { ...baseProject, topic: '云端改题', updatedAt: '2026-08-26T11:00:00.000Z' };
  const local = { ...baseProject, notes: '本机新增备注', updatedAt: '2026-08-26T11:30:00.000Z' };
  const merged = Core.mergeProjectVersions(baseProject, local, remote);
  assert.equal(merged.conflicts.length, 0);
  assert.equal(merged.merged.topic, '云端改题');
  assert.equal(merged.merged.notes, '本机新增备注');

  const bothLocal = { ...baseProject, topic: '本机改题' };
  const conflict = Core.mergeProjectVersions(baseProject, bothLocal, remote);
  assert.deepEqual(conflict.conflicts.map((item) => item.key), ['topic']);

  const attached = Core.attachCloudMetadata(baseProject, { revision: 9, updated_at: '2026-08-26T12:00:00Z', last_device_id: 'phone' });
  assert.equal(attached.integration.cloud.revision, 9);
  assert.equal(Core.stripCloudMetadata(attached).integration?.cloud, undefined);

  console.log('Creator Dashboard and conflict checks passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
