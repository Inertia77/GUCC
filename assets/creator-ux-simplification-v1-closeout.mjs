const UX_CLOSEOUT_VERSION = "creator-ux-simplification-v1-closeout";
const PRODUCTION_PATH = "/apps/video-workspace/production-system/";

const GLOBAL_STAGE_GROUPS = [
  { label: "项目范围", stages: ["PROJECT_SCOPE", "EVIDENCE", "MASTER_SCRIPT", "RESEARCH"] },
  { label: "语言版本", stages: ["LOCALIZATION", "LANGUAGE_SCRIPT", "REAL_AUDIO_TIMELINE", "VOICE_TIMELINE_LOCK"] },
  { label: "视觉方案", stages: ["VISUAL_MASTER", "VISUAL_MASTER_LOCK", "AI_DIRECTOR", "CODEX_PRODUCTION"] },
  { label: "分发版本", stages: ["VARIANT", "PUBLISH_PACKAGE", "PLATFORM_VARIANT_LOCK", "AI_QA", "HUMAN_FINAL_REVIEW", "RELEASE_LOCK"] },
  { label: "发布", stages: ["DISTRIBUTION"] },
  { label: "复盘", stages: ["ANALYTICS", "PERFORMANCE_REPORT", "LEARNING", "LEARNING_REVIEW", "COMPLETE"] },
];

const HUMAN_CTA = Object.freeze({
  PROJECT_SCOPE: "确认项目范围", EVIDENCE: "确认证据快照", MASTER_SCRIPT: "确认主文案",
  LANGUAGE_SCRIPT: "确认语言文案", VOICE_TIMELINE_LOCK: "确认音频与时间轴", VISUAL_MASTER_LOCK: "确认视觉方案",
  PLATFORM_VARIANT_LOCK: "确认平台分发版本", HUMAN_FINAL_REVIEW: "确认最终审美", RELEASE_LOCK: "确认发布准备",
});

const SYSTEM_CTA = Object.freeze({
  LOCALIZATION: "配置语言版本", VISUAL_MASTER: "配置视觉方案", VARIANT: "配置分发版本", PUBLISH_PACKAGE: "准备发布包",
  DISTRIBUTION: "进入发布", ANALYTICS: "进入发布复盘", PERFORMANCE_REPORT: "查看复盘工作", LEARNING: "查看复盘工作",
  LEARNING_REVIEW: "审核复盘结论", COMPLETE: "查看项目总结",
});

const LANGUAGE_NAMES = Object.freeze({
  "zh": "中文版", "zh-cn": "中文版", "zh-hans": "中文版", "zh-tw": "繁中版", "zh-hant": "繁中版",
  "ja": "日语版", "en": "英语版", "fr": "法语版", "es": "西班牙语版", "it": "意大利语版",
  "ko": "韩语版", "de": "德语版", "ru": "俄语版", "ar": "阿拉伯语版",
});

const STATUS_NAMES = Object.freeze({
  DRAFT: "待处理", SCRIPTING: "制作中", SCRIPT_LOCKED: "文案已确认", AUDIO_PRODUCTION: "音频制作中",
  AUDIO_LOCKED: "音频已确认", TIMELINE_GENERATION: "时间轴处理中", TIMELINE_LOCKED: "时间轴已确认",
  READY: "已就绪", LOCKED: "已确认", ASSEMBLING: "组装中", PLATFORM_PREPARATION: "平台准备中",
  RELEASE_READY: "可进入发布", VALID: "已验证", INVALID: "需修正", PASS: "通过", FAILED: "失败",
  READY_TO_PUBLISH: "等待发布", PUBLISHED: "已发布", ACCEPTED: "已接受", PROPOSED: "待审核",
});

let scheduled = false;
let applying = false;
const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
const setHtml = (node, value) => { if (node && node.innerHTML !== value) node.innerHTML = value; };

function injectStyles() {
  if (document.getElementById("creatorUxSimplificationV1CloseoutStyles")) return;
  const style = document.createElement("style");
  style.id = "creatorUxSimplificationV1CloseoutStyles";
  style.textContent = `
    body.portal-page .creator-revision{display:none!important}
    body.portal-page .creator-project-meta>span[hidden]{display:none!important}
    body.portal-page .creator-stage strong{font-size:12px!important;color:var(--cyan)}
    body.portal-page .creator-stage span{font-size:10px!important}

    body.production-system-page .ux-legacy-workflow{margin:0 0 14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.02);overflow:hidden}
    body.production-system-page .ux-legacy-workflow>summary{min-height:44px;padding:0 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;list-style:none;color:var(--gucc-muted);font-size:12px;font-weight:800}
    body.production-system-page .ux-legacy-workflow>summary::-webkit-details-marker{display:none}
    body.production-system-page .ux-legacy-workflow>summary span{font-size:10px;color:var(--gucc-muted);font-weight:600}
    body.production-system-page .ux-legacy-workflow>.progress-wrap{padding:13px 13px 0}
    body.production-system-page .ux-legacy-workflow>#nextActionCard{margin:13px!important}
    body.production-system-page .ux-legacy-workflow>.locks{margin:13px!important;width:auto!important}
    body.production-system-page .ux-legacy-workflow[open] #nextActionCard.ux-legacy-secondary{display:block!important}
    body.production-system-page .project-hero .ux-project-stage{margin:7px 0 0;color:var(--gucc-cyan);font-size:12px;font-weight:850}

    body.production-system-page #globalProduction .global-title{display:none!important}
    body.production-system-page #globalProduction.ux-show-full .global-title{display:flex!important}
    body.production-system-page #globalProduction:not(.ux-show-full) [data-human-lock]:not(.ux-primary-action){display:none!important}
    body.production-system-page #globalProduction [data-create-publication],
    body.production-system-page #globalProduction [data-record-published],
    body.production-system-page #globalProduction [data-publication-copy],
    body.production-system-page #globalProduction [data-scope-type="publication"]{display:none!important}
    body.production-system-page .ux-technical-title{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important}
    body.production-system-page .ux-friendly-lane-title{display:inline}
    body.production-system-page .global-card-head strong[title],body.production-system-page .global-card-head small[title],body.production-system-page .global-pill[title]{cursor:help}

    body.production-system-page .global-setup.ux-setup-scoped:not(.ux-show-all-forms) [data-global-form]:not(.ux-current-form){display:none!important}
    body.production-system-page .ux-setup-toolbar{display:flex;justify-content:flex-end;padding:9px 10px 0}
    body.production-system-page .ux-setup-toolbar button{min-height:40px}

    body.production-system-page #guccCreatorBridge[data-cloud="error"] .ux-sync-details:not([open])>.gcb-row{display:flex!important;margin-top:6px!important}
    body.production-system-page #guccCreatorBridge[data-cloud="error"] .ux-sync-details:not([open])>.gcb-row>:not(:first-child){display:none!important}

    @media(max-width:700px){
      body.production-system-page .gcb-inline>strong{display:none!important}
      body.production-system-page .gcb-integrated-host .gucc-creator-bridge.gcb-inline{padding:7px 8px!important}
      body.production-system-page .project-hero .ux-project-stage{font-size:11px!important}
      body.production-system-page .ux-legacy-workflow>summary{min-height:44px;font-size:11px}
      body.production-system-page .ux-legacy-workflow>summary span{display:none}
      body.production-system-page .ux-global-toolbar{margin:2px 0 5px!important}
      body.production-system-page .ux-global-toolbar button{min-height:44px}
    }
  `;
  document.head.appendChild(style);
}

function globalStageCode() {
  const now = document.querySelector("#globalProduction .ux-canonical-now");
  if (now?.dataset.stage) return String(now.dataset.stage).toUpperCase();
  const source = document.querySelector("#globalProduction .global-next small");
  return String(source?.textContent || "").split("·")[0].trim().toUpperCase();
}

function groupIndex(code) {
  const index = GLOBAL_STAGE_GROUPS.findIndex((group) => group.stages.includes(String(code || "").toUpperCase()));
  return index >= 0 ? index : 0;
}

function friendlyLegacyStage(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (["IDEA", "PLANNING", "RESEARCHING", "RESEARCH_LOCKED", "CONTENT_LOCKED"].includes(value)) return "项目范围";
  if (["SCRIPTING", "SCRIPT_LOCKED"].includes(value)) return "主文案";
  if (["PRE_ASSET_PREPARATION", "AUDIO_PRODUCTION", "AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED"].includes(value)) return "音频与时间轴";
  if (["STORYBOARDING", "ASSET_COMPLETION", "PRODUCTION_READY", "CODEX_BUILD", "REVIEW", "REVISION", "FINE_EDIT", "PICTURE_LOCKED"].includes(value)) return "画面制作";
  if (value === "RELEASE_READY") return "发布准备";
  if (value === "PUBLISHED") return "已发布";
  if (value === "ARCHIVED") return "已完成";
  return raw || "当前阶段";
}

function friendlyStage(raw) {
  const value = String(raw || "").trim().toUpperCase();
  const global = GLOBAL_STAGE_GROUPS.find((group) => group.stages.includes(value));
  return global?.label || friendlyLegacyStage(value);
}

function humanizePortal() {
  const dashboard = document.getElementById("creatorDashboard");
  if (!dashboard) return;
  for (const card of dashboard.querySelectorAll(".creator-project-card")) {
    const strong = card.querySelector(".creator-stage strong");
    const secondary = card.querySelector(".creator-stage span");
    if (strong) {
      const raw = strong.dataset.uxTechnicalStage || strong.textContent.trim();
      strong.dataset.uxTechnicalStage = raw; strong.title = raw; setText(strong, friendlyStage(raw));
    }
    if (secondary) {
      const raw = secondary.dataset.uxTechnicalStage || secondary.textContent.trim();
      secondary.dataset.uxTechnicalStage = raw; secondary.title = raw; setText(secondary, "当前阶段");
    }
    const revision = card.querySelector(".creator-revision");
    if (revision && !revision.title) revision.title = revision.textContent.trim();
    const locks = card.querySelector(".creator-project-meta>span:first-child");
    if (locks?.querySelector(".creator-lock")) {
      if (!locks.title) locks.title = [...locks.querySelectorAll(".creator-lock")].map((node) => `${node.title}:${node.classList.contains("is-on") ? "on" : "off"}`).join(" · ");
      locks.hidden = true;
    }
  }
}

function enhanceLegacyWorkflow() {
  const hero = document.querySelector("body.production-system-page .project-hero");
  const global = document.getElementById("globalProduction");
  const progress = hero?.querySelector(".progress-wrap") || document.querySelector(".ux-legacy-workflow>.progress-wrap");
  const next = document.getElementById("nextActionCard");
  const locks = document.querySelector("section.locks.panel");
  if (!hero || !global || !progress || !next || !locks) return;

  let details = document.querySelector(".ux-legacy-workflow");
  if (!details) {
    details = document.querySelector(".ux-legacy-gates");
    if (!details) { details = document.createElement("details"); global.insertAdjacentElement("afterend", details); }
    details.classList.add("ux-legacy-workflow", "ux-legacy-gates");
  }
  let summary = details.querySelector(":scope>summary");
  if (!summary) { summary = document.createElement("summary"); details.prepend(summary); }
  setHtml(summary, `Legacy Workflow Detail <span>兼容状态 · 全部门禁 · 手工回退</span>`);
  if (progress.parentElement !== details) details.appendChild(progress);
  if (next.parentElement !== details) details.appendChild(next);
  if (locks.parentElement !== details) details.appendChild(locks);
  for (const wrapper of [...document.querySelectorAll(".ux-legacy-gates")].filter((node) => node !== details)) wrapper.remove();
}

function updateProjectStage() {
  const hero = document.querySelector("body.production-system-page .project-hero");
  if (!hero) return;
  const code = globalStageCode();
  const label = GLOBAL_STAGE_GROUPS[groupIndex(code)]?.label || "当前阶段";
  let stage = hero.querySelector(".ux-project-stage");
  if (!stage) { stage = document.createElement("p"); stage.className = "ux-project-stage"; hero.querySelector("#projectMeta")?.insertAdjacentElement("afterend", stage); }
  setText(stage, `当前阶段 · ${label}`); stage.title = code;
}

function friendlyStatus(node) {
  const raw = node.dataset.uxTechnicalStatus || node.textContent.trim();
  node.dataset.uxTechnicalStatus = raw; node.title = raw;
  const desired = STATUS_NAMES[raw.toUpperCase()] || node.textContent;
  setText(node, desired);
}

function languageLabel(code, index) {
  return LANGUAGE_NAMES[String(code || "").trim().toLowerCase()] || `语言版本 ${index + 1}`;
}

function wrapLaneTitle(lane, friendly) {
  const heading = lane.querySelector(".global-lane-head h4");
  if (!heading || heading.querySelector(".ux-friendly-lane-title")) return;
  const technical = heading.textContent.trim();
  heading.innerHTML = `<span class="ux-technical-title"></span><span class="ux-friendly-lane-title"></span>`;
  setText(heading.querySelector(".ux-technical-title"), technical); setText(heading.querySelector(".ux-friendly-lane-title"), friendly); heading.title = technical;
}

function humanizeGlobalCards(root) {
  const lanes = [...root.querySelectorAll(".global-lane")];
  const languageLane = lanes.find((lane) => /Language/i.test(lane.textContent));
  const visualLane = lanes.find((lane) => /Visual Master/i.test(lane.textContent));
  const variantLane = lanes.find((lane) => /^\s*Variants/i.test(lane.textContent));
  const packageLane = lanes.find((lane) => /Publish Packages/i.test(lane.textContent));
  const publicationLane = lanes.find((lane) => /Publications/i.test(lane.textContent));
  if (languageLane) wrapLaneTitle(languageLane, "语言版本");
  if (visualLane) wrapLaneTitle(visualLane, "视觉方案");
  if (variantLane) wrapLaneTitle(variantLane, "分发版本");
  if (packageLane) wrapLaneTitle(packageLane, "发布准备");
  if (publicationLane) wrapLaneTitle(publicationLane, "发布与复盘");

  const languageMap = new Map();
  languageLane?.querySelectorAll(".global-entity-card").forEach((card, index) => {
    const strong = card.querySelector(".global-card-head strong"), small = card.querySelector(".global-card-head small");
    if (!strong || !small) return;
    const rawKey = strong.dataset.uxRawKey || strong.textContent.trim(), rawMeta = small.dataset.uxRawMeta || small.textContent.trim();
    strong.dataset.uxRawKey = rawKey; small.dataset.uxRawMeta = rawMeta;
    const friendly = languageLabel(rawMeta.split("·")[0].trim(), index); languageMap.set(rawKey, friendly);
    strong.title = `${rawKey} · ${rawMeta}`; setText(strong, friendly); small.title = rawMeta; setText(small, "语言版本");
    card.querySelectorAll(".global-pill").forEach(friendlyStatus);
  });

  const visualMap = new Map();
  visualLane?.querySelectorAll(".global-entity-card").forEach((card, index) => {
    const strong = card.querySelector(".global-card-head strong"), small = card.querySelector(".global-card-head small");
    if (!strong) return;
    const raw = strong.dataset.uxRawKey || strong.textContent.trim(); strong.dataset.uxRawKey = raw;
    const friendly = index ? `视觉母版 ${index + 1}` : "视觉母版"; visualMap.set(raw, friendly); strong.title = raw; setText(strong, friendly);
    if (small) { small.title ||= small.textContent.trim(); setText(small, small.textContent.replace(/semantic anchors/i, "个语义锚点").replace(/\s*·\s*r\d+/i, "")); }
    card.querySelectorAll(".global-lock-line span").forEach((span) => { const rawLabel = span.title || span.textContent.trim(); span.title = rawLabel; setText(span, ({ Visual: "视觉", "Edit Plan": "剪辑方案", "Master Render": "成片" })[rawLabel] || rawLabel); });
    card.querySelectorAll(".global-pill").forEach(friendlyStatus);
  });

  const variantMap = new Map();
  variantLane?.querySelectorAll(".global-entity-card").forEach((card, index) => {
    const strong = card.querySelector(".global-card-head strong"); if (!strong) return;
    const raw = strong.dataset.uxRawKey || strong.textContent.trim(); strong.dataset.uxRawKey = raw;
    const friendly = `分发版本 ${index + 1}`; variantMap.set(raw, friendly); strong.title = raw; setText(strong, friendly);
    const p = card.querySelector("p");
    if (p && !p.dataset.uxHumanized) { let text = p.textContent; for (const [key, value] of visualMap) text = text.split(key).join(value); for (const [key, value] of languageMap) text = text.split(key).join(value); p.title = p.textContent.trim(); setText(p, text.replace(/Visual\s*·/i, "视觉 ·").replace(/Language\s*·/i, "语言 ·")); p.dataset.uxHumanized = "true"; }
    card.querySelectorAll(".global-pill").forEach(friendlyStatus);
  });

  packageLane?.querySelectorAll(".global-entity-card").forEach((card, index) => {
    const strong = card.querySelector(".global-card-head strong"), small = card.querySelector(".global-card-head small");
    if (strong) { const raw = strong.dataset.uxRawKey || strong.textContent.trim(); strong.dataset.uxRawKey = raw; strong.title = raw; setText(strong, `发布准备 ${index + 1}`); }
    if (small && !small.dataset.uxHumanized) { let text = small.textContent; for (const [key, value] of variantMap) text = text.split(key).join(value); small.title = small.textContent.trim(); setText(small, text.replace(/package\s*r/i, "修订 r")); small.dataset.uxHumanized = "true"; }
    card.querySelectorAll(".global-lock-line span").forEach((span) => { const rawLabel = span.title || span.textContent.trim(); span.title = rawLabel; setText(span, ({ Platform: "平台", "AI QA": "AI 检查", "Human Review": "人工审美", Release: "发布准备" })[rawLabel] || rawLabel); });
    card.querySelectorAll(".global-pill").forEach(friendlyStatus);
  });

  publicationLane?.querySelectorAll(".global-entity-card").forEach((card) => {
    const strong = card.querySelector(".global-card-head strong"), small = card.querySelector(".global-card-head small");
    if (strong) { const raw = strong.dataset.uxRawKey || strong.textContent.trim(); strong.dataset.uxRawKey = raw; strong.title = raw; setText(strong, /RETRY/i.test(raw) ? "重试发布" : /REPOST/i.test(raw) ? "重新发布" : "首次发布"); }
    if (small && !/^https?:/i.test(small.textContent.trim())) { small.title ||= small.textContent.trim(); setText(small, "等待平台执行"); }
    card.querySelectorAll(".global-pill").forEach(friendlyStatus);
  });
}

function humanizeCanonical(root) {
  const now = root.querySelector(".ux-canonical-now"); if (!now) return;
  const code = String(now.dataset.stage || globalStageCode()).toUpperCase();
  const primary = now.querySelector(".ux-primary-action");
  if (primary) setText(primary, now.classList.contains("ux-human") && HUMAN_CTA[code] ? HUMAN_CTA[code] : SYSTEM_CTA[code] || "查看当前工作");
  const detail = now.querySelector(".ux-now-detail");
  if (detail && !detail.dataset.uxHumanized) {
    const replacements = { AUDIO_MASTER: "音频母版", SUBTITLE_MASTER: "字幕", TIMELINE_SENTENCE: "句级时间轴", TRANSCRIPT_ALIGNED: "对齐文本", ALIGNMENT_REPORT: "对齐报告", REAL_AUDIO_PROVENANCE: "真实音频来源", ALIGNMENT_VALID: "有效对齐" };
    let value = detail.textContent; for (const [technical, friendly] of Object.entries(replacements)) value = value.split(technical).join(friendly);
    detail.title = detail.textContent.trim(); setText(detail, value); detail.dataset.uxHumanized = "true";
  }
  const after = now.querySelector(".ux-after");
  if (after) { const remaining = GLOBAL_STAGE_GROUPS.slice(groupIndex(code) + 1).map((group) => group.label); setText(after, remaining.length ? `之后：○ ${remaining.join("　○ ")}` : "当前流程已闭环"); }
}

function relevantForms(code) {
  if (code === "LOCALIZATION") return ["language"];
  if (code === "VISUAL_MASTER") return ["visual"];
  if (code === "VARIANT") return ["variant"];
  if (code === "PUBLISH_PACKAGE") return ["channel", "presentation", "package"];
  return [];
}

function humanizeSetup(root) {
  const setup = root.querySelector(".global-setup"); if (!setup?.open) return;
  const allowed = new Set(relevantForms(globalStageCode())); setup.classList.toggle("ux-setup-scoped", allowed.size > 0);
  setup.querySelectorAll("[data-global-form]").forEach((form) => form.classList.toggle("ux-current-form", allowed.has(form.dataset.globalForm)));
  const names = { language: "语言版本", visual: "视觉母版", variant: "分发版本", channel: "发布渠道", presentation: "平台标题与简介", package: "发布准备" };
  setup.querySelectorAll("[data-global-form]").forEach((form) => { const heading = form.querySelector("h4"); if (heading) setText(heading, names[form.dataset.globalForm] || heading.textContent); });
  for (const [name, label] of [["visualMasterId", "视觉母版"], ["variantId", "分发版本"], ["presentationId", "平台内容方案"], ["outputArtifactId", "成片输出"]]) {
    setup.querySelectorAll(`select[name="${name}"]`).forEach((select) => [...select.options].forEach((option, index) => { if (!option.value) return; option.title ||= option.textContent; setText(option, `${label} ${index + 1}`); }));
  }
  if (!setup.querySelector(".ux-setup-toolbar")) {
    const toolbar = document.createElement("div"); toolbar.className = "ux-setup-toolbar";
    const button = document.createElement("button"); button.type = "button"; button.className = "button tiny ghost"; button.textContent = "高级 · 查看全部配置";
    button.addEventListener("click", () => { setup.classList.toggle("ux-show-all-forms"); setText(button, setup.classList.contains("ux-show-all-forms") ? "收起高级配置" : "高级 · 查看全部配置"); });
    toolbar.appendChild(button); setup.querySelector("summary")?.insertAdjacentElement("afterend", toolbar);
  }
}

function enhanceSyncStatus() {
  const panel = document.getElementById("guccCreatorBridge"), status = panel?.querySelector("[data-gcb-status]"); if (!panel || !status) return;
  const raw = status.title || status.textContent || ""; status.title = raw;
  let desired = status.textContent;
  if (/冲突|失败|error/i.test(raw)) desired = "⚠ 冲突需要处理";
  else if (/本地模式|登录后|需先登录|仅本地/i.test(raw)) desired = "○ 仅本地 · 登录后同步";
  else if (/一致|已同步|已合并|读取完成/i.test(raw)) desired = "☁ 已同步";
  else if (/同步中|等待下一次同步|等待同步|正在编辑|本地编辑|新编辑/i.test(raw)) desired = "● 本地有修改 · 正在同步";
  setText(status, desired);
}

function enhanceProduction() {
  enhanceLegacyWorkflow(); enhanceSyncStatus();
  const root = document.getElementById("globalProduction"); if (!root?.querySelector(".global-next")) return;
  updateProjectStage(); humanizeCanonical(root); humanizeGlobalCards(root); humanizeSetup(root); document.body.dataset.creatorUxCloseout = UX_CLOSEOUT_VERSION;
}

function apply() {
  if (applying) return; applying = true;
  try { injectStyles(); if (document.body?.classList.contains("portal-page")) humanizePortal(); if (location.pathname.includes(PRODUCTION_PATH) || document.body?.classList.contains("production-system-page")) enhanceProduction(); }
  finally { applying = false; }
}

function schedule() { if (scheduled) return; scheduled = true; queueMicrotask(() => { scheduled = false; apply(); }); }

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { apply(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "open", "data-cloud", "data-project-id"] }); }, { once: true });
} else {
  apply(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "open", "data-cloud", "data-project-id"] });
}

export { UX_CLOSEOUT_VERSION, friendlyStage };
