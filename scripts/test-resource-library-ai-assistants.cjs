"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const html = read("reference/resource-library.html");
const js = read("reference/resource-library.js");
const css = read("assets/resource-library-compact-v1.css");

assert.match(html, /AI ANALYSIS ASSISTANTS/);
assert.match(html, /id="projectsHeading">AI 分析辅助</);
assert.match(html, /<span>AI 分析<\/span><strong>4<\/strong>/);
assert.doesNotMatch(html, /CHARACTER MASTER CONTROL/);
assert.doesNotMatch(html, /id="projectsHeading">二游角色总控</);

assert.match(html, /class="view-switch is-active"[^>]*data-view="projects"[^>]*aria-pressed="true"/, "AI analysis must be the default active tab.");
assert.match(html, /id="officialPanel"[^>]*hidden/, "Official references should not be the initial panel.");
assert.match(html, /id="projectsPanel"[^>]*aria-labelledby="projectsHeading">/, "AI analysis panel should be initially visible.");
assert.match(html, /id="gameFilters" hidden/, "Game filters should be hidden in the default AI view.");
assert.doesNotMatch(html, /resource-library-onmyoji\.js/, "Onmyoji must be integrated into the canonical library instead of injected by a second runtime.");
assert.match(js, /const state = \{ view: 'projects'/, "AI analysis must be the JS default view.");
assert.match(js, /'阴': \{ name: '阴阳师'/, "Onmyoji must be registered as a canonical game.");
assert.match(js, /key: '阴'[\s\S]*?https:\/\/yys\.163\.com\//, "Onmyoji official route must live in officialGroups.");
assert.match(js, /if \(name\.includes\('阴阳师'\)\) return '阴'/, "Onmyoji must participate in source filtering.");
assert.match(js, /state\.view === 'projects' \|\| state\.game === 'all'\) url\.searchParams\.delete\('game'\)/, "AI analysis URLs must not carry stale game filters.");
assert.match(js, /render\(\);\s*try \{/, "Default AI launchpad must render before the leak data fetch finishes.");

const expectedProjects = [
  ["Game Assistant", "g-p-6a914917ed548191a8299e3f009aad2f"],
  ["【二游メモ】角色分析（キャラクター）", "g-p-6a8ec96a3bb4819196b66af85cbc9695"],
  ["【二游メモ】阵容分析（パーティー）", "g-p-6a8eef4bc060819197a59cf0a28209be"],
  ["【二游メモ】游戏机制（メカニズム）", "g-p-6a8fd96ffc6c81918d2e5b97c6e86c4a"]
];

for (const [name, id] of expectedProjects) {
  assert.ok(js.includes(name), `Missing AI project label: ${name}`);
  assert.ok(js.includes(id), `Missing AI project URL: ${id}`);
}

assert.match(js, /const projectAssistants = \[/);
assert.doesNotMatch(js, /const researchGroups = \[/);
assert.match(js, /projectsMode = state\.view === 'projects'/);
assert.match(js, /gameFilters\.hidden = projectsMode/);
assert.match(js, /\$\$\('\.game-filter'\)\.forEach/, 'All game-filter buttons must be iterated with $; querySelector returns only one element.');
assert.doesNotMatch(js, /(?<!\$)\$\('\.game-filter'\)\.forEach/, 'Do not call forEach on querySelector result.');
assert.match(js, /搜索 AI 分析助手/);
assert.match(js, /ai-project-card/);

assert.match(css, /\.ai-project-grid[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(css, /\.ai-project-general/);
assert.match(css, /\.ai-project-character/);
assert.match(css, /\.ai-project-party/);
assert.match(css, /\.ai-project-mechanism/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.ai-project-grid[\s\S]*?grid-template-columns:\s*1fr/);

console.log("Resource Library AI analysis assistant integration tests passed.");
