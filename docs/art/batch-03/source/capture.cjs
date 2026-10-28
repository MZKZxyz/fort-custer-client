// Serve repository root on :8057. Browser displays real model renders only.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'evidence');
const URL='http://127.0.0.1:8057/docs/art/batch-03/';
const report={status:'PASS',physicalDevice:false,screens:[],fixtures:[],errors:[]};
const directions=['south','east','north','west'];
const ready=p=>p.waitForFunction(()=>window.batch03&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
async function measure(page) {
 return page.evaluate(()=>[...document.querySelectorAll('.viewport')].map(v=>{
  const tile=+v.dataset.tile,world=v.firstElementChild,w=world.getBoundingClientRect(),children=[...world.children];let error=0;
  const rolePositions=[],actors=[];
  for(const i of world.querySelectorAll('.sprite:not([data-role=tipi])')) {
   const shadow=i.classList.contains('shadow'),scale=tile/(shadow?112:224),b=i.getBoundingClientRect();
   error=Math.max(error,Math.abs(b.left-w.left+128*scale-(tile+(+i.dataset.column+.5)*tile)),
     Math.abs(b.top-w.top+(shadow?150:208)*scale-(tile+(+i.dataset.row+.5)*tile*Math.sin(58*Math.PI/180))));
  }
  for(const i of world.querySelectorAll('.body:not([data-role=ground])')) {
   rolePositions.push([+i.dataset.row,+i.dataset.column,i.dataset.role,i.dataset.variant]);
   if(i.dataset.role==='character') {
    const shadow=world.querySelector(`.shadow[data-role=character][data-row="${i.dataset.row}"][data-column="${i.dataset.column}"]`);
    actors.push({character:i.dataset.character,facing:i.dataset.facing,matchingShadow:!shadow||shadow.dataset.character===i.dataset.character&&shadow.dataset.facing===i.dataset.facing});
   }
  }
  const order={wall:0,extinguisher:1,fire:1,tipi:1,character:2};let sorted=true;
  for(let i=1;i<rolePositions.length;i++) {const a=rolePositions[i-1],b=rolePositions[i];if(a[0]>b[0]||a[0]===b[0]&&(a[1]>b[1]||a[1]===b[1]&&order[a[2]]>order[b[2]]))sorted=false;}
  const first=children.findIndex(i=>i.classList.contains('body')&&i.dataset.role!=='ground');
  const last=children.reduce((n,i,index)=>i.classList.contains('shadow')?index:n,-1);
  return {character:v.dataset.character,mood:v.dataset.mood,facing:v.dataset.facing,tile,error,sorted,shadowsBeforeBodies:last<first,
    rolePositions,actors,worldSize:[world.clientWidth,world.clientHeight],viewport:[v.clientWidth,v.clientHeight],scroll:[v.scrollLeft,v.scrollTop]};
 }));
}
function verify(m) {for(const x of m){assert(x.error<.04&&x.sorted&&x.shadowsBeforeBodies);assert(x.actors.length>0&&x.actors.every(a=>a.matchingShadow));assert.deepEqual(x.rolePositions,m[0].rolePositions);}}
function compact(m) {return m.map(({rolePositions,...x})=>({...x,layoutSha256:crypto.createHash('sha256').update(JSON.stringify(rolePositions)).digest('hex')}));}
async function fit(page) {
 const s=await page.locator('.world').first().evaluate(w=>[w.clientWidth,w.clientHeight]);
 await page.locator('.viewport').evaluateAll((els,s)=>els.forEach(v=>{v.style.width=`${s[0]}px`;v.style.height=`${s[1]}px`;v.scrollTo(0,0);}),s);
 await page.locator('.comparison').evaluate((e,w)=>{e.style.gridTemplateColumns=`repeat(2,${w}px)`;e.style.width=`${2*w+16}px`;},s[0]);
 await page.setViewportSize({width:Math.max(1280,s[0]*2+64),height:Math.max(1000,s[1]*2+400)});
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});report.chromium=browser.version();
 try {
  for(const [width,height]of [[320,568],[390,844],[844,390],[1280,800]])for(const dpr of [1,2]) {
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce',hasTouch:true});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
   await page.goto(URL);await ready(page);
   for(const tile of [36,48])for(const facing of directions) {
    await page.locator('#tile').selectOption(String(tile));await page.locator('#facing').selectOption(facing);await ready(page);
    const m=await measure(page);verify(m);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    report.screens.push({viewport:[width,height],dpr,tile,facing,measured:compact(m)});
    if(dpr===1&&facing==='south') {
     await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(OUT,`${width}x${height}-cell${tile}-review.png`)});
     for(let i=0;i<4;i++)await page.locator('.viewport').nth(i).screenshot({path:path.join(OUT,`${width}x${height}-cell${tile}-${m[i].character}-${m[i].mood}.png`)});
    }
    if(width===390&&dpr===2&&facing==='south')for(let i=0;i<4;i++)await page.locator('.viewport').nth(i).screenshot({path:path.join(OUT,`390x844-dpr2-cell${tile}-${m[i].character}-${m[i].mood}.png`)});
   }
   await page.locator('.viewport').first().focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(180);
   const scrolled=await measure(page);assert(scrolled.every(m=>m.scroll[0]===scrolled[0].scroll[0]));
   assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);await context.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});await page.goto(URL);await ready(page);
  await page.locator('#options').evaluate(e=>e.open=true);
  for(const fixture of ['corridor','beforeBehind','corner','overlap','arrival','maze'])for(const tile of [36,48])for(const facing of directions) {
   await page.locator('#fixture').selectOption(fixture);await page.locator('#tile').selectOption(String(tile));await page.locator('#facing').selectOption(facing);await ready(page);
   const m=await measure(page);verify(m);await fit(page);report.fixtures.push({fixture,tile,facing,measured:compact(m)});
   const capture=facing==='south'||facing==='east'&&['corridor','overlap'].includes(fixture)||facing==='north'&&['corridor','beforeBehind'].includes(fixture)||facing==='west'&&['corridor','corner'].includes(fixture);
   if(capture)await page.locator('.comparison').screenshot({path:path.join(OUT,`${fixture}-${facing}-cell${tile}-pair.png`)});
  }
  for(const id of ['v01','v02','v03','v04']) {
   await page.locator('#wall').selectOption(id);await ready(page);verify(await measure(page));
  }
  await page.locator('#wall').selectOption('mixed');await page.locator('#fixture').selectOption('beforeBehind');
  await page.locator('#pools').uncheck();
  for(const facing of directions)for(const bg of ['white','black','checker']) {
   await page.locator('#facing').selectOption(facing);await page.locator('#background').selectOption(bg);await ready(page);await fit(page);
   await page.locator('.comparison').screenshot({path:path.join(OUT,`alpha-${facing}-${bg}.png`)});
  }
  await page.locator('#fixture').selectOption('overlap');await page.locator('#background').selectOption('terrain');await page.locator('#gray').check();await ready(page);await fit(page);
  await page.locator('.comparison').screenshot({path:path.join(OUT,'overlap-grayscale.png')});
  await page.locator('#shadows').uncheck();await ready(page);assert.equal(await page.locator('img.shadow').count(),0);
  await page.locator('.comparison').screenshot({path:path.join(OUT,'overlap-reduced-effects.png')});
  await page.locator('#gray').uncheck();
  for(const tile of [36,48]) {
   await page.locator('#tile').selectOption(String(tile));await ready(page);
   await page.locator('.sprite-gallery').evaluate((e,t)=>e.style.width=`${t*14}px`,tile);
   await page.locator('.sprite-gallery').screenshot({path:path.join(OUT,`native-facings-cell${tile}.png`)});
  }
  await page.locator('.sprite-gallery').evaluate(e=>{e.style.width='1120px';e.querySelectorAll('img').forEach(i=>{i.style.width='256px';i.style.height='352px';});});
  await page.locator('.sprite-gallery').screenshot({path:path.join(OUT,'authoring-58-facings.png')});
  await page.locator('.turnarounds').screenshot({path:path.join(OUT,'neutral-turnarounds.png')});
  await page.locator('.portraits').screenshot({path:path.join(OUT,'source-face-details.png')});
  assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.equal(await page.locator('.pallet-badge,[data-cue]').count(),0);
  assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS: ${report.screens.length} viewport/facing cases and ${report.fixtures.length} fixture/facing cases; alpha, walls, grayscale/effects and read-only checks`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
