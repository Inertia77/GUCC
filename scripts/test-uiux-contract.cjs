const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const shell = read('assets/gucc-shell.js');
const shellCss = read('assets/gucc-shell-nav-v2.css');
const workspaceFixes = read('assets/gucc-workspace-fixes-v1.css');
const floatingDocks = read('assets/gucc-floating-docks-v1.css');
const coverFixes = read('assets/gucc-cover-workspace-fixes-v1.css');
const productionHtml = read('apps/video-workspace/production-system/index.html');
const productionCss = read('apps/video-workspace/production-system/styles.css');
const accessGuard = read('assets/access-guard.js');
const portal = read('index.html');
const dashboard = read('assets/creator-dashboard.mjs');
const creatorUx = read('assets/creator-ux-simplification-v1.mjs');
const creatorUxCloseout = read('assets/creator-ux-simplification-v1-closeout.mjs');
const serviceWorker = read('sw.js');
const uxBrowser = read('scripts/test-creator-ux-browser.cjs');

assert.match(shell, /production:\s*\{/m, 'Global shell must expose Production as a creator destination.');
assert.match(shell, /items:\s*\[childRoutes\.workspace, childRoutes\.production, childRoutes\.cover, childRoutes\.publish\]/, 'Creator menu must follow Studio → Production → Cover → Publish.');
assert.match(shell, /8 个核心区域 · 直接进入/, 'Portal enhancer must promote Production into the core launcher.');
assert.match(shell, /dataset\.shellVersion = '4'/, 'Shell version must invalidate stale navigation DOM.');
assert.match(shellCss, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/, 'Mobile global shell must keep exactly five primary slots.');
assert.match(shellCss, /data-group="create"[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/, 'Four creator destinations should render as a 2×2 menu.');

for (const [name, css] of [
  ['workspace fixes', workspaceFixes],
  ['floating docks', floatingDocks],
  ['cover fixes', coverFixes],
]) {
  assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(6,/, `${name} must not resurrect the obsolete six-slot global dock.`);
}

assert.match(workspaceFixes, /font-size:\s*16px !important/, 'Workspace phone editors must avoid iOS focus zoom.');
assert.match(workspaceFixes, /:has\(#structureFloatingNav\.show\)/, 'Workspace must reserve extra bottom space when structure navigation is visible.');
assert.match(coverFixes, /"workspace"\s*\n\s*"inspector"\s*\n\s*"materials"/, 'Cover mobile flow must put the inspector immediately after the canvas.');
assert.match(coverFixes, /font-size:\s*16px !important/, 'Cover phone editors must avoid iOS focus zoom.');
assert.match(floatingDocks, /@media \(min-width: 1024px\)[\s\S]*body\.cover-generator-page \.gucc-shell-dock[\s\S]*right: 10px !important;[\s\S]*top: 50% !important;/, 'Cover desktop must use the same right-side global navigation rail as other desktop work surfaces.');

assert.match(productionHtml, /data-root="\.\.\/\.\.\/\.\.\/" data-guard="true"/, 'Production must resolve the GUCC root explicitly.');
assert.match(productionHtml, /rel="icon"[^>]+\.\.\/\.\.\/\.\.\/assets\/icons\/gucc-icon\.svg/, 'Production must declare the shared GUCC favicon instead of requesting a missing root favicon.ico.');
assert.match(productionHtml, /class="gucc-enhanced production-system-page"/, 'Production must identify itself for responsive shell rules.');
assert.match(productionHtml, /creator-ux-simplification-v1\.mjs\?v=1/, 'Production must load the Creator UX simplification layer.');
assert.match(productionHtml, /creator-ux-simplification-v1-closeout\.mjs\?v=1/, 'Production must load the Creator UX closeout refinements.');
assert.match(productionCss, /@media\(max-width:700px\)\{\.app-shell\{grid-template-columns:minmax\(0,1fr\)\}\.sidebar,\.project-list\{min-width:0\}\}/, 'Production phone layout must prevent the horizontal project rail from widening the page grid.');
assert.match(productionCss, /\.button\.tiny\.primary\{color:#061014!important\}/, 'Production primary micro-actions must keep readable text on the mint/cyan surface.');
assert.match(accessGuard, /creator-pipeline-ux\.mjs/, 'Creator pipeline UX integration must be bootstrapped on eligible pages.');
assert.match(portal, /id="creatorDashboard"/, 'Portal must include the integrated Creator Dashboard.');
assert.match(portal, /creator-dashboard\.mjs/, 'Portal must load the Creator Dashboard module.');
assert.match(dashboard, /buildCreatorDashboard/, 'Creator Dashboard must use the shared health and action queue core.');
assert.match(dashboard, /\?project=/, 'Creator Dashboard project links must deep-link to the selected project.');
assert.match(dashboard, /creator-ux-simplification-v1\.mjs\?v=1/, 'Portal dashboard must share the same Creator UX simplification layer as Production.');
assert.match(dashboard, /creator-ux-simplification-v1-closeout\.mjs\?v=1/, 'Portal dashboard must load the same Creator UX closeout refinements as Production.');

assert.match(creatorUx, /creator-top-action/, 'Portal must visually promote exactly the ranked Top 1 action.');
assert.match(creatorUx, /creator-next-queue/, 'Secondary dashboard actions must be progressively disclosed under Next.');
assert.match(creatorUx, /ux-canonical-now/, 'Production must render one canonical user next-action surface.');
assert.match(creatorUx, /#nextActionCard\.ux-legacy-secondary\{display:none!important\}/, 'Legacy Next Action must not compete visually with the canonical Global action.');
assert.match(creatorUx, /现在需要你确认/, 'Human gates must use the unified human-decision copy.');
assert.match(creatorUx, /currentActionTarget/, 'Canonical human decisions must reuse the existing human-gate controls instead of inventing a second gate engine.');
assert.match(creatorUx, /查看完整 Global Production/, 'Global Production must use progressive disclosure with an explicit full-view escape hatch.');
assert.match(creatorUx, /Advanced Identity Settings/, 'Raw identity controls must live behind Advanced Identity Settings.');
assert.match(creatorUx, /identityValue\(/, 'Raw identity keys must be generated deterministically by the UI layer.');
assert.match(creatorUx, /Production 负责制作 Ready/, 'Production must describe readiness rather than acting as a second Publish Console.');
assert.match(creatorUx, /真实平台执行、最终标题简介确认、上传与发布后复盘集中在 Publish Console/, 'Real publish execution must remain conceptually concentrated in Publish Console.');
assert.match(creatorUx, /同步详情/, 'Manual sync controls must be progressive disclosure rather than default primary actions.');
assert.match(creatorUx, /min-height:44px/, 'Touch targets must retain a 44px minimum in the simplified UI.');
assert.match(creatorUx, /font-size:16px!important/, 'Production phone inputs must avoid sub-16px focus zoom.');
assert.doesNotMatch(creatorUx, /creatorApi\(|saveProject\(|humanLock\s*\(/, 'The UX simplification layer must not introduce its own persistence or human-lock mutation path.');

assert.match(creatorUxCloseout, /Legacy Workflow Detail/, 'Legacy compatibility state and gates must remain available only through Advanced disclosure.');
assert.match(creatorUxCloseout, /\[data-human-lock\]:not\(\.ux-primary-action\)/, 'Default Global view must hide non-current Human Gates.');
assert.match(creatorUxCloseout, /\[data-create-publication\]/, 'Production must suppress Publication execution controls even when advanced Global detail is open.');
assert.match(creatorUxCloseout, /Raw language identity must not|LANGUAGE_NAMES|日语版/, 'Technical language identity must be demoted behind a human-facing label.');
assert.match(creatorUxCloseout, /ux-setup-scoped/, 'Global Setup must disclose only forms relevant to the current stage by default.');
assert.match(creatorUxCloseout, /○ 仅本地 · 登录后同步/, 'Unauthenticated local mode must not be mislabeled as a dirty sync state.');
assert.match(creatorUxCloseout, /当前阶段 ·/, 'Production hero must expose a friendly current stage.');
assert.doesNotMatch(creatorUxCloseout, /creatorApi\(|saveProject\(|humanLock\s*\(/, 'Closeout refinements must remain presentation-only and introduce no persistence/gate mutation path.');

assert.match(uxBrowser, /390, 844/, 'Creator UX browser acceptance must cover 390×844.');
assert.match(uxBrowser, /768, 1024/, 'Creator UX browser acceptance must cover 768×1024.');
assert.match(uxBrowser, /1440, 900/, 'Creator UX browser acceptance must cover 1440×900.');
assert.match(uxBrowser, /Human Gate must never auto-fire/, 'Creator UX browser acceptance must protect human-only gates.');
assert.match(uxBrowser, /first fold/, 'Creator UX browser acceptance must verify current-task-first mobile hierarchy.');
assert.match(uxBrowser, /saveProject/, 'Creator UX browser acceptance must prove read/navigation smoke creates no Project write.');

assert.match(serviceWorker, /gucc-static-v27/, 'PWA cache must advance when the Creator UX closeout shell changes.');
assert.match(serviceWorker, /creator-ux-simplification-v1\.mjs\?v=1/, 'Creator UX simplification must remain available in the offline app shell.');
assert.match(serviceWorker, /creator-ux-simplification-v1-closeout\.mjs\?v=1/, 'Creator UX closeout refinements must remain available in the offline app shell.');

console.log('UIUX contract checks passed.');