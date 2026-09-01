import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";

const API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const STORE_KEY = "gucc_ai_video_production_v1";
const AUTH_STORE_KEY = "gameup_session_v5";
const root = document.getElementById("globalProduction");
const G = window.GuccCreatorGlobal;
let snapshot = null;
let loadingProjectId = "";
let refreshEpoch = 0;
let mutationInFlight = false;

const h = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const statusClass = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "-");

function currentProjectId() {
  try {
    const selectedProjectId = JSON.parse(localStorage.getItem(STORE_KEY) || "null")?.selectedProjectId;
    return selectedProjectId || new URLSearchParams(location.search).get("project") || "";
  } catch { return new URLSearchParams(location.search).get("project") || ""; }
}
function loggedIn() { const session = getSession(); return Boolean(session?.access_token || session?.refresh_token); }
async function api(action, payload = {}) {
  const token = await getAccessToken();
  const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...payload }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Creator API ${response.status}`);
  return result;
}
function toast(message, error = false) {
  const target = document.getElementById("toast"); if (!target) return;
  target.textContent = message; target.className = `toast show${error ? " error" : ""}`;
  setTimeout(() => { target.className = "toast"; }, 3600);
}
function pill(value) { return `<span class="global-pill ${statusClass(value)}">${h(value || "DRAFT")}</span>`; }
function projectLock(name, lockType, lockedAt) {
  return `<button class="button tiny ${lockedAt ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="project" data-scope-id="${h(snapshot.project.project_id)}" data-lock-type="${h(lockType)}" data-revision="${Number(snapshot.project.global_revision || 1)}" data-locked="${lockedAt ? "false" : "true"}">${lockedAt ? `✓ ${h(name)} · 解锁` : h(name)}</button>`;
}
function languageCard(track) {
  const artifacts = G.filesForScope(snapshot, "language_track", track.language_track_id); const timeline = G.timelineReadiness(track, artifacts);
  return `<article class="global-entity-card">
    <div class="global-card-head"><div><strong>${h(track.track_key)}</strong><small>${h(track.language_code)} · r${Number(track.revision || 1)}</small></div>${pill(track.status)}</div>
    <p>${timeline.ready ? "真实音频 Timeline 已验证" : `缺少：${h([...timeline.missing, ...(!timeline.realAudio ? ["REAL_AUDIO"] : []), ...(!timeline.aligned ? ["ALIGNMENT"] : [])].join(" / ") || "人工 Lock")}`}</p>
    <div class="inline-actions">
      <button class="button tiny ${track.script_locked_at ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="language_track" data-scope-id="${track.language_track_id}" data-lock-type="language_script" data-revision="${Number(track.revision || 1)}" data-locked="${track.script_locked_at ? "false" : "true"}">${track.script_locked_at ? "✓ Script Lock · 解锁" : "Script Lock"}</button>
      <button class="button tiny ${track.voice_timeline_locked_at ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="language_track" data-scope-id="${track.language_track_id}" data-lock-type="voice_timeline" data-revision="${Number(track.revision || 1)}" data-locked="${track.voice_timeline_locked_at ? "false" : "true"}">${track.voice_timeline_locked_at ? "✓ Voice / Timeline · 解锁" : "Voice / Timeline Lock"}</button>
    </div>
  </article>`;
}
function visualCard(visual) {
  const segments = (snapshot.visualSegments || []).filter((row) => row.visual_master_id === visual.visual_master_id);
  return `<article class="global-entity-card">
    <div class="global-card-head"><div><strong>${h(visual.visual_master_key)}</strong><small>${segments.length} semantic anchors · r${Number(visual.revision || 1)}</small></div>${pill(visual.status)}</div>
    <div class="global-lock-line"><span class="${visual.visual_locked_at ? "is-on" : ""}">Visual</span><span class="${visual.edit_plan_locked_at ? "is-on" : ""}">Edit Plan</span><span class="${visual.master_render_locked_at ? "is-on" : ""}">Master Render</span></div>
    <div class="inline-actions">
      ${[["visual_master", "Visual Master", visual.visual_locked_at], ["edit_plan", "Edit Plan", visual.edit_plan_locked_at], ["master_render", "Master Render", visual.master_render_locked_at]].map(([key, label, on]) => `<button class="button tiny ${on ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="visual_master" data-scope-id="${visual.visual_master_id}" data-lock-type="${key}" data-revision="${Number(visual.revision || 1)}" data-locked="${on ? "false" : "true"}">${on ? `✓ ${label} · 解锁` : `${label} Lock`}</button>`).join("")}
    </div>
  </article>`;
}
function variantCard(variant) {
  const visual = (snapshot.visualMasters || []).find((item) => item.visual_master_id === variant.visual_master_id);
  const tracks = (snapshot.variantLanguageTracks || []).filter((item) => item.variant_id === variant.variant_id).map((item) => snapshot.languageTracks.find((track) => track.language_track_id === item.language_track_id)?.track_key).filter(Boolean);
  const packages = (snapshot.publishPackages || []).filter((item) => item.variant_id === variant.variant_id);
  return `<article class="global-entity-card"><div class="global-card-head"><div><strong>${h(variant.variant_key)}</strong><small>${h(variant.market || "Global")} · ${h(variant.format || "未设置格式")}</small></div>${pill(variant.status)}</div><p>Visual · ${h(visual?.visual_master_key || "未关联")}<br>Language · ${h(tracks.join(" + ") || "未编排")}</p><small>${packages.length} Publish Package</small></article>`;
}
function packageCard(pkg) {
  const variant = (snapshot.variants || []).find((item) => item.variant_id === pkg.variant_id);
  const locked = Boolean(pkg.platform_locked_at); const qaCurrent = pkg.qa_status === "PASS" && Number(pkg.qa_package_revision) === Number(pkg.package_revision);
  return `<article class="global-entity-card">
    <div class="global-card-head"><div><strong>${h(pkg.package_key)}</strong><small>${h(variant?.variant_key)} · package r${Number(pkg.package_revision)}</small></div>${pill(pkg.validation_status)}</div>
    <div class="global-lock-line"><span class="${locked ? "is-on" : ""}">Platform</span><span class="${qaCurrent ? "is-on" : ""}">AI QA</span><span class="${pkg.human_reviewed_at ? "is-on" : ""}">Human Review</span><span class="${pkg.release_locked_at ? "is-on" : ""}">Release</span></div>
    ${(pkg.validation_errors || []).length ? `<p class="global-blocked">${h(pkg.validation_errors.join(" · "))}</p>` : ""}
    <div class="inline-actions">
      <button class="button tiny ${locked ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="publish_package" data-scope-id="${pkg.publish_package_id}" data-lock-type="platform_variant" data-revision="${Number(pkg.package_revision)}" data-locked="${locked ? "false" : "true"}">${locked ? "✓ Platform Lock · 解锁" : "Platform Lock"}</button>
      <button class="button tiny ghost" type="button" data-run-qa="${pkg.publish_package_id}" ${locked ? "" : "disabled"}>运行 AI QA</button>
      <button class="button tiny ${pkg.human_reviewed_at ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="publish_package" data-scope-id="${pkg.publish_package_id}" data-lock-type="human_final_review" data-revision="${Number(pkg.package_revision)}" data-locked="true" ${qaCurrent && !pkg.human_reviewed_at ? "" : "disabled"}>${pkg.human_reviewed_at ? "✓ 最终精修" : "确认最终精修"}</button>
      <button class="button tiny ${pkg.release_locked_at ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="publish_package" data-scope-id="${pkg.publish_package_id}" data-lock-type="release" data-revision="${Number(pkg.package_revision)}" data-locked="true" ${pkg.human_reviewed_at && !pkg.release_locked_at ? "" : "disabled"}>${pkg.release_locked_at ? "✓ Release Lock" : "Release Lock"}</button>
      <button class="button tiny ghost" type="button" data-create-publication="${pkg.publish_package_id}" ${pkg.release_locked_at ? "" : "disabled"}>创建 Publication</button>
    </div>
  </article>`;
}
function publicationCard(publication) {
  const confirmed = Boolean(publication.final_publish_confirmed_at);
  const distributionStarted = ["SCHEDULED", "PUBLISHING", "PUBLISHED"].includes(publication.status);
  const canConfirm = !confirmed && ["READY_TO_PUBLISH", "RETRY", "REPOST"].includes(publication.status);
  const canWithdraw = confirmed && !distributionStarted;
  return `<article class="global-entity-card"><div class="global-card-head"><div><strong>${h(publication.publication_mode)} Publication</strong><small>${h(publication.post_url || publication.publication_id)}</small></div>${pill(publication.status)}</div><div class="inline-actions">
    <button class="button tiny ${confirmed ? "ghost" : "primary"}" type="button" data-human-lock data-scope-type="publication" data-scope-id="${publication.publication_id}" data-lock-type="final_publish_confirmation" data-revision="${Number(publication.revision || 1)}" data-locked="${confirmed ? "false" : "true"}" ${canConfirm || canWithdraw ? "" : "disabled"}>${confirmed ? (canWithdraw ? "✓ 已确认发布 · 撤回" : "✓ 已确认发布") : "最终发布确认"}</button>
    <button class="button tiny ghost" type="button" data-record-published="${publication.publication_id}" ${publication.final_publish_confirmed_at && publication.status !== "PUBLISHED" ? "" : "disabled"}>登记已发布</button>
    <button class="button tiny ghost" type="button" data-publication-copy="${publication.publication_id}" data-mode="RETRY">Retry</button>
    <button class="button tiny ghost" type="button" data-publication-copy="${publication.publication_id}" data-mode="REPOST">Repost</button>
  </div></article>`;
}

function setupForms() {
  const visualOptions = (snapshot.visualMasters || []).map((item) => `<option value="${item.visual_master_id}">${h(item.visual_master_key)}</option>`).join("");
  const platformOptions = (snapshot.platforms || []).map((item) => `<option value="${item.id}">${h(item.name)}</option>`).join("");
  const variantOptions = (snapshot.variants || []).map((item) => `<option value="${item.variant_id}">${h(item.variant_key)}</option>`).join("");
  const channelOptions = (snapshot.channels || []).map((item) => `<option value="${item.channel_id}">${h(item.name)} · ${h(item.market)}</option>`).join("");
  const presentationOptions = (snapshot.platformPresentations || []).map((item) => `<option value="${item.presentation_id}" data-variant="${item.variant_id}">${h((snapshot.variants || []).find((v) => v.variant_id === item.variant_id)?.variant_key)} · ${h(item.title || "Presentation")}</option>`).join("");
  const outputOptions = (snapshot.scopedArtifacts || []).filter((item) => item.artifact_scope_type === "variant").map((item) => `<option value="${item.id}" data-variant="${item.artifact_scope_id}" data-file-key="${h(item.file_key)}" data-path="${h(item.relative_path)}" data-checksum="${h(item.checksum || "")}">${h(item.file_key)} · ${h(item.relative_path)}</option>`).join("");
  return `<details class="global-setup"><summary>建立 / 编排 Global Production</summary><div class="global-form-grid">
    <form data-global-form="language"><h4>Language Track</h4><label>Track Key<input name="trackKey" placeholder="ZH_SOURCE / JA / EN" required></label><label>Language Code<input name="languageCode" placeholder="zh-CN / ja / en" required></label><label>Label<input name="label"></label><label class="check-field"><input name="isSource" type="checkbox"> Source Track</label><button class="button primary" type="submit">添加 Language</button></form>
    <form data-global-form="visual"><h4>Visual Master</h4><label>Key<input name="visualMasterKey" value="VM_MAIN" required></label><label>Label<input name="label" value="Unified Visual Master"></label><button class="button primary" type="submit">建立 Visual Master</button></form>
    <form data-global-form="variant"><h4>Variant Composition</h4><label>Key<input name="variantKey" placeholder="YOUTUBE_GLOBAL_LONG" required></label><label>Visual Master<select name="visualMasterId" required>${visualOptions}</select></label><label>Market<input name="market" value="Global"></label><label>Format<input name="format" placeholder="16:9 long / 9:16 short"></label><fieldset><legend>Language Tracks</legend>${(snapshot.languageTracks || []).map((track) => `<label class="check-field"><input type="checkbox" name="languageTrackIds" value="${track.language_track_id}"> ${h(track.track_key)}</label>`).join("") || "<small>先建立 Language Track</small>"}</fieldset><button class="button primary" type="submit">建立 Variant</button></form>
    <form data-global-form="channel"><h4>Channel</h4><label>Platform<select name="platformId" required>${platformOptions}</select></label><label>Key<input name="channelKey" placeholder="YOUTUBE_GLOBAL" required></label><label>Name<input name="name" placeholder="YouTube Global" required></label><label>Market<input name="market" value="Global"></label><button class="button primary" type="submit">保存 Channel</button></form>
    <form data-global-form="presentation"><h4>Platform Presentation</h4><label>Variant<select name="variantId" required>${variantOptions}</select></label><label>Platform<select name="platformId" required>${platformOptions}</select></label><label>Title<input name="title" required></label><label>Description<textarea name="description" rows="2"></textarea></label><button class="button primary" type="submit">保存 Presentation</button></form>
    <form data-global-form="package"><h4>Publish Package</h4><label>Key<input name="packageKey" placeholder="YT_GLOBAL_R1" required></label><label>Variant<select name="variantId" required>${variantOptions}</select></label><label>Presentation<select name="presentationId" required>${presentationOptions}</select></label><label>Channel<select name="channelId" required>${channelOptions}</select></label><label>Variant Output<select name="outputArtifactId" required>${outputOptions}</select></label><button class="button primary" type="submit">验证并保存 Package</button></form>
  </div></details>`;
}

function render() {
  if (!root || !snapshot) return;
  const summary = G.globalSummary(snapshot); const action = summary.nextAction;
  root.innerHTML = `<div class="section-title global-title"><div><p class="eyebrow">GLOBAL PRODUCTION V1</p><h3>一个 Project · 多语言 · 统一 Visual · 多 Variant</h3></div><button class="button tiny ghost" type="button" data-global-refresh>刷新云状态</button></div>
    <div class="global-next ${action.humanRequired ? "human" : "system"}"><div><small>${h(action.stage)} · ${h(action.owner)}</small><strong>${h(action.title)}</strong>${action.blockers?.length ? `<span>Blocked · ${h(action.blockers.join(" / "))}</span>` : ""}</div><span>${action.humanRequired ? "需要你的判断" : "GUCC / Codex 可继续"}</span></div>
    <div class="global-metrics"><div><span>Language</span><strong>${summary.readyLanguageTracks}/${summary.languageTracks}</strong></div><div><span>Visual Master</span><strong>${summary.visualMasters}</strong></div><div><span>Variants</span><strong>${summary.variants}</strong></div><div><span>QA PASS</span><strong>${summary.packageQaPass}</strong></div><div><span>Published</span><strong>${summary.published}</strong></div><div><span>Learning</span><strong>${summary.acceptedLearnings}</strong></div></div>
    <div class="global-project-gates"><strong>Project Human Gates</strong><div class="inline-actions">${projectLock("Project Scope", "project_scope", snapshot.project.project_scope_locked_at)}${projectLock("Evidence Snapshot", "evidence_snapshot", snapshot.project.evidence_locked_at)}${projectLock("Master Script", "master_script", snapshot.project.master_script_locked_at)}</div></div>
    <section class="global-lane"><div class="global-lane-head"><h4>Language Tracks</h4><small>独立 Script / Real Audio / Timeline</small></div><div class="global-card-grid">${(snapshot.languageTracks || []).map(languageCard).join("") || "<p class='muted'>尚无 Language Track。</p>"}</div></section>
    <section class="global-lane"><div class="global-lane-head"><h4>Visual Master</h4><small>Semantic Anchor → 每语言真实时间投影</small></div><div class="global-card-grid">${(snapshot.visualMasters || []).map(visualCard).join("") || "<p class='muted'>尚无 Visual Master。</p>"}</div></section>
    <section class="global-lane"><div class="global-lane-head"><h4>Variants</h4><small>Variant ≠ Language ≠ Channel</small></div><div class="global-card-grid">${(snapshot.variants || []).map(variantCard).join("") || "<p class='muted'>尚无 Variant。</p>"}</div></section>
    <section class="global-lane"><div class="global-lane-head"><h4>Publish Packages · QA · Release</h4><small>Release Lock 后快照不可静默修改</small></div><div class="global-card-grid">${(snapshot.publishPackages || []).map(packageCard).join("") || "<p class='muted'>尚无 Publish Package。</p>"}</div></section>
    <section class="global-lane"><div class="global-lane-head"><h4>Publications · Analytics · Learning</h4><small>${(snapshot.metricSnapshots || []).length} metrics · ${(snapshot.performanceReports || []).length} reports · ${(snapshot.learnings || []).length} learnings</small></div><div class="global-card-grid">${(snapshot.publications || []).map(publicationCard).join("") || "<p class='muted'>Release Lock 后在这里创建 Publication；真实外部发布仍由你确认。</p>"}</div>${learningReview()}</section>
    ${setupForms()}`;
}
function learningReview() {
  const proposals = (snapshot.learnings || []).filter((item) => item.status === "PROPOSED");
  if (!proposals.length) return "";
  return `<div class="global-learning-list">${proposals.map((item) => `<article><strong>${h(item.learning_key)}</strong><p>${h(JSON.stringify(item.proposal))}</p><button class="button tiny primary" data-learning-review="${item.learning_id}" data-decision="ACCEPTED">接受</button><button class="button tiny ghost" data-learning-review="${item.learning_id}" data-decision="REJECTED">拒绝</button></article>`).join("")}</div>`;
}

async function refresh(force = false) {
  if (!root || !G) return;
  const projectId = currentProjectId();
  if (!projectId) { refreshEpoch += 1; loadingProjectId = ""; snapshot = null; root.removeAttribute("aria-busy"); root.innerHTML = `<p class="muted">选择一个 Project 后读取 Global Production。</p>`; return; }
  if (!loggedIn()) {
    refreshEpoch += 1;
    loadingProjectId = "";
    snapshot = null;
    root.removeAttribute("aria-busy");
    root.innerHTML = `<div class="global-auth-needed"><p class="muted">登录 Command Center 后启用 Global Production 云状态与人工锁。</p><div class="inline-actions"><a class="button tiny primary" href="../../../apps/command-center/" target="_blank" rel="noopener">打开 Command Center 登录</a><button class="button tiny ghost" type="button" data-global-refresh>我已登录，重试</button></div></div>`;
    return;
  }
  if (loadingProjectId === projectId && !force) return;
  const epoch = ++refreshEpoch;
  loadingProjectId = projectId; root.setAttribute("aria-busy", "true");
  try {
    const nextSnapshot = await api("getProject", { projectId });
    if (epoch === refreshEpoch && currentProjectId() === projectId) { snapshot = nextSnapshot; render(); }
  }
  catch (error) {
    if (epoch === refreshEpoch) root.innerHTML = `<div class="global-error"><strong>Global Production 暂时不可用</strong><p>${h(error.message)}</p><button class="button tiny ghost" data-global-refresh>重试</button></div>`;
  }
  finally { if (epoch === refreshEpoch) root.removeAttribute("aria-busy"); }
}
async function mutate(action, payload, success) {
  if (mutationInFlight) return;
  mutationInFlight = true;
  root?.setAttribute("aria-busy", "true");
  try { await api(action, { projectId: snapshot.project.project_id, ...payload }); toast(success); await refresh(true); }
  catch (error) { toast(error.message, true); }
  finally { mutationInFlight = false; root?.removeAttribute("aria-busy"); }
}

root?.addEventListener("click", async (event) => {
  if (event.target.closest("[data-global-refresh]")) return refresh(true);
  const gate = event.target.closest("[data-human-lock]");
  if (gate) {
    const locking = gate.dataset.locked !== "false";
    if (!confirm(`${locking ? "确认设置" : "确认重新打开"} ${gate.dataset.lockType}？\n\n这是人工门禁，GUCC / AI 不会代替你点击。`)) return;
    const reason = prompt("记录这次人工决定的原因：", locking ? "Human reviewed and confirmed" : "Human explicitly reopened for revision"); if (!reason?.trim()) return;
    return mutate("humanLock", { scopeType: gate.dataset.scopeType, scopeId: gate.dataset.scopeId, lockType: gate.dataset.lockType, expectedRevision: Number(gate.dataset.revision), locked: locking, reason, source: "human_ui", humanConfirmed: true }, "人工门禁已记录");
  }
  const qa = event.target.closest("[data-run-qa]"); if (qa) return mutate("runAiQa", { publishPackageId: qa.dataset.runQa, findings: [], modelMetadata: { runner: "gucc-ui-deterministic-v1" } }, "AI QA 已完成");
  const createPublication = event.target.closest("[data-create-publication]"); if (createPublication) return mutate("savePublication", { publishPackageId: createPublication.dataset.createPublication, publicationMode: "INITIAL", status: "READY_TO_PUBLISH" }, "Publication 已建立；正式发布仍需你的最终确认");
  const record = event.target.closest("[data-record-published]");
  if (record) {
    const publication = snapshot.publications.find((item) => item.publication_id === record.dataset.recordPublished); const postId = prompt("平台 Post ID：", publication.post_id || ""); if (!postId) return;
    const postUrl = prompt("正式作品 https URL：", publication.post_url || "https://"); if (!postUrl) return;
    return mutate("savePublication", { publicationId: publication.publication_id, expectedRevision: Number(publication.revision), status: "PUBLISHED", postId, postUrl, publishedAt: new Date().toISOString() }, "正式发布记录已保存");
  }
  const copy = event.target.closest("[data-publication-copy]");
  if (copy) {
    const source = snapshot.publications.find((item) => item.publication_id === copy.dataset.publicationCopy); const mode = copy.dataset.mode;
    return mutate("savePublication", { publishPackageId: source.publish_package_id, publicationMode: mode, status: "READY_TO_PUBLISH", [`${mode.toLowerCase()}OfPublicationId`]: source.publication_id }, `${mode} Publication 已建立`);
  }
  const learning = event.target.closest("[data-learning-review]");
  if (learning) {
    if (!confirm(`${learning.dataset.decision === "ACCEPTED" ? "接受" : "拒绝"}这条 Learning Proposal？只有接受后才会反馈到后续项目。`)) return;
    return mutate("reviewLearning", { learningId: learning.dataset.learningReview, decision: learning.dataset.decision, reviewNote: "Reviewed in GUCC Global Production UI", source: "human_ui", humanConfirmed: true }, "Learning 决定已记录");
  }
});

root?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-global-form]"); if (!form) return;
  event.preventDefault(); const data = new FormData(form); const kind = form.dataset.globalForm;
  if (kind === "language") return mutate("saveLanguageTrack", { trackKey: data.get("trackKey"), languageCode: data.get("languageCode"), label: data.get("label"), isSource: data.get("isSource") === "on", status: "DRAFT" }, "Language Track 已建立");
  if (kind === "visual") return mutate("saveVisualMaster", { visualMasterKey: data.get("visualMasterKey"), label: data.get("label"), status: "DRAFT" }, "Visual Master 已建立");
  if (kind === "variant") {
    const languageTracks = data.getAll("languageTrackIds").map((languageTrackId) => ({ languageTrackId }));
    return mutate("saveVariant", { variantKey: data.get("variantKey"), visualMasterId: data.get("visualMasterId"), market: data.get("market"), format: data.get("format"), status: "DRAFT", languageTracks }, "Variant Composition 已建立");
  }
  if (kind === "channel") return mutate("saveChannel", { platformId: data.get("platformId"), channelKey: data.get("channelKey"), name: data.get("name"), market: data.get("market") }, "Channel 已保存");
  if (kind === "presentation") return mutate("savePlatformPresentation", { variantId: data.get("variantId"), platformId: data.get("platformId"), title: data.get("title"), description: data.get("description"), exportProfile: { source: "variant_manifest" } }, "Platform Presentation 已保存");
  if (kind === "package") {
    const variantId = String(data.get("variantId")); const artifact = form.elements.outputArtifactId.selectedOptions[0];
    if (artifact?.dataset.variant !== variantId) return toast("Variant Output 必须属于所选 Variant", true);
    const tracks = (snapshot.variantLanguageTracks || []).filter((item) => item.variant_id === variantId).map((item) => item.language_track_id);
    const presentationId = String(data.get("presentationId")); const channelId = String(data.get("channelId"));
    return mutate("savePublishPackage", { packageKey: data.get("packageKey"), variantId, presentationId, channelId, packageManifest: { variantId, presentationId, channelId, languageTrackIds: tracks, outputArtifact: { scopeType: "variant", scopeId: variantId, fileKey: artifact.dataset.fileKey, relativePath: artifact.dataset.path, checksum: artifact.dataset.checksum }, exportProfile: { source: "platform_presentation" } } }, "Publish Package 已验证并保存");
  }
});

const title = document.getElementById("projectTitle");
if (title) new MutationObserver(() => { const projectId = currentProjectId(); if (projectId !== loadingProjectId) refresh(true); }).observe(title, { childList: true });
window.addEventListener("storage", (event) => {
  if (event.key !== AUTH_STORE_KEY) return;
  loadingProjectId = "";
  refresh(true);
});
refresh(true);
