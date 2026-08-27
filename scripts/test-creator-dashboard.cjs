const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const Core = await import(pathToFileURL(path.join(__dirname, '..', 'assets', 'creator-dashboard-core.mjs')).href);
  const now = new Date('2026-08-26T12:00:00.000Z');
  const baseProject = {
    projectId: 'project_dashboard_test', name: '清宵完整攻略', game: '鸣潮', topic: '完整攻略', projectType: 'A_FULL_GUIDE',
    currentState: 'PLANNING', targetPublishDate: '2026-08-28', updatedAt: '2026-08-26T10:00:00.000Z',
    locks: { contentLock: false, scriptLock: false, musicLock: false, audioLock: false, pictureLock: false },
    files: { RESEARCH: { status: 'Missing' } },
  };
  const row = { project_id: baseProject.projectId, project_type: baseProject.projectType, project_data: baseProject, current_state: baseProject.currentState, revision: 7, updated_at: '2026-08-26T10:00:00.000Z' };

  const project = Core.analyzeCreatorProject(row, [], [], { now });
  assert.equal(project.progress, 5);
  assert.equal(project.health.code, 'normal', 'a next-step output must not make Project Health yellow');
  assert.equal(project.missingFiles.length, 0);
  assert.equal(project.nextRequirements[0].label, 'RESEARCH.md');
  assert.equal(project.nextAction, '制定研究计划');
  assert.equal(project.revision, 7);
  assert.equal(project.projectType, undefined, 'Dashboard user model must not expose A/B/C/D labels');

  for (const type of ['A_FULL_GUIDE', 'B_SUNO_VIDEO', 'C_GAME_SYSTEM', 'D_MUSIC_RELEASE']) {
    const legacy = { ...baseProject, projectId: `legacy_${type}`, projectType: type, currentState: 'PLANNING' };
    const analyzed = Core.analyzeCreatorProject({ ...row, project_id: legacy.projectId, project_type: type, project_data: legacy }, [], [], { now });
    assert.equal(analyzed.progress, 5, `${type} must use the same unified progress calculation`);
    assert.equal(analyzed.nextAction, '制定研究计划', `${type} must not branch Action Queue logic`);
  }

  const musicDraft = { ...baseProject, projectType: 'B_SUNO_VIDEO', currentState: 'MUSIC_DRAFT' };
  assert.equal(Core.analyzeCreatorProject({ ...row, current_state: 'MUSIC_DRAFT', project_data: musicDraft }, [], [], { now }).currentState, 'AUDIO_PRODUCTION');

  const musicLocked = { ...baseProject, projectType: 'D_MUSIC_RELEASE', currentState: 'MUSIC_LOCKED', locks: { ...baseProject.locks, musicLock: true, audioLock: false }, files: { MUSIC_MASTER: { status: 'Ready' } } };
  assert.equal(Core.analyzeCreatorProject({ ...row, current_state: 'MUSIC_LOCKED', project_data: musicLocked }, [], [], { now }).currentState, 'AUDIO_PRODUCTION', 'legacy Music Lock may not bypass Audio Lock in Dashboard');

  const actuallyAudioLocked = { ...musicLocked, locks: { ...musicLocked.locks, audioLock: true }, files: { ...musicLocked.files, AUDIO_MASTER: { status: 'Ready' }, RESEARCH: { status: 'Ready' }, CONTENT_LOCK: { status: 'Ready' }, VOICE_MASTER: { status: 'Ready' } } };
  assert.equal(Core.analyzeCreatorProject({ ...row, current_state: 'MUSIC_LOCKED', project_data: actuallyAudioLocked }, [], [], { now }).currentState, 'AUDIO_LOCKED');

  const invalidLocks = structuredClone(baseProject); invalidLocks.currentState = 'AUDIO_LOCKED';
  const blocked = Core.analyzeCreatorProject({ ...row, current_state: 'AUDIO_LOCKED', project_data: invalidLocks }, [], [], { now });
  assert.equal(blocked.health.code, 'blocked'); assert(blocked.health.reasons.some((reason) => reason.includes('Audio Lock')));

  const crossedStage = structuredClone(baseProject); crossedStage.currentState = 'SCRIPT_LOCKED'; crossedStage.locks.contentLock = true; crossedStage.locks.scriptLock = true;
  crossedStage.files = { RESEARCH: { status: 'Ready' }, CONTENT_LOCK: { status: 'Ready' }, VOICE_MASTER: { status: 'Missing' } };
  const attention = Core.analyzeCreatorProject({ ...row, current_state: crossedStage.currentState, project_data: crossedStage }, [], [], { now });
  assert.equal(attention.health.code, 'attention'); assert(attention.health.reasons.some((reason) => reason.includes('VOICE_MASTER.md')));

  const published = structuredClone(baseProject);
  published.currentState = 'PUBLISHED';
  published.locks = { contentLock: true, scriptLock: true, audioLock: true, pictureLock: true };
  published.files = {
    RESEARCH: { status: 'Ready' }, CONTENT_LOCK: { status: 'Ready' }, VOICE_MASTER: { status: 'Ready' }, AUDIO_MASTER: { status: 'Ready' },
    SUBTITLE_MASTER: { status: 'Ready' }, TRANSCRIPT_ALIGNED: { status: 'Ready' }, EDIT_BLUEPRINT: { status: 'Ready' }, ASSET_INDEX: { status: 'Ready' },
    VISUAL_STYLE: { status: 'Ready' }, EXPORT_SPEC: { status: 'Ready' }, VIDEO_V0_REVIEW: { status: 'Ready' }, BUILD_REPORT: { status: 'Ready' },
    VIDEO_V1: { status: 'Ready' }, QC_REPORT: { status: 'Ready' }, RELEASE_PACK: { status: 'Ready' },
  };
  const recentRelease = { project_id: published.projectId, platform: 'bilibili', status: '已发布', post_url: 'https://example.com/video', post_id: 'BV1test', published_at: '2026-08-26T10:00:00.000Z', updated_at: '2026-08-26T10:00:00.000Z', snapshot: { metrics: [] } };

  const archiveCases = [
    [undefined, /生成 Project Archive/],
    [{ status: 'pending', provider: 'google_drive' }, /生成 Project Archive|等待 Project Archive/],
    [{ status: 'generating', provider: 'google_drive' }, /等待 Project Archive/],
    [{ status: 'generated', provider: 'google_drive', archiveVersion: 1 }, /发布 Project Archive/],
    [{ status: 'failed', provider: 'google_drive', lastError: 'Drive unavailable' }, /重试 Project Archive/],
  ];
  for (const [archive, expected] of archiveCases) {
    const candidate = structuredClone(published);
    if (archive) candidate.integration = { archive };
    const dash = Core.buildCreatorDashboard({ projects: [{ ...row, current_state: 'PUBLISHED', project_data: candidate }], files: [], releases: [recentRelease] }, { now });
    assert.equal(dash.actions[0].route, 'production');
    assert.match(dash.actions[0].title, expected);
    assert.equal(dash.actions[0].kind, 'archive');
  }

  const olderRelease = { ...recentRelease, published_at: '2026-08-18T12:00:00.000Z', updated_at: '2026-08-18T12:00:00.000Z', snapshot: { metrics: [{ window: 'T+1 天' }, { window: 'T+3 天' }] } };
  const dashboard = Core.buildCreatorDashboard({ projects: [{ ...row, current_state: 'PUBLISHED', project_data: published }], files: [], releases: [olderRelease] }, { now });
  assert.deepEqual(dashboard.projects[0].analyticsDue, [7]);
  assert.equal(dashboard.actions[0].route, 'publish');
  assert.match(dashboard.actions[0].title, /T\+7/);

  const archived = structuredClone(published);
  archived.currentState = 'ARCHIVED';
  archived.integration = { archive: { status: 'published', provider: 'google_drive', folderId: 'folder', mainFileId: 'file', verifiedAt: '2026-08-26T11:00:00.000Z', mainFileUrl: 'https://drive.google.com/file/d/file/view' } };
  const archivedNoUpdate = Core.buildCreatorDashboard({ projects: [{ ...row, current_state: 'ARCHIVED', project_data: archived }], files: [], releases: [{ ...recentRelease, updated_at: '2026-08-26T10:30:00.000Z' }] }, { now });
  assert.equal(archivedNoUpdate.actions.length, 0, 'ARCHIVED must not re-enter ordinary Production queue');
  const archivedNeedsUpdate = Core.buildCreatorDashboard({ projects: [{ ...row, current_state: 'ARCHIVED', project_data: archived }], files: [], releases: [{ ...recentRelease, updated_at: '2026-08-26T11:30:00.000Z' }] }, { now });
  assert.equal(archivedNeedsUpdate.actions[0].kind, 'archive');
  assert.match(archivedNeedsUpdate.actions[0].title, /更新 Project Archive/);
  assert.equal(archivedNeedsUpdate.actions[0].route, 'production');

  const remote = { ...baseProject, topic: '云端改题', updatedAt: '2026-08-26T11:00:00.000Z' };
  const local = { ...baseProject, notes: '本机新增备注', updatedAt: '2026-08-26T11:30:00.000Z' };
  const merged = Core.mergeProjectVersions(baseProject, local, remote);
  assert.equal(merged.conflicts.length, 0); assert.equal(merged.merged.topic, '云端改题'); assert.equal(merged.merged.notes, '本机新增备注');
  const conflict = Core.mergeProjectVersions(baseProject, { ...baseProject, topic: '本机改题' }, remote);
  assert.deepEqual(conflict.conflicts.map((item) => item.key), ['topic']);

  assert.equal(Core.deepEqual({ locks: { contentLock: false, scriptLock: false, audioLock: false } }, { locks: { audioLock: false, contentLock: false, scriptLock: false } }), true, 'object key order must not create a false change');
  assert.equal(Core.summarizeProjectDiff({ ...baseProject, locks: { contentLock: false, scriptLock: false, audioLock: false, pictureLock: false } }, { ...baseProject, locks: { pictureLock: false, audioLock: false, scriptLock: false, contentLock: false } }).some((item) => item.key === 'locks'), false, 'stable equality must suppress false lock diffs');

  const attached = Core.attachCloudMetadata(baseProject, { revision: 9, updated_at: '2026-08-26T12:00:00Z', last_device_id: 'phone' });
  assert.equal(attached.integration.cloud.revision, 9); assert.equal(Core.stripCloudMetadata(attached).integration?.cloud, undefined);

  const dashboardUi = fs.readFileSync(path.join(__dirname, '..', 'assets', 'creator-dashboard.mjs'), 'utf8');
  const dashboardCore = fs.readFileSync(path.join(__dirname, '..', 'assets', 'creator-dashboard-core.mjs'), 'utf8');
  assert(!dashboardUi.includes('project.projectTypeLabel'), 'Dashboard cards must not show Project Type labels');
  assert(!dashboardCore.includes('B_FLOW') && !dashboardCore.includes('D_FLOW'), 'Dashboard must use one production flow');
  assert(!dashboardCore.includes('PROJECT_TYPE_LABELS'), 'legacy labels must not be part of Dashboard business logic');
  assert.match(dashboardCore, /archiveNextAction/, 'Dashboard must reuse the canonical Archive action mapping');

  console.log('Creator Dashboard unified flow, archive action queue and conflict checks passed.');
})().catch((error) => { console.error(error); process.exit(1); });
