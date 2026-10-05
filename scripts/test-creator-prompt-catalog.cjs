'use strict';
const assert=require('node:assert/strict');
const P=require('../apps/video-workspace/ai-prompts.js');
const original=require('../apps/video-workspace/notion-prompts.json');
assert.deepEqual([...P.tasks.flatMap(t=>t.old)].sort(),Object.keys(original).sort(),'Every original task must have exactly one destination');
assert.equal(new Set(P.tasks.map(t=>t.id)).size,P.tasks.length);
for(const t of P.tasks){
 if(t.modes.some(m=>m==='Work'||m==='Codex'))assert.ok(t.fallback?.length,`${t.id} needs explicit Chat fallback`);
 for(const r of P.ROUTES)for(const format of ['long','short'])for(const mode of t.modes){
  const ps=P.parts(t.id,mode);for(const part of ps){const result=P.build(t.id,{route:r.id,format},mode,part.index);assert.ok(result.includes(r.name));assert.ok(result.includes('NEXT_HANDOFF'));assert.ok(result.includes('所需输入'));assert.ok(result.includes('正式输出'));assert.ok(result.length>600);if(mode==='Chat'&&t.fallback){assert.ok(result.includes(`Chat备用 ${part.index+1}/${ps.length}`));assert.ok(result.includes(part.body));}}
 }
}
const story=P.build('analysis',{route:'story'},'Work');const mechanism=P.build('analysis',{route:'mechanism'},'Work');
assert.match(story,/说话者、语气、上下文/);assert.doesNotMatch(story,/STATE_BEFORE/);assert.match(mechanism,/STATE_BEFORE/);
assert.match(P.build('audit',{route:'creative'},'Work'),/史书等文体不机械套口播/);
assert.match(P.build('align',{},'Chat',0),/无工具明确未完成，不猜时间/);
assert.match(P.build('blueprint',{},'Chat'),/CODEX_EDIT_BLUEPRINT\.md/);
assert.match(P.build('render',{},'Codex'),/无音轨无烧录字幕/);
assert.match(P.build('render',{},'Codex'),/不混口播/);
assert.match(P.build('publish',{},'Work'),/YouTube\/TikTok繁中/);
assert.equal(P.tasks.filter(t=>t.optional).length,1);
console.log(`Prompt catalog passed: ${Object.keys(original).length} original tasks mapped, ${P.ROUTES.length} routes, all environments and fallback parts checked.`);
