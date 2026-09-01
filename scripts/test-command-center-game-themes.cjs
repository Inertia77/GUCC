"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const mainSource = read("apps/command-center/src/main.js");
const indexSource = read("apps/command-center/index.html");
const gameThemeStyles = read("apps/command-center/styles/game-themes.css");
const gamePremiumStyles = read("apps/command-center/styles/game-premium.css");
const interfaceChromeStyles = read("apps/command-center/styles/interface-chrome.css");
const responsiveLayoutStyles = read("apps/command-center/styles/responsive-layout.css");
const gameOsStyles = read("apps/command-center/styles/game-os.css");
const interactionContrastStyles = read("apps/command-center/styles/interaction-contrast.css");

// Command Center stays search-first: no dashboard/game-hub layer should reappear.
for (const forbidden of ["TODAY", "Next Action", "game-overview", "game-hub", "six-game-overview"]) {
  assert.doesNotMatch(indexSource, new RegExp(forbidden, "i"), `Search page must not restore ${forbidden}`);
}

// Dynamic feature CSS may load during initialization. Neutral search UX must be
// followed by geometry, material finish, shared chrome, then the responsive contract.
const searchUxIndex = mainSource.indexOf("game-os.css?v=3");
const gameThemeIndex = mainSource.indexOf("game-themes.css?v=9");
const gamePremiumIndex = mainSource.indexOf("game-premium.css?v=1");
const interfaceChromeIndex = mainSource.indexOf("interface-chrome.css?v=1");
const responsiveLayoutIndex = mainSource.indexOf("responsive-layout.css?v=1");
assert(searchUxIndex >= 0, "Missing final search UX stylesheet");
assert(gameThemeIndex >= 0, "Missing final game theme stylesheet");
assert(gamePremiumIndex >= 0, "Missing premium game material stylesheet");
assert(interfaceChromeIndex >= 0, "Missing final shared interface chrome stylesheet");
assert(responsiveLayoutIndex >= 0, "Missing final responsive layout stylesheet");
assert(searchUxIndex < gameThemeIndex, "Neutral search UX must load before game variants");
assert(gameThemeIndex < gamePremiumIndex, "Premium material finish must load after game geometry");
assert(gamePremiumIndex < interfaceChromeIndex, "Shared chrome must load after card material finish");
assert(interfaceChromeIndex < responsiveLayoutIndex, "Responsive layout contract must load last");
assert.match(mainSource, /ensureFinalStyleSheets\(\{ reorder: true \}\)/);

// All six games need explicit selectors in both identity and material layers.
for (const code of ["崩", "绝", "鸣", "终", "异", "阴"]) {
  assert(gameThemeStyles.includes(`data-game-code=\"${code}\"`), `Missing visual grammar for ${code}`);
  assert(gamePremiumStyles.includes(`data-game-code=\"${code}\"`), `Missing premium material language for ${code}`);
  assert(interfaceChromeStyles.includes(`data-game-code=\"${code}\"`), `Missing interface accent/system mark for ${code}`);
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

// Material references should feel physically grounded without adding images:
// railway ticket, VHS hardware, audio equipment, machined panel, transit glass,
// and a night lacquer/washi archive for Onmyoji.
for (const materialPhrase of [
  "first-class railway ticket",
  "VHS cassette",
  "anodized audio interface",
  "CNC industrial panel",
  "smoked city glass",
  "night lacquer archive"
]) {
  assert(gamePremiumStyles.includes(materialPhrase), `Missing material concept: ${materialPhrase}`);
}

// Onmyoji must stay dark, warm and readable instead of returning to a bright
// daylight parchment card. These tokens intentionally sit in the final material layer.
assert.match(gamePremiumStyles, /data-game-code=\"YYS\"[\s\S]*?--game-surface:\s*#181416/);
assert.match(gamePremiumStyles, /data-game-code=\"YYS\"[\s\S]*?--game-surface-2:\s*#0f1117/);
assert.match(gamePremiumStyles, /data-game-code=\"YYS\"[\s\S]*?--game-title:\s*#f3e8d8/);
assert.match(gamePremiumStyles, /data-game-code=\"YYS\"[\s\S]*?--game-text:\s*#e5d8cb/);
assert.match(gamePremiumStyles, /data-game-code=\"YYS\"[\s\S]*?linear-gradient\(145deg, #1a1517 0%, #13131a 55%, #0d1015 100%\)/);

// Next-stage interface language: shared navigation/query/editor remain GUCC-first,
// while the selected game lends only a restrained accent and micro system mark.
for (const systemMark of [
  "RAIL ARCHIVE // 01",
  "VIDEO ARCHIVE // 06",
  "RESONANCE SIGNAL // 02",
  "FIELD OPS // 04",
  "CITY SIGNAL // 05",
  "HEIAN RECORD // 03"
]) {
  assert(interfaceChromeStyles.includes(systemMark), `Missing product-family system mark: ${systemMark}`);
}
assert.match(interfaceChromeStyles, /GUCC DATABASE \/\/ LIVE OPERATIONS/);
assert.match(interfaceChromeStyles, /MODE SELECT/);
assert.match(interfaceChromeStyles, /QUERY MATRIX/);
assert.match(interfaceChromeStyles, /RECORD CONSOLE/);
assert.match(interfaceChromeStyles, /\.editor-body > label:has\(:focus\)/);
assert.match(interfaceChromeStyles, /#charForm[\s\S]*?input\[name=\"name\"\][\s\S]*?grid-column:\s*span 2/);
assert.match(interfaceChromeStyles, /\.editor-footer button\[type=\"submit\"\]/);
assert.match(mainSource, /function resolveThemeGameCode\(value\)/);
assert.match(mainSource, /function syncFilterToolbarTheme\(select\)/);
assert.match(mainSource, /function syncEditorTheme\(input\)/);
assert.match(mainSource, /initInterfaceThemeSync\(\)/);

// Four primary work modes must be exactly equal-width on desktop. Mechanism is
// injected dynamically, so a stale three-column navigation contract is a regression.
assert.match(responsiveLayoutStyles, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) minmax\(82px, 104px\)/);
assert.match(responsiveLayoutStyles, /#tab-mechanisms::before\s*\{\s*content:\s*\"03\"/);
assert.match(responsiveLayoutStyles, /#tab-versions::before\s*\{\s*content:\s*\"04\"/);
assert.match(responsiveLayoutStyles, /button:not\(\.tab-more\)[\s\S]*?width:\s*100%/);

// Desktop filters should use a stable grid; medium desktop should reflow rather
// than squeeze controls, while mobile uses a two-column query layout with one
// full-width primary search action.
assert.match(responsiveLayoutStyles, /@media \(min-width: 1101px\)[\s\S]*?\.filter-grid[\s\S]*?grid-template-columns:/);
assert.match(responsiveLayoutStyles, /@media \(min-width: 901px\) and \(max-width: 1100px\)[\s\S]*?repeat\(6, minmax\(0, 1fr\)\)/);
assert.match(responsiveLayoutStyles, /@media \(max-width: 900px\)[\s\S]*?\.filter-grid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(responsiveLayoutStyles, /:is\(#searchCharBtn, #searchPartyBtn, #searchMechanismBtn, #searchVersionBtn\)[\s\S]*?grid-column:\s*1 \/ -1/);
assert.match(responsiveLayoutStyles, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) 52px/);

// Editor layout follows the device instead of merely scaling the desktop drawer.
assert.match(responsiveLayoutStyles, /\.editor[\s\S]*?width:\s*min\(920px, 74vw\)/);
assert.match(responsiveLayoutStyles, /@media \(min-width: 901px\) and \(max-width: 1100px\)[\s\S]*?\.editor \.form-grid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(responsiveLayoutStyles, /@media \(max-width: 900px\)[\s\S]*?\.editor \.form-grid[\s\S]*?grid-template-columns:\s*1fr/);
assert.match(responsiveLayoutStyles, /\.editor :is\(input, textarea, select\)[\s\S]*?font-size:\s*16px/);
assert.match(responsiveLayoutStyles, /\.editor-footer[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.35fr\) minmax\(96px, \.65fr\)/);

// Readability / search density / touch targets stay explicit.
assert.match(gameThemeStyles, /character-title-localized[\s\S]*?font-size:\s*13px/);
assert.match(gameThemeStyles, /character-localized-label[\s\S]*?font-size:\s*12px/);
assert.match(gameOsStyles, /\.item \.actions button[\s\S]*?min-height:\s*36px/);
assert.match(gameOsStyles, /@media \(max-width: 900px\)[\s\S]*?min-height:\s*44px/);
assert.match(gameOsStyles, /grid-template-columns:\s*minmax\(70px, \.8fr\) minmax\(96px, 1\.15fr\) minmax\(64px, \.7fr\)/);
assert.match(gameOsStyles, /character-title-localized[\s\S]*?display:\s*flex/);
assert.match(gameOsStyles, /character-title-localized[\s\S]*?flex-wrap:\s*wrap/);
assert.match(responsiveLayoutStyles, /min-height:\s*44px/);

// Decorations remain CSS-only and retreat on small screens / reduced motion.
assert.doesNotMatch(gameThemeStyles, /url\s*\(/i);
assert.doesNotMatch(gamePremiumStyles, /url\s*\(/i);
assert.doesNotMatch(interfaceChromeStyles, /url\s*\(/i);
assert.doesNotMatch(responsiveLayoutStyles, /url\s*\(/i);
assert.match(gameThemeStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(gamePremiumStyles, /@media \(max-width:\s*900px\)/);
assert.match(gamePremiumStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(interfaceChromeStyles, /@media \(max-width:\s*900px\)/);
assert.match(interfaceChromeStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(responsiveLayoutStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(gameOsStyles, /@media \(prefers-reduced-motion:\s*reduce\)/);

// Neutral interaction contrast rules must no longer own result-card collapse
// states; otherwise they flatten per-game controls after hover/focus.
assert.doesNotMatch(interactionContrastStyles, /\.item\.is-collapsed\s+button\.collapse-toggle/);
assert.doesNotMatch(interactionContrastStyles, /\.item:not\(\.is-collapsed\)\s+button\.collapse-toggle/);
assert.match(interactionContrastStyles, /:is\(\.filter-toolbar, \.editor, \.auxiliary-card, \.result-view-controls, \.topbar\)/);

console.log("Command Center six-game visual grammar and responsive layout tests passed.");