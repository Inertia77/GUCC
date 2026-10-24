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

const charactersStart = markup.indexOf('<section id="characters"');
const partiesStart = markup.indexOf('<section id="parties"');
const moreStart = markup.indexOf('<section id="more"');
const wizardButton = markup.indexOf('id="startCharacterStatusWizard"');
const wizardDrawer = markup.indexOf('id="characterStatusWizard"');
assert(charactersStart >= 0 && partiesStart > charactersStart && moreStart > partiesStart);
assert.equal((markup.match(/id="startCharacterStatusWizard"/g) || []).length, 1);
assert.equal((markup.match(/id="characterStatusWizard"/g) || []).length, 1);
assert(wizardButton > moreStart, 'Status review entry must be under the More tab');
assert(!markup.slice(charactersStart, partiesStart).includes('startCharacterStatusWizard'), 'Character toolbar must be free of review entry');
assert(wizardDrawer > wizardButton, 'Wizard drawer must stay outside the hidden Characters panel');
assert.match(markup.slice(moreStart), /角色状态校准/);

assert.match(wizard, /wizardSubmitSelected/);
assert.match(wizard, /expected_updated_at/);
assert.match(wizard, /verified_at/);
console.log('Character status local selection + explicit owner submit/readback invariants: passed');
