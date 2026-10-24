'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),F=require('./gucc-browser-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.GUCC_TEST_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),writes=[],verified={},errors=[];
  const codes=['绝','异','鸣','崩','阴','终'],rows=Object.fromEntries(codes.map((code,i)=>[code,{id:`00000000-0000-4000-8000-00000000000${i+1}`,character_name:'隔离角色'+i,game_code:code,research_status:'✕',build_status:'✕'}]));
  await F.routes(context,{auth:true,cloud:{route:async(route,u)=>{
   const req=route.request().postDataJSON();
   if(u.pathname.endsWith('character_status_verifications'))return route.fulfill({json:Object.values(rows).map(r=>({character_id:r.id,updated_at:verified[r.id]?.updated_at||null,verified_at:verified[r.id]?.verified_at||null}))});
   if(u.pathname.endsWith('app_update_character_status')){
    const value=req.p_payload,row=Object.values(rows).find(r=>r.id===value.id);writes.push(value);row.research_status=value.research_status;row.build_status=value.build_status;verified[row.id]={updated_at:new Date().toISOString(),verified_at:new Date().toISOString()};return route.fulfill({json:{id:row.id,...verified[row.id]}});
   }
   return route.fulfill({json:{ok:true,data:req.action==='searchCharacters'?(rows[req.payload?.game_code]?[rows[req.payload.game_code]]:Object.values(rows)):[]}});
  }}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://gucc.test/apps/command-center/');await page.locator('[data-tab="more"]').click();await page.locator('details.auxiliary-card').filter({hasText:'角色状态校准'}).locator('summary').click();await page.locator('#startCharacterStatusWizard').click();await page.getByText('请选择这位角色的',{exact:false}).waitFor();
  await page.locator('[data-wizard-choice="0"]').click();await page.locator('[data-wizard-choice="1"]').click();assert.equal(writes.length,0,'selection must stay local');
  await page.locator('#wizardShowSummary').click();await page.locator('#wizardSubmitSelected').click();await page.waitForFunction(()=>document.querySelector('#characterStatusWizard').textContent.includes('已保存并回读核对 1 位'));
  assert.equal(writes.length,1);assert.equal(writes[0].verification_source,'human_ui');assert.equal(writes[0].research_status,'◯');assert.equal(writes[0].build_status,'△');assert.equal(Object.keys(verified).length,1);
  await fs.mkdir('tmp/stabilization-browser',{recursive:true});await page.screenshot({path:'tmp/stabilization-browser/character-verification-390.png',animations:'disabled'});assert.deepEqual(errors,[]);
  console.log('Character verification Chromium: selections remain local, explicit selected-only submit, CAS payload, persisted metadata and readback; no production writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
