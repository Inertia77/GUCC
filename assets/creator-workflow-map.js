/* Read-only projection over the existing Legacy and Global Creator states. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GuccCreatorWorkflow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const stages = Object.freeze([
    { code:'IDEA', title:'选题 / 立项', purpose:'确定这条视频要回答的问题。', input:'社区问题、版本机会、观众需求', work:'选题、受众、范围与目标发布日期', output:'Project Scope / 核心问题', owner:'你 + ChatGPT', gate:'Project Scope 由你确认', next:'先取证，再落笔', tasks:[] },
    { code:'EVIDENCE', title:'研究 / 证据', purpose:'用可追溯证据决定视频结论。', input:'社区问题、官方资料、直播 / PV / 实机视频', work:'先解析音画与时间戳，再研究机制、建立 Evidence 与 Core Thesis', output:'Evidence Snapshot / 核心命题', owner:'ChatGPT + 你', gate:'Research / Evidence Lock 由你确认', next:'先完成证据，再写正式文案', tasks:['OFFICIAL_VIDEO_EVIDENCE'] },
    { code:'SCRIPT', title:'结构 / 文案', purpose:'把证据变成观众愿意听完的解释。', input:'已核实 Evidence、核心命题', work:'视频规划、章节、完整稿、事实机制审核、去 AI 味与留存审核', output:'完整朗读稿 / Master Script', owner:'ChatGPT + 你', gate:'SCRIPT LOCK 由你确认', next:'真人录音', tasks:['SCRIPT_REVIEW','NATURALNESS_REVIEW'] },
    { code:'AUDIO', title:'声音 / 时间线', purpose:'用最终真实录音确定每一句的时间。', input:'Script Lock、最终真人录音', work:'录音、Audio Lock、真实音频对齐、SRT / Timeline Bundle', output:'AUDIO_MASTER / SRT / Timeline', owner:'你 + Codex', gate:'AUDIO LOCK / TIMELINE LOCK 由你确认', next:'按真实时间规划画面', tasks:['SRT_ALIGNMENT'] },
    { code:'VISUAL', title:'视觉 / 素材', purpose:'为每句旁白安排能证明或解释的画面。', input:'Timeline Lock、真实游戏证据、官方素材', work:'视觉规划、实战录屏、像素机制动画、BGM、封面与素材补全', output:'Visual Master / Asset Bin', owner:'ChatGPT + 你 + Codex', gate:'素材与视觉方案由你确认', next:'做剪辑蓝图', tasks:['PIXEL_PACKAGE'] },
    { code:'EDIT', title:'剪辑 / 成片', purpose:'把证据、解释、声音与画面锁成成片。', input:'锁定 Timeline、素材、Visual Master', work:'Editing Blueprint、Codex Build、Review、Revision、Fine Edit、QC', output:'Master Render / QC Report', owner:'Codex + 你', gate:'PICTURE LOCK 由你确认', next:'准备多平台发布', tasks:['EDIT_BLUEPRINT'] },
    { code:'PUBLISH', title:'发布 / 复盘', purpose:'以成片为准适配平台，并用数据反哺下一条视频。', input:'Picture Lock、Release Package', work:'平台适配、人工发布、Analytics、Performance Review、Accepted Learning', output:'Publication / Learning', owner:'你 + ChatGPT + GUCC', gate:'最终发布与 Learning 接受由你确认', next:'沉淀可复用经验', tasks:['PUBLISH_PACKAGE'] },
  ]);
  const legacy = {
    IDEA:0, PLANNING:0, RESEARCHING:1, RESEARCH_LOCKED:1, CONTENT_LOCKED:2, SCRIPTING:2, SCRIPT_LOCKED:3,
    PRE_ASSET_PREPARATION:3, AUDIO_PRODUCTION:3, AUDIO_LOCKED:3, TIMELINE_GENERATION:3, TIMELINE_LOCKED:4,
    STORYBOARDING:4, ASSET_COMPLETION:4, PRODUCTION_READY:5, CODEX_BUILD:5, REVIEW:5, REVISION:5,
    FINE_EDIT:5, PICTURE_LOCKED:6, RELEASE_READY:6, PUBLISHED:6, ARCHIVED:6,
  };
  const global = {
    PROJECT_SCOPE:0, EVIDENCE:1, MASTER_SCRIPT:2, LOCALIZATION:2, LANGUAGE_SCRIPT:2, REAL_AUDIO_TIMELINE:3,
    VOICE_TIMELINE_LOCK:3, VISUAL_MASTER:4, VISUAL_MASTER_LOCK:4, AI_DIRECTOR:5, CODEX_PRODUCTION:5,
    VARIANT:6, PUBLISH_PACKAGE:6, PLATFORM_VARIANT_LOCK:6, AI_QA:6, HUMAN_FINAL_REVIEW:6,
    RELEASE_LOCK:6, DISTRIBUTION:6, ANALYTICS:6, PERFORMANCE_REPORT:6, LEARNING:6, LEARNING_REVIEW:6, COMPLETE:6,
  };
  function stageFor(legacyState, globalState) {
    const index = Object.hasOwn(global, globalState) ? global[globalState] : (legacy[legacyState] ?? 0);
    return { index, ...stages[index] };
  }
  return Object.freeze({ stages, legacy, global, stageFor });
});
