"use strict";
/* Source contract: seven physical skins × four real result templates.
   No fictitious status data or DB/API mutations are added. */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const css=read("apps/command-center/styles/game-card-atelier.css");
const helper=read("apps/command-center/src/game-card-plate.js");
const main=read("apps/command-center/src/main.js");
const html=read("apps/command-center/index.html");
const worker=read("sw.js");
const types={
  "characters":"character",
  "parties":"party",
  "mechanisms":"mechanism",
  "versions":"version"
};
assert.match(css,/GUCC DB \/ Atelier Cards v2/);
for(const [plural,kind]of Object.entries(types)){
  const script=read("apps/command-center/src/features/"+plural+".js");
  assert(script.includes("renderGameCardPlate"),"Missing plate import/render "+plural);
  assert(script.includes('data-card-kind="'+kind+'"'),"Missing render kind "+kind);
  assert(script.includes("renderGameCardPlate(row.game_code"),"Identity must use actual game code");
}
for(const [name,codes]of Object.entries({
  HSR:["崩","HSR"],ZZZ:["绝","ZZZ"],WW:["鸣","WW"],
  ENF:["终","末","ENF"],NTE:["异","NTE"],YYS:["阴","YYS"],AZUR_PROMILIA:["AZUR_PROMILIA","蓝色星原","蓝色星原：旅谣","蓝色星原:旅谣"]
})){
  for(const code of codes)assert(css.includes('data-game-code="'+code+'"'),name+" missing "+code);
  assert(helper.includes(name),name+" missing from identity plate mapping");
}
assert(css.includes("prefers-reduced-motion"),"Required reduced motion safeguard");
assert(css.includes(":focus-visible"),"Keyboard focus state required");
assert(css.includes(".is-collapsed"),"Collapse interaction must be represented");
assert(css.includes(".is-recently-updated"),"Save feedback must be represented");
assert(css.includes(".actions .danger"),"Danger action must retain semantic warning");
assert(!css.includes("position:fixed"),"No overlays/viewport decorations on result cards");
assert(html.includes('id="gucc-game-card-atelier-final"'));
assert(main.includes("['gucc-game-card-atelier-final', '../styles/game-card-atelier.css?v=4']"));
assert(main.indexOf("gucc-game-chrome-final")<main.indexOf("gucc-game-card-atelier-final"),
  "Atelier layer must follow the shared chrome");
assert(worker.includes("game-card-atelier.css?v=4")&&worker.includes("src/game-card-plate.js"));
assert(css.includes("Atelier Cards v3") && css.includes("--folio-art"), "V3 art direction required");
assert(css.includes(".meta .badge.status-highlight::before{display:none"),"Duplicate status glyphs must not render");
assert(css.includes("flex-direction:column!important"),"Mobile title and statuses need separate rows");
assert(helper.includes('data-game-skin="${skin[0]}"'),"Plate must expose resolved skin identity");
assert(css.includes(':has(> [data-game-skin="AZUR_PROMILIA"])'),"Null game code must resolve to the same Azur visual skin");
console.log("GUCC DB Atelier v3.1 source contract: 7 themes × 4 record types, CSS precedence, semantic controls PASS.");
