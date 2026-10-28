// Serve repository root on :8051. Rebuild evidence without a React/app build.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'), OUT=path.join(ROOT,'evidence');
const URL='http://127.0.0.1:8051/docs/art/batch-01/';
const errors=[],badRequests=[];
const report={environment:{node:process.version,cpu:os.cpus()[0].model,physicalPhone:false},
  screens:[],assemblies:[],limits:['Author evidence; owner and independent QA signoff pending.','Headless Chromium is not physical phone or GPU memory/performance validation.']};
const ready=async page=>{
  await page.waitForFunction(()=>window.batch01 && [...document.images].every(i=>i.complete&&i.naturalWidth>0));
};
async function measurements(page) {
  return page.evaluate(()=>[...document.querySelectorAll('.viewport')].map(v=>{
    const tile=+v.dataset.tile,world=v.firstElementChild,w=world.getBoundingClientRect();
    let anchorError=0;
    for(const img of world.querySelectorAll('.sprite:not([data-role=tipi])')) {
      const shadow=img.classList.contains('shadow'),scale=tile/(shadow?112:224),box=img.getBoundingClientRect();
      anchorError=Math.max(anchorError,
        Math.abs(box.left-w.left+128*scale-(tile+(+img.dataset.column+.5)*tile)),
        Math.abs(box.top-w.top+(shadow?150:208)*scale-(tile+(+img.dataset.row+.5)*tile*Math.sin(58*Math.PI/180))));
    }
    const roles=[...world.querySelectorAll('.body:not([data-role=ground])')].map(i=>[i.dataset.row,i.dataset.column,i.dataset.role]);
    let sorted=true;
    for(let i=1;i<roles.length;i++) if(+roles[i][0]<+roles[i-1][0]||(+roles[i][0]===+roles[i-1][0]&&+roles[i][1]<+roles[i-1][1])) sorted=false;
    const children=[...world.children],firstBody=children.findIndex(i=>i.classList.contains('body')&&i.dataset.role!=='ground');
    const lastShadow=children.reduce((last,i,n)=>i.classList.contains('shadow')?n:last,-1);
    return {mood:v.dataset.mood,tile,anchorError,sorted,allShadowsBeforeBodies:lastShadow<firstBody,roles,
      dimensions:[world.clientWidth,world.clientHeight],images:world.querySelectorAll('img').length,
      scroll:[v.scrollLeft,v.scrollTop],viewport:[v.clientWidth,v.clientHeight]};
  }));
}
async function fitPair(page) {
  const sizes=await page.locator('.world').first().evaluate(w=>[w.clientWidth,w.clientHeight]);
  await page.locator('.viewport').evaluateAll((els,s)=>els.forEach(v=>{v.style.width=`${s[0]}px`;v.style.height=`${s[1]}px`;v.scrollTo(0,0);}),sizes);
  await page.locator('.comparison').evaluate((el,w)=>{el.style.gridTemplateColumns=`repeat(2,${w}px)`;el.style.width=`${2*w+16}px`;},sizes[0]);
  await page.setViewportSize({width:Math.max(1280,2*sizes[0]+64),height:Math.max(900,sizes[1]+350)});
}
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  report.environment.chromium=browser.version();
  try {
    for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]) for(const dpr of [1,2]) {
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce',hasTouch:true});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('requestfailed',r=>badRequests.push(r.url()));
      page.on('response',r=>{if(r.status()>=400)badRequests.push(`${r.status()} ${r.url()}`);});
      await page.goto(URL);await ready(page);
      assert.equal(await page.locator('.pool').count(),2);
      for(const tile of [36,48]) {
        await page.locator('#tile').selectOption(String(tile));await ready(page);
        const measured=await measurements(page);
        assert.deepEqual(measured[0].roles,measured[1].roles);
        for(const m of measured) {assert(m.anchorError<.04);assert(m.sorted&&m.allShadowsBeforeBodies);}
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        for(const [index,m] of measured.entries()) await page.locator('.viewport').nth(index).screenshot({path:path.join(OUT,`${width}x${height}-dpr${dpr}-cell${tile}-${m.mood}.png`)});
        if(dpr===1 && tile===36) {
          await page.evaluate(()=>window.scrollTo(0,0));
          await page.screenshot({path:path.join(OUT,`${width}x${height}-review.png`)});
        }
        report.screens.push({viewport:[width,height],dpr,tile,measured});
      }
      // Native keyboard scrolling and synchronized day/evening world positions.
      const v=page.locator('.viewport').first();await v.focus();await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      const scrolled=await measurements(page);
      assert.equal(scrolled[0].scroll[0],scrolled[1].scroll[0]);
      await page.locator('#reset').click();
      assert.equal((await measurements(page))[0].scroll[0],0);
      assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL);await ready(page);
    for(const fixture of ['single','run','corner','T','cross','block','edges','overlap','maze']) for(const tile of [36,48]) {
      await page.locator('#fixture').selectOption(fixture);await page.locator('#tile').selectOption(String(tile));await ready(page);
      const m=await measurements(page);
      assert.deepEqual(m[0].roles,m[1].roles);
      const columns=await page.evaluate(()=>window.batch01.fixtures[document.querySelector('#fixture').value][0].length);
      const grid=await page.evaluate(()=>window.batch01.fixtures[document.querySelector('#fixture').value]);
      assert.equal(m[0].roles.filter(r=>r[2]==='wall').length,grid.join('').split('#').length-1);
      // Expand only the art-review viewport to include the complete fixture;
      // cell width stays native. Every screenshot remains a real DOM composition.
      await fitPair(page);
      await page.locator('.comparison').screenshot({path:path.join(OUT,`${fixture}-cell${tile}-pair.png`)});
      report.assemblies.push({fixture,tile,rows:grid.length,columns,measured:m});
    }
    await page.locator('#fixture').selectOption('single');await page.locator('#tile').selectOption('48');
    await page.locator('#pools').uncheck();
    await fitPair(page);
    for(const background of ['checker','white','black']) {
      await page.locator('#background').selectOption(background);await ready(page);
      await page.locator('.comparison').screenshot({path:path.join(OUT,`alpha-${background}-pair.png`)});
    }
    await page.locator('#fixture').selectOption('overlap');await page.locator('#background').selectOption('terrain');
    await fitPair(page);
    await page.locator('#gray').check();await ready(page);
    await page.locator('.comparison').screenshot({path:path.join(OUT,'overlap-grayscale-pair.png')});
    await page.locator('#shadows').uncheck();await ready(page);
    assert.equal(await page.locator('img.shadow').count(),0);
    await page.locator('.comparison').screenshot({path:path.join(OUT,'overlap-reduced-effects-pair.png')});
    // All objects remain static even if a device requests reduced motion.
    assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
    assert.equal(await page.locator('[data-cue],.pallet-badge').count(),0);
    await context.close();
    assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
    report.errors=errors;report.badRequests=badRequests;report.status='PASS';
    for(const group of [report.screens,report.assemblies]) for(const entry of group)
      entry.measured=entry.measured.map(({roles,...measurements})=>({...measurements,roleCount:roles.length,
        rolePositionSha256:crypto.createHash('sha256').update(JSON.stringify(roles)).digest('hex')}));
    fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`PASS: ${report.screens.length} viewport/cell/DPR cases, ${report.assemblies.length} adjacency cases, alpha/occlusion/reduced-effects captures`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
