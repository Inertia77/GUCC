'use strict';
// Browser-level regression for sticky Save in actual GUCC DB character editor.
// Everything runs against the isolated gucc.test fixture; no production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
const out=path.resolve('tmp/db-editor-save-feedback');
const character={
  id:'isolated-character-01',
  name:'莉莉',
  character_name:'莉莉',
  full_name:'莉莉',
  game_code:'鸣',
  rarity:'5星',
  release_date:'2026-11-12',
  element:'衍射',
  profession:'佩枪',
  research_status:'✕',
  build_status:'✕',
  note:'隔离测试记录：本地长备注，不是真实生产数据。'.repeat(24),
  names:{en:'Lily',jp:'リリー',kr:'릴리'},
  links:[]
};
let browser;
(async()=>{
 await fs.mkdir(out,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height:900},hasTouch:width===390,isMobile:width===390});
  const calls=[],errors=[];let failNextSave=true;
  await F.routes(context,{auth:true,cloud:{route:async route=>{
   const req=route.request().postDataJSON();calls.push(req);
   if(req.action==='searchCharacters')return route.fulfill({json:{ok:true,data:[character]}});
   if(req.action==='getCharacterDetail')return route.fulfill({json:{ok:true,data:character}});
   if(req.action==='saveCharacter'){
    if(failNextSave){failNextSave=false;return route.fulfill({status:400,json:{ok:false,error:'隔离测试：后端保存失败，请检查权限或连接'}})}
    return route.fulfill({json:{ok:true,data:{id:character.id}}});
   }
   return route.fulfill({json:{ok:true,data:[]}});
  }}});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('https://gucc.test/apps/command-center/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-tab="characters"]').click();
  await page.locator('#characterResults [data-detail-char]').first().click();
  const form=page.locator('#charForm');
  const save=form.getByRole('button',{name:'保存角色'});
  await save.waitFor({state:'visible'});
  const hit=await save.evaluate(button=>{
   const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {button:button.outerHTML,target:hit?.outerHTML.slice(0,250),valid:button.closest('form')?.checkValidity(),inside:button===hit||button.contains(hit)};
  });
  assert(hit.inside,'Save action covered by another element: '+JSON.stringify(hit));
  assert(hit.valid,'Loaded existing character form should be valid before edits');
  // Native required-field validation *prevents* submit events. This must
  // still give visible feedback right next to Save, not down in SaveLog.
  await form.locator('[name="name"]').fill('');
  const oldSaves=calls.filter(x=>x.action==='saveCharacter').length;
  await save.click();
  await page.locator('#charForm .editor-save-feedback[data-kind="error"]').waitFor({state:'visible'});
  assert.match(await page.locator('.editor-save-feedback').innerText(),/中文主名|必填|请检查/);
  assert.equal(calls.filter(x=>x.action==='saveCharacter').length,oldSaves,'Invalid form must not send backend mutations');
  assert(await save.isEnabled(),'Required field validation must leave Save usable');
  // Error feedback should remain visible above the footer, not scroll
  // out with the body.
  await page.screenshot({path:path.join(out,'invalid-'+width+'.png'),animations:'disabled'});
  await form.locator('[name="name"]').fill('莉莉');
  await save.click();
  await page.locator('.editor-save-feedback[data-kind="error"]').waitFor({state:'visible'});
  assert.match(await page.locator('.editor-save-feedback').innerText(),/隔离测试：后端保存失败/);
  assert(await save.isEnabled(),'Save failure should re-enable the action');
  assert(!(await form.locator('[name="note"]').inputValue()).includes('误写数据库'));
  await page.screenshot({path:path.join(out,'backend-error-'+width+'.png'),animations:'disabled'});
  await save.click();
  await page.locator('#characterEditor.hidden').waitFor({state:'attached'});
  assert.equal(calls.filter(x=>x.action==='saveCharacter').length,2,'Retry must actually send saveCharacter');
  assert.equal(calls.filter(x=>x.action==='saveCharacter')[1].payload.id,character.id,'Editing may not create a new character');
  assert(errors.length===0,'Runtime exceptions: '+errors.join(' | '));
  await page.screenshot({path:path.join(out,'saved-'+width+'.png'),animations:'disabled'});
  await context.close();
 }
 await browser.close();
 console.log('DB editor Save: verified actual click, native invalid feedback, API rejection visibility, retriable successful save at 390/1440.');
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1});
