"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

(async () => {
  const guardsPath = path.join(ROOT, "apps/command-center/src/record-guards.mjs");
  const {
    findDuplicateCharacter,
    assertNewCharacterUnique,
    findDuplicateVersion,
    assertNewVersionUnique
  } = await import(pathToFileURL(guardsPath).href);

  const characters = [
    { id: "c1", game_code: "绝", character_name: "叶瞬光" },
    { id: "c2", game_code: "鸣", character_name: "守岸人" }
  ];
  assert.equal(findDuplicateCharacter(characters, { game_code: "绝", name: " 叶瞬光 " })?.id, "c1");
  assert.equal(findDuplicateCharacter(characters, { game_code: "鸣", name: "叶瞬光" }), null);
  assert.equal(findDuplicateCharacter(characters, { id: "c1", game_code: "绝", name: "叶瞬光" }), null);
  assert.throws(
    () => assertNewCharacterUnique(characters, { game_code: "绝", name: "叶瞬光" }),
    /已经存在.*详情\/编辑/
  );

  const versions = [
    { id: "v1", game_code: "绝", version_no: "3.2" },
    { id: "v2", game_code: "鸣", version_no: "3.6" }
  ];
  assert.equal(findDuplicateVersion(versions, { game_code: "绝", version_no: " 3.2 " })?.id, "v1");
  assert.equal(findDuplicateVersion(versions, { game_code: "鸣", version_no: "3.2" }), null);
  assert.equal(findDuplicateVersion(versions, { id: "v1", game_code: "绝", version_no: "3.2" }), null);
  assert.throws(
    () => assertNewVersionUnique(versions, { game_code: "绝", version_no: "3.2" }),
    /已经存在.*编辑已有版本/
  );

  const characterSource = read("apps/command-center/src/features/characters.js");
  assert.match(characterSource, /assertNewCharacterUnique/);
  assert.match(characterSource, /if \(!payload\.id\)/);
  assert.match(characterSource, /API\.searchCharacters/);
  assert.match(characterSource, /function renderCharacterTitle\(row\)/);
  assert.match(characterSource, /character-title-localized/);
  assert.match(characterSource, /label: 'EN'[\s\S]*label: 'JP'[\s\S]*label: 'KR'/);

  const contentStyles = read("apps/command-center/styles/content.css");
  assert.match(contentStyles, /\.character-title-localized/);
  assert.match(contentStyles, /@media \(max-width: 640px\)[\s\S]*\.character-title-localized[\s\S]*flex-basis: 100%/);

  const localizedNamesMigration = read("supabase/migrations/20260826_character_card_localized_names.sql");
  assert.match(localizedNamesMigration, /jsonb_object_agg\(cn\.lang, cn\.name/);
  assert.match(localizedNamesMigration, /cn\.lang in \('en', 'jp', 'kr'\)/);
  assert.match(localizedNamesMigration, /cn_search\.name ilike/);

  const versionSource = read("apps/command-center/src/features/versions.js");
  assert.match(versionSource, /assertNewVersionUnique/);
  assert.match(versionSource, /if \(!payload\.id\)/);
  assert.match(versionSource, /API\.searchVersions/);

  const indexSource = read("apps/command-center/index.html");
  assert.match(indexSource, /src="src\/main\.js"/);
  assert.doesNotMatch(indexSource, /main-v\d/i);
  assert.doesNotMatch(indexSource, /styles\/[^"']+-v\d/i);

  const mainSource = read("apps/command-center/src/main.js");
  assert.doesNotMatch(mainSource, /-v\d/i);
  assert.match(mainSource, /initMechanisms, searchMechanisms/);
  assert.match(mainSource, /mechanisms: searchMechanisms/);
  assert(mainSource.indexOf("initMechanisms();") < mainSource.indexOf("initTabs();"), "Mechanism tab shell must exist before tab initialization");

  const apiSource = read("apps/command-center/src/api.js");
  for (const method of ["searchMechanisms", "getMechanismDetail", "saveMechanism", "deleteMechanism"]) {
    assert.match(apiSource, new RegExp(`${method}:`), `Missing API method: ${method}`);
  }

  const mechanismSource = read("apps/command-center/src/features/mechanisms.js");
  assert.match(mechanismSource, /data-tab="mechanisms"/);
  assert.match(mechanismSource, /API\.searchMechanisms/);
  assert.match(mechanismSource, /API\.getMechanismDetail/);
  assert.match(mechanismSource, /API\.saveMechanism/);
  assert.match(mechanismSource, /API\.deleteMechanism/);
  assert.match(mechanismSource, /bindCollapsibleCards/);
  assert.match(mechanismSource, /bindCollapseAllControls/);
  assert.match(mechanismSource, /renderProgressiveList/);
  assert.match(mechanismSource, /renderStructuredResourceEditor/);
  assert.match(mechanismSource, /collectStructuredResourceLinks/);
  assert.match(mechanismSource, /mechanism_type/);
  assert.match(mechanismSource, /source_kind/);
  assert.match(mechanismSource, /verified_at/);
  assert.match(mechanismSource, /window\.confirm/);

  const structuredLinksSource = read("apps/command-center/src/structured-links.js");
  for (const relationType of ["official_reference", "guide", "research", "demo", "reference"]) {
    assert.match(structuredLinksSource, new RegExp(relationType));
  }
  assert.match(structuredLinksSource, /safeExternalUrl/);
  assert.match(structuredLinksSource, /renderLinks/);
  assert.match(structuredLinksSource, /data-resource-link-field="title"/);
  assert.match(structuredLinksSource, /data-resource-link-field="url"/);
  assert.match(structuredLinksSource, /data-resource-link-field="relation_type"/);
  assert.match(structuredLinksSource, /data-resource-link-field="source"/);
  assert.match(structuredLinksSource, /data-resource-link-field="note"/);

  const mechanismStyles = read("apps/command-center/styles/mechanisms.css");
  assert.match(mechanismStyles, /data-resource-relation="official_reference"/);
  assert.match(mechanismStyles, /data-resource-relation="guide"/);
  assert.match(mechanismStyles, /data-resource-relation="research"/);
  assert.match(mechanismStyles, /data-resource-relation="demo"/);
  assert.match(mechanismStyles, /overflow-wrap: anywhere/);
  assert.match(mechanismStyles, /@media \(max-width: 760px\)/);
  assert.match(mechanismStyles, /min-height: 44px/);

  const mechanismMigration = read("supabase/migrations/20260827072049_gucc_mechanism_core_entity.sql");
  assert.match(mechanismMigration, /drop constraint if exists mechanisms_type_chk/);
  assert.match(mechanismMigration, /drop constraint if exists mechanisms_source_kind_chk/);
  assert.match(mechanismMigration, /idx_mechanisms_type_source/);
  assert.match(mechanismMigration, /entity_type, entity_id, relation_type/);
  assert.match(mechanismMigration, /'mechanism'/);
  for (const fn of ["app_search_mechanisms", "app_get_mechanism_detail", "app_save_mechanism", "app_delete_mechanism"]) {
    assert.match(mechanismMigration, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(mechanismMigration, new RegExp(`grant execute on function public\\.${fn}\\(jsonb\\) to service_role`));
  }
  assert.match(mechanismMigration, /UNIQUE|already exists|Mechanism already exists/i);
  assert.match(mechanismMigration, /p_payload \? 'description'/);
  assert.match(mechanismMigration, /p_payload \? 'links'/);

  const edgeSource = read("supabase/functions/gameup-api/index.ts");
  assert.match(edgeSource, /searchMechanisms: 'app_search_mechanisms'/);
  assert.match(edgeSource, /getMechanismDetail: 'app_get_mechanism_detail'/);
  assert.match(edgeSource, /saveMechanism: 'app_save_mechanism'/);
  assert.match(edgeSource, /deleteMechanism: 'app_delete_mechanism'/);
  assert.match(edgeSource, /getUserFromToken/);
  assert.match(edgeSource, /assertAllowedUser/);

  const styleDir = path.join(ROOT, "apps/command-center/styles");
  const versionedStyles = fs.readdirSync(styleDir).filter((name) => /-v\d+(?:[._-]|$)/i.test(name));
  assert.deepEqual(versionedStyles, [], `Command Center 不应保留手工版本 CSS：${versionedStyles.join(", ")}`);

  const serviceWorker = read("sw.js");
  assert.doesNotMatch(serviceWorker, /ignoreSearch\s*:\s*true/);
  assert.doesNotMatch(serviceWorker, /CACHE_VERSION/);
  assert.match(serviceWorker, /apps\/command-center\/src\/main\.js/);
  assert.match(serviceWorker, /apps\/command-center\/src\/structured-links\.js/);
  assert.match(serviceWorker, /apps\/command-center\/src\/features\/mechanisms\.js/);
  assert.match(serviceWorker, /apps\/command-center\/styles\/mechanisms\.css/);
  assert.doesNotMatch(serviceWorker, /apps\/command-center\/styles\/[^"']+-v\d/i);

  const publisherServer = read("scripts/publisher-assistant/server.cjs");
  assert.doesNotMatch(publisherServer, /https:\/\/inertia77\.github\.io/);
  assert.match(publisherServer, /http:\/\/localhost:8000/);
  assert.match(publisherServer, /request\.method === "GET" && pathname === "\/api\/health"/);

  console.log("Command Center regression tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
