"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const mainSource = read("apps/command-center/src/main.js");
const indexSource = read("apps/command-center/index.html");
const gameThemeStyles = read("apps/command-center/styles/game-themes.css");
const gameOsStyles = read("apps/command-center/styles/game-os.css");
const interactionContrastStyles = read("apps/command-center/styles/interaction-contrast.css");

// Command Center stays search-first: no dashboard/game-hub layer should reappear.
for (const forbidden of ["TODAY", "Next Action", "game-overview", "game-hub", "six-game-overview"]) {
  assert.doesNotMatch(indexSource, new RegExp(forbidden, "i"), `Search page must not restore ${forbidden}`);
}

// Dynamic feature CSS may load during initialization. Neutral search UX must be
// ordered before the final game-geometry layer so per-game variants win last.
const searchUxIndex = mainSource.indexOf("game-os.css?v=3");
const gameThemeIndex = mainSource.indexOf("game-themes.css?v=9");
assert(searchUxIndex >= 0, "Missing final search UX stylesheet");
assert(gameThemeIndex >= 0, "Missing final game theme stylesheet");
assert(searchUxIndex < gameThemeIndex, "Neutral search UX must load before game variants");
assert.match(mainSource, /ensureFinalStyleSheets\(\{ reorder: true \}\)/);

// All six games need explicit selectors in the final identity layer.
for (const code of ["崩", "绝", "鸣", "终", "异", "阴"]) {
  assert(gameThemeStyles.includes(`data-game-code=\"${code}\"`), `Missing visual grammar for ${code}`);
}

// Grayscale-identifiable geometry: each game must have a materially distinct
// shape/edge grammar rather than relying on tint alone.
assert.match(gameThemeStyles, /data-game-code=\"HSR\"[\s\S]*?clip-path:\s*polygon\(/);
assert.match(gameThemeStyles, /data-game-code=\"ZZZ\"[\s\S]*?clip-path:\s*polygon\(/);
assert.match(gameThemeStyles, /data-game-code=\"WW\"[\s\S]*?border-radius:\s*26px/);
assert.match(gameThemeStyles, /data-game-code=\"ENF\"[\s\S]*?border-top:\s*3px solid/);
assert.match(gameThemeStyles, /data-game-code=\"NTE\"[\s\S]*?border-radius:\s*18px 5px 18px 5px/);
assert.match(gameThemeStyles, /data-game-code=\"YYS\"[\s\S]*?border-left:\s*5px solid/);

// Status meaning remains cross-game, while geometry can vary by game.
assert.match(gameThemeStyles, /\.badge\.status-highlight::before/);
assert.match(gameThemeStyles, /data-game-code=\"HSR\"[\s\S]*?status-highlight::before[\s\S]*?rotate\(45deg\)/);
assert.match(gameThemeStyles, /data-game-code=\"WW\"[\s\S]*?status-highlight::before[\s\S]*?border-radius:\s*50%/);
assert.match(gameThemeStyles, /data-game-code=\"ENF\"[\s\S]*?status-highlight::before[\s\S]*?width:\s*8px/);

// Readability / search density / touch targets stay explicit.
assert.match(gameThemeStyles, /character-title-localized[\s\S]*?font-size:\s*13px/);
assert.match(gameThemeStyles, /character-localized-label[\s\S]*?font-size:\s*12px/);
assert.match(gameOsStyles, /\.item \.actions button[\s\S]*?min-height:\s*36px/);
assert.match(gameOsStyles, /@media \(max-width: 900px\)[\s\S]*?min-height:\s*44px/);
assert.match(gameOsStyles, /grid-template-columns:\s*minmax\(70px, \.8fr\) minmax\(96px, 1\.15fr\) minmax\(64px, \.7fr\)/);
assert.match(gameOsStyles, /character-title-localized[\s\S]*?display:\s*flex/);
assert.match(gameOsStyles, /character-title-localized[\s\S]*?flex-wrap:\s*wrap/);

// Theme decorations must stay CSS-only and respect reduced motion.
assert.doesNotMatch(gameThemeStyles, /url\s*\(/i);
assert.match(gameThemeStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(gameOsStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);

// Neutral interaction contrast rules must no longer own result-card collapse
// states; otherwise they flatten per-game controls after hover/focus.
assert.doesNotMatch(interactionContrastStyles, /\.item\.is-collapsed\s+button\.collapse-toggle/);
assert.doesNotMatch(interactionContrastStyles, /\.item:not\(\.is-collapsed\)\s+button\.collapse-toggle/);
assert.match(interactionContrastStyles, /:is\(\.filter-toolbar, \.editor, \.auxiliary-card, \.result-view-controls, \.topbar\)/);

console.log("Command Center six-game visual grammar tests passed.");
