// Native DOM art evidence; serve repository root at :8055 first.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'evidence');
const URL='http://127.0.0.1:8055/docs/art/batch-02/';
const report={status:'PASS',physicalDevice:false,screens:[],assemblies:[],uniform:[],seedChecks:[],errors:[]};
const ready=page=>page.waitForFunction(()=>window.batch02&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
async function measure(page) {
 return page.evaluate(()=>[...document.querySelectorAll('.viewport')].map(v=>{
  const tile=+v.dataset.tile,world=v.firstElementChild,w=world.getBoundingClientRect(),elements=[...world.children];
  let error=0;const roles=[],variants={v01:0,v02:0,v03:0,v04:0};
  for(const img of world.querySelectorAll('.sprite')) {
   if(img.dataset.role==='tipi')continue;
   const shadow=img.classList.contains('shadow'),scale=tile/(shadow?112:224),b=img.getBoundingClientRect();
   error=Math.max(error,Math.abs(b.left-w.left+128*scale-(tile+(+img.dataset.column+.5)*tile)),
     Math.abs(b.top-w.top+(shadow?150:208)*scale-(tile+(+img.dataset.row+.5)*tile*Math.sin(58*Math.PI/180))));
  }
  for(const img of world.querySelectorAll('.body:not([data-role=ground])')) {
   roles.push([img.dataset.row,img.dataset.column,img.dataset.role,img.dataset.variant]);
   if(img.dataset.role==='wall')variants[img.dataset.variant]++;
  }
  let sorted=true;for(let i=1;i<roles.length;i++)if(+roles[i][0]<+roles[i-1][0]||(+roles[i][0]===+roles[i-1][0]&&+roles[i][1]<+roles[i-1][1]))sorted=false;
  const first=elements.findIndex(e=>e.classList.contains('body')&&e.dataset.role!=='ground');
  const last=elements.reduce((n,e,i)=>e.classList.contains('shadow')?i:n,-1);
  let matchedShadowVariants=true;
  for(const body of world.querySelectorAll('.body[data-role=wall]')) {
   const shadow=world.querySelector(`.shadow[data-role=wall][data-row="${body.dataset.row}"][data-column="${body.dataset.column}"]`);
   if(shadow&&shadow.dataset.variant!==body.dataset.variant)matchedShadowVariants=false;
  }
  return {mood:v.dataset.mood,tile,error,sorted,shadowsBeforeBodies:last<first,matchedShadowVariants,
   roles,variants,worldSize:[world.clientWidth,world.clientHeight],scroll:[v.scrollLeft,v.scrollTop]};
 }));
}
function compact(values) {return values.map(({roles,...m})=>({...m,roleCount:roles.length,layoutSha256:crypto.createHash('sha256').update(JSON.stringify(roles)).digest('hex')}));}
function verify(values) {assert.deepEqual(values[0].roles,values[1].roles);for(const m of values)assert(m.error<.04&&m.sorted&&m.shadowsBeforeBodies&&m.matchedShadowVariants);}
async function fit(page) {
 const size=await page.locator('.world').first().evaluate(e=>[e.clientWidth,e.clientHeight]);
 await page.locator('.viewport').evaluateAll((els,s)=>els.forEach(v=>{v.style.width=`${s[0]}px`;v.style.height=`${s[1]}px`;v.scrollTo(0,0);}),size);
 await page.locator('.comparison').evaluate((e,w)=>{e.style.gridTemplateColumns=`repeat(2,${w}px)`;e.style.width=`${2*w+16}px`;},size[0]);
 await page.setViewportSize({width:Math.max(1280,2*size[0]+64),height:Math.max(900,size[1]+350)});
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});report.chromium=browser.version();
 try {
  for(const [width,height]of [[320,568],[390,844],[844,390],[1280,800]])for(const dpr of [1,2]) {
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce',hasTouch:true});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
   await page.goto(URL);await ready(page);
   for(const tile of [36,48]) {
    await page.locator('#tile').selectOption(String(tile));await ready(page);const values=await measure(page);verify(values);
    assert(Object.values(values[0].variants).every(n=>n>0));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(()=>window.scrollTo(0,0));
    if(dpr===1)await page.screenshot({path:path.join(OUT,`${width}x${height}-cell${tile}-review.png`)});
    for(let i=0;i<2;i++)await page.locator('.viewport').nth(i).screenshot({path:path.join(OUT,`${width}x${height}-dpr${dpr}-cell${tile}-${values[i].mood}.png`)});
    report.screens.push({viewport:[width,height],dpr,tile,measured:compact(values)});
   }
   await page.locator('.viewport').first().focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
   const scrolled=await measure(page);assert.equal(scrolled[0].scroll[0],scrolled[1].scroll[0]);
   await page.locator('#options').evaluate(e=>e.open=true);await page.locator('#reset').click();assert.equal((await measure(page))[0].scroll[0],0);
   assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
   await context.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await page.goto(URL);await ready(page);await page.locator('#options').evaluate(e=>e.open=true);
  for(const fixture of ['single','run','corner','T','cross','block','edges','overlap','maze','stress'])for(const tile of [36,48]) {
   await page.locator('#fixture').selectOption(fixture);await page.locator('#tile').selectOption(String(tile));await ready(page);
   const values=await measure(page);verify(values);await fit(page);
   const expected=await page.evaluate(()=>window.batch02.fixtures[document.querySelector('#fixture').value].join('').split('#').length-1);
   assert.equal(Object.values(values[0].variants).reduce((a,b)=>a+b,0),expected);
   await page.locator('.comparison').screenshot({path:path.join(OUT,`mixed-${fixture}-cell${tile}-pair.png`)});
   report.assemblies.push({fixture,tile,measured:compact(values)});
  }
  for(const tile of [36,48]) {
   await page.locator('#tile').selectOption(String(tile));await ready(page);
   await page.locator('.swatches').evaluate((e,t)=>e.style.width=`${t*11}px`,tile);
   await page.locator('.swatches').screenshot({path:path.join(OUT,`four-finishes-cell${tile}.png`)});
   for(const id of ['v01','v02','v03','v04']) {
    await page.locator('#fixture').selectOption('maze');await page.locator('#treatment').selectOption(id);await ready(page);await fit(page);
    const values=await measure(page);verify(values);assert.equal(Object.keys(values[0].variants).filter(k=>values[0].variants[k]>0).join(),id);
    await page.locator('.comparison').screenshot({path:path.join(OUT,`uniform-${id}-maze-cell${tile}-pair.png`)});
    report.uniform.push({variantId:id,tile,measured:compact(values)});
   }
  }
  await page.locator('#treatment').selectOption('mixed');await ready(page);const before=(await measure(page))[0].roles;
  await page.locator('#seed').fill('independent-review-seed');await page.locator('#seed').dispatchEvent('change');await ready(page);
  const after=(await measure(page))[0].roles;assert.notDeepEqual(before,after);assert.deepEqual(before.map(r=>r.slice(0,3)),after.map(r=>r.slice(0,3)));
  await page.locator('#seed').fill('batch02-owner-review');await page.locator('#seed').dispatchEvent('change');await ready(page);assert.deepEqual((await measure(page))[0].roles,before);
  report.seedChecks.push({changedAppearanceOnly:true,originalSeedRestoresExactLayout:true});
  for(const id of ['v01','v02','v03','v04'])for(const background of ['white','black','checker']) {
   await page.locator('#fixture').selectOption('single');await page.locator('#treatment').selectOption(id);await page.locator('#background').selectOption(background);await page.locator('#pools').uncheck();await ready(page);await fit(page);
   await page.locator('.comparison').screenshot({path:path.join(OUT,`alpha-${id}-${background}-pair.png`)});
  }
  await page.locator('#fixture').selectOption('overlap');await page.locator('#treatment').selectOption('mixed');await page.locator('#background').selectOption('terrain');await page.locator('#gray').check();await ready(page);await fit(page);
  await page.locator('.comparison').screenshot({path:path.join(OUT,'mixed-overlap-grayscale-pair.png')});
  await page.locator('#shadows').uncheck();await ready(page);assert.equal(await page.locator('img.shadow').count(),0);
  await page.locator('.comparison').screenshot({path:path.join(OUT,'mixed-overlap-reduced-effects-pair.png')});
  await page.locator('.swatches').evaluate(e=>{
   e.style.width='1120px';
   e.querySelectorAll('img').forEach(i=>{i.style.width='256px';i.style.height='352px';});
  });
  await page.locator('.swatches').screenshot({path:path.join(OUT,'authoring-four-finishes.png')});
  assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  assert.equal(await page.locator('.pallet-badge,[data-cue]').count(),0);assert.deepEqual(report.errors,[]);
  fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS: ${report.screens.length} viewport/cell/DPR, ${report.assemblies.length} mixed assemblies, ${report.uniform.length} uniform mazes, seed/alpha/overlap/effects checks`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
