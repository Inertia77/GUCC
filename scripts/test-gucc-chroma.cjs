"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const chrome=read("assets/gucc-chroma-v1.css");
const premium=read("assets/gucc-premium.css");
const shell=read("assets/gucc-shell.js");
const dbMain=read("apps/command-center/src/main.js");
const serviceWorker=read("sw.js");
const tokens={};
for(const match of chrome.matchAll(/(--ch-[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g))tokens[match[1]]=match[2];
const expected={
 "--ch-ink":"#0e1020","--ch-panel":"#181b2c","--ch-raised":"#23283d",
 "--ch-field":"#111524","--ch-text":"#f4f5ff",
 "--ch-secondary":"#bdc6dc","--ch-muted":"#a5afc7",
 "--ch-iris":"#a6a3ff","--ch-blue":"#85bcff",
 "--ch-on-bright":"#111426","--ch-warn":"#ffd38d","--ch-danger":"#ff9dab"
};
for(const [key,value] of Object.entries(expected))assert.equal(tokens[key]?.toLowerCase(),value,key+" changed; revise the contrast tests as well");
const luminance=hex=>{
 const rgb=hex.slice(1).match(/.{2}/g).map(n=>parseInt(n,16)/255);
 const linear=rgb.map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
 return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
};
const contrast=(a,b)=>{
 const l1=luminance(a),l2=luminance(b);
 return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
};
for(const [a,b,minimum] of [
 ["--ch-text","--ch-ink",7],
 ["--ch-text","--ch-panel",7],
 ["--ch-secondary","--ch-panel",7],
 ["--ch-muted","--ch-panel",7],
 ["--ch-text","--ch-raised",7],
 ["--ch-secondary","--ch-raised",7],
 ["--ch-iris","--ch-ink",7],
 ["--ch-blue","--ch-panel",7],
 ["--ch-on-bright","--ch-iris",7],
 ["--ch-on-bright","--ch-blue",7],
 ["--ch-warn","--ch-panel",7],
 ["--ch-danger","--ch-panel",7]
]){
 const ratio=contrast(tokens[a],tokens[b]);
 assert(ratio>=minimum,`${a} on ${b} ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
}
assert.match(premium,/--g-mint:\s*#a6a3ff/);
assert.match(premium,/--g-cyan:\s*#85bcff/);
assert.match(chrome,/\.gucc-shell-dock > \.is-active/);
assert.match(chrome,/body\.creator-os-page\.gucc-enhanced/);
assert.match(chrome,/body\.resource-page\.gucc-enhanced/);
assert.match(chrome,/body\.command-center-page\.gucc-enhanced/);
assert.match(chrome,/body\.publishing-console-page\.gucc-enhanced/);
assert.match(chrome,/body\.portal-page\.gucc-enhanced/);
assert.doesNotMatch(chrome,/\.(?:stage|cover-element|cover-text|bg-layer)\s*\{/,"Chroma must not change cover export content.");
assert.match(shell,/ensureChroma\(\)/);
assert.match(shell,/gucc-chroma-v1\.css\?v=1/);
assert(dbMain.indexOf("gucc-chroma-v1.css?v=1")>dbMain.indexOf("gucc-premium.css?v=4"),"DB chroma must be last after all game material layers");
assert.match(serviceWorker,/\.\/assets\/gucc-chroma-v1\.css\?v=1/);
const entrypoints=[
 "index.html",
 "apps/command-center/index.html",
 "apps/video-workspace/index.html",
 "apps/video-workspace/production-system/index.html",
 "apps/publishing-console/index.html",
 "apps/cover-generator/index.html",
 "reference/story-library.html",
 "reference/ai-prompts.html",
 "reference/resource-library.html"
];
for(const item of entrypoints){
 const html=read(item);
 assert.equal((html.match(/data-gucc-chroma/g)||[]).length,1,`${item}: missing or duplicate chroma preload`);
 assert(html.indexOf("gucc-chroma-v1.css?v=1")>html.indexOf("gucc-premium.css?v=4"),`${item}: chroma loaded before premium`);
 assert.match(html,/<meta name="theme-color" content="#0e1020"/,`${item}: mobile browser chrome must match base surface`);
}
const manifest=JSON.parse(read("manifest.webmanifest"));
assert.equal(manifest.background_color,"#0e1020");
assert.equal(manifest.theme_color,"#0e1020");
console.log("GUCC chroma: 12 text/foreground pairs exceed 7:1, nine page entrypoints + global shell + DB late style + PWA checked.");
