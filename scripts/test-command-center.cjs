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

  const styleDir = path.join(ROOT, "apps/command-center/styles");
  const versionedStyles = fs.readdirSync(styleDir).filter((name) => /-v\d+(?:[._-]|$)/i.test(name));
  assert.deepEqual(versionedStyles, [], `Command Center 不应保留手工版本 CSS：${versionedStyles.join(", ")}`);

  const serviceWorker = read("sw.js");
  assert.doesNotMatch(serviceWorker, /ignoreSearch\s*:\s*true/);
  assert.doesNotMatch(serviceWorker, /CACHE_VERSION/);
  assert.match(serviceWorker, /apps\/command-center\/src\/main\.js/);
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
