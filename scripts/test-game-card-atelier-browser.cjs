"use strict";
/* Six games × four real DB search modes, using isolated API fixtures.
 * Uses actual app DOM, styles, collapsible state and touch viewport geometry.
 * Never contacts production, never writes to Supabase.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { routes } = require("./gucc-browser-fixture.cjs");
const names = [
  ["崩","星轨档案","星穹列车档案"],
  ["绝","录像档案","新艾利都调查记录"],
  ["鸣","共鸣档案","共鸣频谱档案"],
  ["终","工程档案","塔卫工程日志"],
  ["异","异象档案","海特洛都市调查"],
  ["阴","平安卷宗","平安京式神卷宗"]
];
const uuid = n => "00000000-0000-4000-8000-" + String(n).padStart(12,"0");
const rows = Object.fromEntries(["searchCharacters","searchParties","searchMechanisms","searchVersions"].map(
  (action,mode)=>[action,names.map(([code,,label],i)=>{
    const id=uuid(mode*10+i+1);
    const common={id,game_code:code,game_title:label};
    if(mode===0)return {...common,name:label,character_name:label,full_name:label+" 典藏档案",release_date:"2026-10-01",rarity:"S",element:"测试",research_status:"△",build_status:"✕",progress_note:"隔离浏览器视图检查。非生产数据。"};
    if(mode===1)return {...common,summary:label+" · 研究阵容",party_type:"实战研究",status:"待研究",hold_status:"YES",members:[{name:"档案成员一"},{name:"档案成员二"}],description:"隔离浏览器实测阵容说明。"};
    if(mode===2)return {...common,title:label+" · 核心机制",mechanism_type:"机制解析",source_kind:"official",verified_at:"2026-11-01",description:"隔离机制说明"};
    return {...common,version_no:"3."+String(i+1),version_name:label+" · 版本记录",start_date:"2026-10-01",end_date:null,banners:[],acquisitions:[],note:"仅供排版验证"};
  })]
));
const modes=[
  ["characters","#tab-characters","#characterResults","角色记录"],
  ["parties","#tab-parties","#partyResults","阵容记录"],
  ["mechanisms","#tab-mechanisms","#mechanismResults","机制记录"],
  ["versions","#tab-versions","#versionResults","版本记录"]
];
(async()=>{
  const out=path.resolve("tmp/db-atelier-v2");
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({
    headless:true,
    executablePath:process.env.GUCC_TEST_EXECUTABLE,
    args:["--no-sandbox","--disable-dev-shm-usage"]
  });
  const errors=[],writes=[];
  try {
    for(const [width,height] of [[320,740],[390,844],[1440,900]]) {
      const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block",reducedMotion:"reduce"});
      await routes(context,{auth:true,cloud:{route:async route=>{
        const request=route.request().postDataJSON();
        const action=String(request?.action||"");
        if(/^(save|create|update|delete)/i.test(action)) writes.push(action);
        return route.fulfill({json:{ok:true,data:rows[action]||[]}});
      }}});
      const page=await context.newPage();
      page.on("pageerror",e=>errors.push(e.message));
      await page.goto("https://gucc.test/apps/command-center/");
      await page.waitForSelector("#mainView:not(.hidden)");
      await page.waitForFunction(()=>!!document.getElementById("gucc-game-card-atelier-final")?.sheet);
      for(const [mode,tab,result,kind]of modes){
        await page.locator(tab).click();
        await page.waitForFunction(selector=>document.querySelectorAll(selector+" > .item").length===6,result);
        const cards=page.locator(result+" > .item");
        const found=await cards.evaluateAll(nodes=>nodes.map(n=>({
          code:n.dataset.gameCode,
          type:n.dataset.cardKind,
          plateName:n.querySelector(".game-card-plate__name")?.textContent,
          kind:n.querySelector(".game-card-plate__kind")?.textContent,
          plateCount:n.querySelectorAll(".game-card-plate").length,
          rendered:getComputedStyle(n).backgroundImage,
          radius:getComputedStyle(n).borderTopLeftRadius,
          border:getComputedStyle(n).borderTopColor,
          platePosition:getComputedStyle(n.querySelector(".game-card-plate")).position
        })));
        assert.equal(found.length,6,mode+"/"+width+": missing game cards");
        for(let i=0;i<6;i++){
          assert.equal(found[i].code,names[i][0],mode+"/"+width+": game code drift");
          assert.equal(found[i].plateName,names[i][1],mode+"/"+width+": missing title");
          assert.equal(found[i].kind,kind,mode+"/"+width+": incorrect kind");
          assert.equal(found[i].plateCount,1,mode+"/"+width+": duplicated visual band");
          assert.equal(found[i].platePosition,"absolute",mode+"/"+width+": band must not break card flow");
        }
        assert.equal(new Set(found.map(x=>x.rendered)).size,6,mode+"/"+width+": skins must not be recolors of one background");
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
        assert(overflow<=2,mode+"/"+width+": horizontal overflow "+overflow);
        await cards.first().locator("[data-card-toggle]").click();
        assert(await cards.first().locator("[data-card-content]").evaluate(el=>el.hidden),mode+"/"+width+": collapse failed");
        await cards.first().locator("[data-card-toggle]").click();
        assert(!(await cards.first().locator("[data-card-content]").evaluate(el=>el.hidden)),mode+"/"+width+": expand failed");
        assert.equal(await cards.first().locator(".actions .danger").count(),1,mode+": missing delete action");
        if(width===390||width===1440) {
          await page.evaluate(()=>document.fonts.ready);
          await page.screenshot({path:path.join(out,mode+"-"+width+".png"),fullPage:true,animations:"disabled"});
        }
        if(mode==="characters"&&(width===390||width===1440)){
          for(let i=0;i<6;i++) {
            await cards.nth(i).screenshot({path:path.join(out,"skin-"+names[i][0]+"-"+width+".png"),animations:"disabled"});
          }
        }
      }
      await context.close();
    }
    assert.deepEqual(errors,[],"Browser runtime errors: "+errors.join("; "));
    assert.deepEqual(writes,[],"Visual acceptance must never modify data");
    console.log("GUCC Atelier v2: 6 skins × 4 modes × 3 viewports, state toggles, real CSS differentiation, no data writes PASS.");
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
