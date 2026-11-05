"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const portal = read("index.html");
const sqlDoc = read("reference/query-guides/query-manual.md");
const dbDoc = read("data/schema.md");
const setup = read("docs/supabase-setup.html");
const sqlHtml = read("docs/maintenance/query-manual.html");
const dbHtml = read("docs/maintenance/db-structure.html");
const css = read("assets/gucc-system-docs-v1.css");
const sw = read("sw.js");

for (const target of [
  "docs/maintenance/query-manual.html",
  "docs/maintenance/db-structure.html",
  "docs/supabase-setup.html"
]) {
  assert(portal.includes('href="./' + target + '"'), "Portal missing system link: " + target);
}
assert(!portal.includes('href="./reference/query-guides/query-manual.md"'));
assert(!portal.includes('href="./data/schema.md"'));

for (const [name, html] of [["SQL",sqlHtml],["DB",dbHtml],["System",setup]]) {
  assert(html.startsWith("<!doctype html>"), name+" must be stand-alone HTML");
  assert(html.includes("gucc-system-docs-v1.css?v=1"), name+" missing shared stylesheet");
  assert(html.includes("access-guard.js?v=15"), name+" missing access gate");
  assert(html.includes("2026-11-05"), name+" missing reviewed date");
  assert(!html.includes("GameUp Command Center v5.1 部署指南"), name+" retained obsolete title");
}
assert(css.includes("prefers-reduced-motion"));
assert(setup.includes("workflow-based Pages"), "Pages guide must reflect workflow deployment");
assert(setup.includes("creator-project-api") && setup.includes("gameup-api"));
assert(setup.includes("release.json") && setup.includes("T1/T2/T3"));

assert(sqlDoc.includes("game_play_policies") && sqlDoc.includes("creator_deliverable_records"));
assert(sqlDoc.includes("character_evaluations.like_level"));
assert(sqlDoc.includes("◯ / △ / ✕ / 対象外"));
assert(sqlDoc.includes("public.version_acquisitions"));
const sqlBlocks = [...sqlDoc.matchAll(/~~~sql\n([\s\S]*?)\n~~~/g)].map(m=>m[1]);
assert(sqlBlocks.length >= 12, "Need practical verified queries");
for (const block of sqlBlocks) {
  assert(!/\bcp\.(?:like_level|research_note)\b/i.test(block), "Obsolete character_progress columns in SQL");
  assert(!/\b(?:phase|banner_type)\s*=\s*'(?:上半|下半|限定角色)'/i.test(block));
}
const writing = sqlBlocks.filter(block=>/^update\s+public\./im.test(block));
assert.equal(writing.length,2,"Only explicit guarded examples may write");
for(const block of writing){
  assert(/^begin;/m.test(block.trim())&&/where character_id = 'REPLACE_WITH_CHARACTER_UUID'::uuid/.test(block));
  assert(/rollback;\s*$/.test(block),"Documentation must default to ROLLBACK");
}
const catalog = [...dbDoc.matchAll(/\*\*public\.([\w]+)\*\*/g)].map(m=>m[1]);
assert.equal(new Set(catalog).size,46,"Production base-table inventory drift");
assert.equal((dbHtml.match(/<details class="schema-table">/g)||[]).length,46,"Rendered schema table count mismatch");
for (const v of ["v_character_overview","v_character_progress_overview","v_party_overview","v_platform_resource_overview"]) {
  assert(dbDoc.includes(v) && dbHtml.includes(v),"Missing live view "+v);
}
for(const file of ["assets/gucc-system-docs-v1.css","docs/maintenance/query-manual.html","docs/maintenance/db-structure.html","docs/supabase-setup.html"]){
  assert(sw.includes('./'+file.replace("docs/supabase-setup.html","docs/supabase-setup.html")), "PWA app shell missing "+file);
}
assert(sw.includes("gucc-static-v67")&&sw.includes("gucc-runtime-v58"));
console.log("GUCC maintenance docs: 3 portal routes, 46 tables, 4 views, guarded SQL and PWA PASS.");
