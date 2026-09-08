const UX_VERSION = "creator-ux-simplification-v1";
const PRODUCTION_PATH = "/apps/video-workspace/production-system/";

const STAGE_GROUPS = [
  { key: "scope", label: "项目范围", stages: ["PROJECT_SCOPE", "EVIDENCE", "MASTER_SCRIPT", "RESEARCH"] },
  { key: "language", label: "语言版本", stages: ["LOCALIZATION", "LANGUAGE_SCRIPT", "REAL_AUDIO_TIMELINE", "VOICE_TIMELINE_LOCK"] },
  { key: "visual", label: "视觉方案", stages: ["VISUAL_MASTER", "VISUAL_MASTER_LOCK", "AI_DIRECTOR", "CODEX_PRODUCTION"] },
  { key: "variant", label: "分发版本", stages: ["VARIANT", "PUBLISH_PACKAGE", "PLATFORM_VARIANT_LOCK", "AI_QA", "HUMAN_FINAL_REVIEW", "RELEASE_LOCK"] },
  { key: "publish", label: "发布", stages: ["DISTRIBUTION"] },
  { key: "review", label: "复盘", stages: ["ANALYTICS", "PERFORMANCE_REPORT", "LEARNING", "LEARNING_REVIEW", "COMPLETE"] },
];

let scheduled = false;
let applying = false;

function css() {
  if (document.getElementById("creatorUxSimplificationV1Styles")) return;
  const style = document.createElement("style");
  style.id = "creatorUxSimplificationV1Styles";
  style.textContent = `
    /* Creator UX Simplification v1: hierarchy first, no workflow semantics changed. */
    body.portal-page .creator-action-list > .creator-action:first-of-type,
    body.portal-page .creator-top-action{min-height:92px;padding:16px 17px;border-color:rgba(116,243,255,.42);background:linear-gradient(135deg,rgba(116,243,255,.12),rgba(8,14,24,.92))}
    body.portal-page .creator-top-action .creator-action-body small{font-size:11px}
    body.portal-page .creator-top-action .creator-action-body strong{font-size:17px}
    body.portal-page .creator-top-action .creator-action-body span{font-size:12px}
    body.portal-page .creator-top-action .creator-action-go{font-size:12px}
    body.portal-page .creator-next-queue{margin-top:8px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025)}
    body.portal-page .creator-next-queue>summary{min-height:44px;padding:0 13px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;color:var(--muted);font-size:12px;font-weight:850}
    body.portal-page .creator-next-queue>summary::-webkit-details-marker{display:none}
    body.portal-page .creator-secondary-actions{display:grid;gap:7px;padding:0 8px 8px}
    body.portal-page .creator-secondary-actions .creator-action{min-height:66px;box-shadow:none;background:rgba(255,255,255,.025)}
    body.portal-page .creator-action-body small,body.portal-page .creator-health,body.portal-page .creator-stage{font-size:11px}
    body.portal-page .creator-action-body strong{font-size:14px}
    body.portal-page .creator-action-body span,body.portal-page .creator-project-card>p,body.portal-page .creator-project-next strong{font-size:11px}
    body.portal-page .creator-project-meta,body.portal-page .creator-project-next small,body.portal-page .creator-project-next span{font-size:10px}
    body.portal-page .creator-refresh,body.portal-page .creator-dashboard-head>a{min-height:44px;display:inline-flex;align-items:center;justify-content:center}

    body.production-system-page #nextActionCard.ux-legacy-secondary{display:none!important}
    body.production-system-page #globalProduction .global-next{display:none!important}
    body.production-system-page #globalProduction .global-metrics{display:none}
    body.production-system-page #globalProduction.ux-show-full .global-metrics{display:grid}
    body.production-system-page .ux-canonical-now{margin:-4px 0 14px;padding:18px;border:1px solid rgba(116,243,255,.34);border-radius:18px;background:linear-gradient(135deg,rgba(116,243,255,.10),rgba(120,255,186,.045));box-shadow:0 16px 40px rgba(0,0,0,.18)}
    body.production-system-page .ux-canonical-now.ux-human{border-color:rgba(255,209,102,.38);background:linear-gradient(135deg,rgba(255,209,102,.10),rgba(9,16,27,.82))}
    body.production-system-page .ux-now-kicker{margin:0;color:var(--gucc-cyan);font-size:11px;font-weight:900;letter-spacing:.08em}
    body.production-system-page .ux-canonical-now h3{margin:7px 0 5px;font-size:clamp(22px,3vw,30px);letter-spacing:-.03em}
    body.production-system-page .ux-now-detail{margin:0;color:var(--gucc-muted);font-size:13px;line-height:1.55}
    body.production-system-page .ux-now-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
    body.production-system-page .ux-primary-action{min-height:46px!important;padding:11px 18px!important;font-size:14px!important;background:linear-gradient(135deg,var(--gucc-mint),var(--gucc-cyan))!important;color:#061014!important;border:0!important;font-weight:850!important}
    body.production-system-page #projectWorkspace .button.primary:not(.ux-primary-action){background:rgba(255,255,255,.065);color:var(--gucc-text);border:1px solid var(--ps-border)}
    body.production-system-page .ux-after{color:var(--gucc-muted);font-size:12px}
    body.production-system-page .ux-progress-strip{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:0 0 15px}
    body.production-system-page .ux-progress-step{min-width:0;padding:9px 10px;border:1px solid var(--ps-border);border-radius:11px;background:rgba(255,255,255,.025);color:var(--gucc-muted);font-size:11px}
    body.production-system-page .ux-progress-step.is-done{color:var(--gucc-mint);border-color:rgba(120,255,186,.22)}
    body.production-system-page .ux-progress-step.is-current{color:var(--gucc-cyan);border-color:rgba(116,243,255,.42);background:rgba(116,243,255,.08);font-weight:850}
    body.production-system-page .ux-progress-step b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    body.production-system-page .global-lane.ux-stage-collapsed:not(.ux-force-open) .global-card-grid,
    body.production-system-page .global-lane.ux-stage-collapsed:not(.ux-force-open) .global-learning-list{display:none}
    body.production-system-page #globalProduction.ux-show-full .global-lane.ux-stage-collapsed .global-card-grid,
    body.production-system-page #globalProduction.ux-show-full .global-lane.ux-stage-collapsed .global-learning-list{display:grid}
    body.production-system-page .global-lane.ux-stage-collapsed{padding:11px 0}
    body.production-system-page .global-lane.ux-stage-collapsed .global-lane-head{margin:0}
    body.production-system-page .global-lane.ux-stage-collapsed .global-lane-head:after{content:"待处理";margin-left:auto;color:var(--gucc-muted);font-size:10px}
    body.production-system-page .global-lane.ux-stage-current{padding-top:12px}
    body.production-system-page .global-lane.ux-stage-current .global-lane-head h4:before{content:"→ ";color:var(--gucc-cyan)}
    body.production-system-page .global-project-gates{display:none}
    body.production-system-page #globalProduction.ux-show-full .global-project-gates{display:flex}
    body.production-system-page .ux-global-toolbar{display:flex;justify-content:flex-end;gap:8px;margin:4px 0 8px}
    body.production-system-page .ux-global-toolbar button{min-height:40px}
    body.production-system-page .ux-publish-readiness{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;margin-top:10px;border:1px solid rgba(120,255,186,.20);border-radius:13px;background:rgba(120,255,186,.045)}
    body.production-system-page .ux-publish-readiness strong{display:block;font-size:13px}
    body.production-system-page .ux-publish-readiness span{display:block;margin-top:3px;color:var(--gucc-muted);font-size:11px}
    body.production-system-page #globalProduction:not(.ux-show-full) [data-create-publication],
    body.production-system-page #globalProduction:not(.ux-show-full) [data-record-published],
    body.production-system-page #globalProduction:not(.ux-show-full) [data-publication-copy],
    body.production-system-page #globalProduction:not(.ux-show-full) [data-scope-type="publication"]{display:none!important}
    body.production-system-page .ux-identity-source{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;clip-path:inset(50%)!important}
    body.production-system-page .ux-identity-settings{margin-top:8px;border-top:1px dashed rgba(255,255,255,.10);padding-top:7px}
    body.production-system-page .ux-identity-settings>summary{cursor:pointer;color:var(--gucc-muted);font-size:11px;font-weight:750}
    body.production-system-page .ux-identity-settings label{margin-top:8px}
    body.production-system-page .ux-shared-visual{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:8px!important}
    body.production-system-page .ux-shared-visual input{width:auto}
    body.production-system-page .ux-production-more,body.production-system-page .ux-project-settings{position:relative}
    body.production-system-page .ux-production-more>summary,body.production-system-page .ux-project-settings>summary,body.production-system-page .ux-sync-details>summary{min-height:40px;padding:0 11px;display:flex;align-items:center;border:1px solid var(--ps-border);border-radius:11px;cursor:pointer;list-style:none;color:var(--gucc-muted);font-size:12px;font-weight:800;background:rgba(255,255,255,.035)}
    body.production-system-page .ux-production-more>summary::-webkit-details-marker,body.production-system-page .ux-project-settings>summary::-webkit-details-marker,body.production-system-page .ux-sync-details>summary::-webkit-details-marker{display:none}
    body.production-system-page .ux-more-menu,body.production-system-page .ux-project-menu{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}
    body.production-system-page .ux-sync-details{grid-column:2;grid-row:1 / 3;align-self:center}
    body.production-system-page .ux-sync-details .gcb-row{margin-top:6px!important;padding-right:0!important;flex-wrap:wrap!important}
    body.production-system-page .gcb-inline .gcb-close{display:none!important}
    body.production-system-page .ux-legacy-gates{margin:0 0 14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.02)}
    body.production-system-page .ux-legacy-gates>summary{min-height:44px;padding:0 13px;display:flex;align-items:center;cursor:pointer;color:var(--gucc-muted);font-size:12px;font-weight:800}
    body.production-system-page .ux-legacy-gates>.locks{margin:0;border:0;box-shadow:none;background:transparent}

    @media(max-width:700px){
      body.portal-page .creator-top-action{min-height:82px;padding:13px}
      body.portal-page .creator-top-action .creator-action-body strong{font-size:15px}
      body.portal-page .creator-action-body small{font-size:11px}
      body.portal-page .creator-action-body span{font-size:11px}
      body.portal-page .creator-project-meta,body.portal-page .creator-project-next small,body.portal-page .creator-project-next span{font-size:10px}
      body.portal-page .creator-action,body.portal-page .creator-refresh,body.portal-page .creator-dashboard-head>a{min-height:44px}

      body.production-system-page .topbar{min-height:auto!important;padding:10px 12px!important;display:flex!important;align-items:center!important}
      body.production-system-page .topbar h1{font-size:19px!important;margin:2px 0!important}
      body.production-system-page .topbar .subtitle{display:none!important}
      body.production-system-page .topbar .eyebrow{font-size:9px!important}
      body.production-system-page .sidebar{padding:7px 8px!important}
      body.production-system-page .sidebar-head{padding:0 4px 5px!important;font-size:11px}
      body.production-system-page .project-list{gap:5px}
      body.production-system-page .project-item{min-width:148px!important;padding:8px 9px!important}
      body.production-system-page .project-item span{font-size:10px!important;margin-top:2px!important}
      body.production-system-page .workspace{padding:9px 9px 70px!important}
      body.production-system-page .project-hero{padding:13px!important;margin-bottom:9px!important;gap:8px!important}
      body.production-system-page .project-hero h2{font-size:22px!important;margin:4px 0!important}
      body.production-system-page .project-hero .muted{font-size:11px!important;line-height:1.35}
      body.production-system-page .progress-wrap{margin-top:2px}
      body.production-system-page .state-controls{display:none!important}
      body.production-system-page .ux-canonical-now{padding:14px!important;margin:0 0 9px!important;border-radius:15px!important}
      body.production-system-page .ux-canonical-now h3{font-size:20px!important}
      body.production-system-page .ux-now-detail{font-size:12px!important}
      body.production-system-page .ux-primary-action{width:100%;min-height:46px!important;justify-content:center}
      body.production-system-page .ux-progress-strip{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:9px}
      body.production-system-page .ux-progress-step{padding:7px 8px;font-size:10px}
      body.production-system-page .global-production{padding:12px!important;margin-bottom:10px!important}
      body.production-system-page .global-title{display:none!important}
      body.production-system-page .global-lane{padding:9px 0!important}
      body.production-system-page .global-lane-head h4{font-size:13px!important}
      body.production-system-page .global-lane-head small{font-size:10px!important}
      body.production-system-page .button,body.production-system-page button,body.production-system-page a.button{min-height:44px}
      body.production-system-page input,body.production-system-page textarea,body.production-system-page select{font-size:16px!important}
      body.production-system-page .ux-sync-details{grid-column:1;grid-row:3;margin-top:5px}
    }
  `;
  document.head.appendChild(style);
}

function safeKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "AUTO";
}

function stageCode() {
  const small = document.querySelector("#globalProduction .global-next small");
  return String(small?.textContent || "").split("·")[0].trim().toUpperCase();
}

function groupIndex(code) {
  const index = STAGE_GROUPS.findIndex((group) => group.stages.includes(code));
  return index >= 0 ? index : 0;
}

function enhancePortal() {
  const root = document.getElementById("creatorDashboard");
  if (!root) return;
  const list = root.querySelector(".creator-action-list");
  if (!list || list.querySelector(".creator-next-queue")) return;
  const actions = [...list.children].filter((node) => node.classList?.contains("creator-action"));
  if (!actions.length) return;
  const head = root.querySelector(".creator-dashboard-head h2");
  if (head) head.textContent = "现在做这个";
  actions[0].classList.add("creator-top-action");
  if (actions.length > 1) {
    const details = document.createElement("details");
    details.className = "creator-next-queue";
    const summary = document.createElement("summary");
    summary.textContent = `接下来 · ${actions.length - 1} 项`;
    const queue = document.createElement("div");
    queue.className = "creator-secondary-actions";
    for (const action of actions.slice(1)) queue.appendChild(action);
    details.append(summary, queue);
    list.appendChild(details);
  }
  root.dataset.uxHierarchy = UX_VERSION;
}

function wrapUtilities() {
  const top = document.querySelector("body.production-system-page .top-actions");
  if (top && !top.querySelector(".ux-production-more")) {
    const keep = [...top.children].find((node) => node.matches?.('a[href="../"]'));
    const details = document.createElement("details");
    details.className = "ux-production-more";
    details.innerHTML = `<summary>更多</summary><div class="ux-more-menu"></div>`;
    const menu = details.querySelector(".ux-more-menu");
    [...top.children].filter((node) => node !== keep).forEach((node) => menu.appendChild(node));
    top.appendChild(details);
  }
  const hero = document.querySelector("body.production-system-page .hero-actions");
  if (hero && !hero.closest(".ux-project-settings")) {
    const details = document.createElement("details");
    details.className = "ux-project-settings";
    details.innerHTML = `<summary>项目设置</summary><div class="ux-project-menu"></div>`;
    hero.before(details);
    details.querySelector(".ux-project-menu").appendChild(hero);
  }
  const locks = document.querySelector("body.production-system-page section.locks.panel");
  if (locks && !locks.closest(".ux-legacy-gates")) {
    const details = document.createElement("details");
    details.className = "ux-legacy-gates";
    details.innerHTML = `<summary>Legacy Workflow · 查看全部门禁</summary>`;
    locks.before(details);
    details.appendChild(locks);
  }
}

function simplifySyncPanel() {
  const panel = document.getElementById("guccCreatorBridge");
  if (!panel) return;
  const status = panel.querySelector("[data-gcb-status]");
  if (status) {
    const raw = status.textContent || "";
    const alreadyFriendly = /^(?:⚠ 冲突需要处理|● 本地有修改 · 正在同步|☁ 已同步)$/.test(raw);
    if (!alreadyFriendly) {
      status.title = raw;
      if (/冲突|失败|error/i.test(raw)) status.textContent = "⚠ 冲突需要处理";
      else if (/同步中|等待|编辑|本地/i.test(raw)) status.textContent = "● 本地有修改 · 正在同步";
      else if (/一致|已同步|已合并/i.test(raw)) status.textContent = "☁ 已同步";
    }
  }
  const row = panel.querySelector(".gcb-row");
  if (row && !row.closest(".ux-sync-details")) {
    const details = document.createElement("details");
    details.className = "ux-sync-details";
    details.innerHTML = `<summary>同步详情</summary>`;
    row.before(details);
    details.appendChild(row);
  }
}

function rawIdentityConfig(form) {
  const kind = form?.dataset.globalForm;
  const map = { language: "trackKey", visual: "visualMasterKey", variant: "variantKey", channel: "channelKey", package: "packageKey" };
  return { kind, name: map[kind] || "" };
}

function identityValue(form, kind) {
  if (kind === "language") {
    const lang = safeKey(form.elements.languageCode?.value || "LANG");
    return form.elements.isSource?.checked ? `${lang}_SOURCE` : lang;
  }
  if (kind === "visual") {
    const shared = form.elements.uxShareVisualMaster?.checked !== false;
    return shared ? "VM_MAIN" : `VM_${safeKey(form.elements.label?.value || "MAIN")}`;
  }
  if (kind === "variant") {
    const tracks = [...form.querySelectorAll('[name="languageTrackIds"]:checked')].map((input) => safeKey(input.closest("label")?.textContent || input.value));
    return `VARIANT_${safeKey(form.elements.market?.value || "GLOBAL")}_${safeKey(form.elements.format?.value || "OUTPUT")}_${safeKey(tracks.join("_") || "LANG")}`;
  }
  if (kind === "channel") {
    const platform = form.elements.platformId?.selectedOptions?.[0]?.textContent || "PLATFORM";
    return `${safeKey(platform)}_${safeKey(form.elements.market?.value || "GLOBAL")}`;
  }
  if (kind === "package") {
    const variant = form.elements.variantId?.selectedOptions?.[0]?.textContent || "VARIANT";
    const channel = form.elements.channelId?.selectedOptions?.[0]?.textContent || "CHANNEL";
    return `PKG_${safeKey(variant)}_${safeKey(channel)}_R1`;
  }
  return "AUTO";
}

function enhanceIdentityForms() {
  const setup = document.querySelector("#globalProduction .global-setup");
  if (!setup?.open) return;
  for (const form of setup.querySelectorAll("[data-global-form]")) {
    const { kind, name } = rawIdentityConfig(form);
    if (!name || form.dataset.uxIdentity === UX_VERSION) continue;
    const raw = form.elements[name];
    const label = raw?.closest("label");
    if (!raw || !label) continue;
    if (kind === "visual" && !form.elements.uxShareVisualMaster) {
      const shared = document.createElement("label");
      shared.className = "check-field ux-shared-visual";
      shared.innerHTML = `<input type="checkbox" name="uxShareVisualMaster" checked> 共用 Visual Master`;
      label.before(shared);
    }
    label.classList.add("ux-identity-source");
    label.setAttribute("aria-hidden", "true");
    raw.tabIndex = -1;
    const details = document.createElement("details");
    details.className = "ux-identity-settings";
    details.innerHTML = `<summary>Advanced Identity Settings</summary><label>Identity Key<input class="ux-identity-clone" type="text"></label>`;
    const clone = details.querySelector("input");
    clone.value = raw.value || identityValue(form, kind);
    raw.value ||= clone.value;
    clone.addEventListener("input", () => { raw.value = clone.value; raw.dataset.uxManual = "true"; });
    raw.addEventListener("input", () => { clone.value = raw.value; raw.dataset.uxManual = "true"; });
    form.appendChild(details);
    form.dataset.uxIdentity = UX_VERSION;
  }
}

function ensureIdentityOnSubmit(event) {
  const form = event.target.closest?.("#globalProduction [data-global-form]");
  if (!form) return;
  const { kind, name } = rawIdentityConfig(form);
  const raw = name ? form.elements[name] : null;
  if (!raw) return;
  if (raw.dataset.uxManual !== "true") raw.value = identityValue(form, kind);
  const clone = form.querySelector(".ux-identity-clone");
  if (clone) clone.value = raw.value;
}

function laneGroup(lane) {
  const title = lane.querySelector("h4")?.textContent || "";
  if (/Language/i.test(title)) return 1;
  if (/Visual/i.test(title)) return 2;
  if (/Variant|Publish Packages/i.test(title)) return 3;
  if (/Publications/i.test(title)) return 4;
  return 5;
}

function currentActionTarget(root, code) {
  const lockByStage = {
    PROJECT_SCOPE: "project_scope", EVIDENCE: "evidence_snapshot", MASTER_SCRIPT: "master_script",
    LANGUAGE_SCRIPT: "language_script", VOICE_TIMELINE_LOCK: "voice_timeline", VISUAL_MASTER_LOCK: "visual_master",
    PLATFORM_VARIANT_LOCK: "platform_variant", HUMAN_FINAL_REVIEW: "human_final_review", RELEASE_LOCK: "release",
  };
  if (lockByStage[code]) return root.querySelector(`[data-human-lock][data-lock-type="${lockByStage[code]}"][data-locked="true"]:not(:disabled)`);
  if (code === "LEARNING_REVIEW") return root.querySelector('[data-learning-review][data-decision="ACCEPTED"]:not(:disabled)');
  return null;
}

function setupFormForStage(code) {
  const map = { LOCALIZATION: "language", VISUAL_MASTER: "visual", VARIANT: "variant", PUBLISH_PACKAGE: "package" };
  return map[code] || "";
}

function publishUrl() {
  const projectId = document.getElementById("projectTitle")?.dataset.projectId || new URLSearchParams(location.search).get("project") || "";
  const url = new URL("../../../apps/publishing-console/", location.href);
  if (projectId) url.searchParams.set("project", projectId);
  return url.href;
}

function createSystemAction(root, code, group) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button primary ux-primary-action";
  button.textContent = group >= 4 || code === "DISTRIBUTION" ? "进入发布" : "继续当前阶段";
  button.addEventListener("click", () => {
    if (group >= 4 || code === "DISTRIBUTION") {
      const bridgePublish = [...document.querySelectorAll("#guccCreatorBridge button")].find((item) => /Publish Console/.test(item.textContent || ""));
      if (bridgePublish) bridgePublish.click();
      else location.href = publishUrl();
      return;
    }
    const kind = setupFormForStage(code);
    const setup = root.querySelector(".global-setup");
    if (kind && setup) {
      setup.open = true;
      enhanceIdentityForms();
      const form = setup.querySelector(`[data-global-form="${kind}"]`);
      form?.scrollIntoView({ behavior: "smooth", block: "center" });
      form?.querySelector("input:not(.ux-identity-clone),select,textarea")?.focus({ preventScroll: true });
      return;
    }
    root.querySelector(".ux-stage-current")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return button;
}

function renderCanonical(root) {
  const globalNext = root.querySelector(".global-next");
  if (!globalNext) return;
  const code = stageCode();
  const group = groupIndex(code);
  const title = globalNext.querySelector("strong")?.textContent?.trim() || "继续当前制作";
  const signature = `${document.getElementById("projectTitle")?.dataset.projectId || ""}::${code}::${title}`;
  const existing = root.querySelector(".ux-canonical-now");
  if (existing?.dataset.signature === signature && root.querySelector(".ux-progress-strip")) return;
  existing?.remove();
  root.querySelector(".ux-progress-strip")?.remove();
  const blockers = [...globalNext.querySelectorAll("div span")].map((node) => node.textContent?.trim()).filter(Boolean).join(" · ");
  const target = currentActionTarget(root, code);
  const human = Boolean(target || globalNext.classList.contains("human")) && code !== "DISTRIBUTION";

  const now = document.createElement("section");
  now.className = `ux-canonical-now${human ? " ux-human" : ""}`;
  now.dataset.stage = code;
  now.dataset.signature = signature;
  now.innerHTML = `<p class="ux-now-kicker">${human ? "现在需要你确认" : "现在做这个"} · ${STAGE_GROUPS[group].label}</p><h3></h3><p class="ux-now-detail"></p><div class="ux-now-actions"></div>`;
  now.querySelector("h3").textContent = title;
  now.querySelector(".ux-now-detail").textContent = blockers || (human ? "GUCC 已到达人类判断边界；只有你的点击才能通过门禁。" : "机械步骤继续由 GUCC 承担；这里只保留当前需要关注的工作。 ");
  const actions = now.querySelector(".ux-now-actions");
  if (target) {
    target.classList.add("ux-primary-action");
    target.classList.remove("tiny", "ghost");
    actions.appendChild(target);
  } else {
    actions.appendChild(createSystemAction(root, code, group));
  }
  const after = document.createElement("span");
  after.className = "ux-after";
  after.textContent = "之后：○ 主文案　○ 音频　○ 画面　○ 发布";
  actions.appendChild(after);
  root.prepend(now);

  const strip = document.createElement("div");
  strip.className = "ux-progress-strip";
  strip.setAttribute("aria-label", "Global Production progress");
  STAGE_GROUPS.forEach((item, index) => {
    const step = document.createElement("div");
    step.className = `ux-progress-step ${index < group ? "is-done" : index === group ? "is-current" : ""}`;
    step.innerHTML = `<b>${index < group ? "✓" : index === group ? "→" : "○"} ${item.label}</b>`;
    strip.appendChild(step);
  });
  now.after(strip);

  const legacy = document.getElementById("nextActionCard");
  legacy?.classList.add("ux-legacy-secondary");
}

function progressiveGlobal(root) {
  const code = stageCode();
  const group = groupIndex(code);
  for (const lane of root.querySelectorAll(".global-lane")) {
    const laneIndex = laneGroup(lane);
    lane.classList.toggle("ux-stage-current", laneIndex === group || (group === 5 && laneIndex === 4));
    lane.classList.toggle("ux-stage-collapsed", laneIndex !== group && !(group === 5 && laneIndex === 4));
  }
  let toolbar = root.querySelector(".ux-global-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "ux-global-toolbar";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "button tiny ghost";
    toggle.dataset.uxFullGlobal = "true";
    toggle.addEventListener("click", () => {
      root.classList.toggle("ux-show-full");
      toggle.textContent = root.classList.contains("ux-show-full") ? "收起完整 Global Production" : "查看完整 Global Production";
    });
    toggle.textContent = "查看完整 Global Production";
    toolbar.appendChild(toggle);
    const title = root.querySelector(".global-title");
    title?.after(toolbar);
  }
  const publicationLane = [...root.querySelectorAll(".global-lane")].find((lane) => /Publications/i.test(lane.querySelector("h4")?.textContent || ""));
  if (publicationLane && !publicationLane.querySelector(".ux-publish-readiness")) {
    const summary = document.createElement("div");
    summary.className = "ux-publish-readiness";
    summary.innerHTML = `<div><strong>Production 负责制作 Ready</strong><span>真实平台执行、最终标题简介确认、上传与发布后复盘集中在 Publish Console。</span></div><a class="button ghost" href="${publishUrl()}">进入发布</a>`;
    publicationLane.querySelector(".global-lane-head")?.after(summary);
  }
}

function enhanceProduction() {
  wrapUtilities();
  simplifySyncPanel();
  const root = document.getElementById("globalProduction");
  if (!root || !root.querySelector(".global-next")) return;
  renderCanonical(root);
  progressiveGlobal(root);
  if (root.querySelector(".global-setup")?.open) enhanceIdentityForms();
  document.body.dataset.creatorUx = UX_VERSION;
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    css();
    if (document.body?.classList.contains("portal-page")) enhancePortal();
    if (location.pathname.includes(PRODUCTION_PATH) || document.body?.classList.contains("production-system-page")) enhanceProduction();
  } finally { applying = false; }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; apply(); });
}

document.addEventListener("submit", ensureIdentityOnSubmit, true);
document.addEventListener("toggle", (event) => {
  if (event.target.matches?.("#globalProduction .global-setup") && event.target.open) enhanceIdentityForms();
}, true);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { apply(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "data-cloud", "data-project-id"] }); }, { once: true });
else { apply(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "data-cloud", "data-project-id"] }); }

export { UX_VERSION, safeKey, groupIndex, identityValue };
