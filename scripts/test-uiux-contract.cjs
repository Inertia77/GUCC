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
const accessGuard = read('assets/access-guard.js');
const portal = read('index.html');
const dashboard = read('assets/creator-dashboard.mjs');

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
assert.match(accessGuard, /creator-pipeline-ux\.mjs/, 'Creator pipeline UX integration must be bootstrapped on eligible pages.');
assert.match(portal, /id="creatorDashboard"/, 'Portal must include the integrated Creator Dashboard.');
assert.match(portal, /creator-dashboard\.mjs/, 'Portal must load the Creator Dashboard module.');
assert.match(dashboard, /buildCreatorDashboard/, 'Creator Dashboard must use the shared health and action queue core.');
assert.match(dashboard, /\?project=/, 'Creator Dashboard project links must deep-link to the selected project.');

console.log('UIUX contract checks passed.');
