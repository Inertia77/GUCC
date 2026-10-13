import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wizard = readFileSync(resolve(root,'apps/command-center/src/features/character-status-wizard.js'),'utf8');
const markup = readFileSync(resolve(root,'apps/command-center/index.html'),'utf8');
const api = readFileSync(resolve(root,'apps/command-center/src/api.js'),'utf8');

assert.match(wizard, /localStorage\.setItem\(KEY/);
assert.match(wizard, /allRows\(\)\.filter/);
assert.match(wizard, /selectedExport\(\)/);
assert.match(wizard, /下载完整 JSON/);
assert.match(wizard, /await Promise\.all\(GAMES\.map/);
assert.doesNotMatch(wizard, /API\.updateCharacterStatus|API\.saveCharacter|fetch\s*\(/);
assert.doesNotMatch(api,/updateCharacterStatus\s*[,(:]/);
assert.match(markup, /全量状态校准（草稿）/);
console.log('Character status draft-only workflow invariants: passed');
