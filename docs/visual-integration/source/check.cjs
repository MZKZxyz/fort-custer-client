// Optimized standalone review: start a static server of docs on :8034 first.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const ROOT=path.resolve(__dirname,'..');
const URL=process.env.VIS04A_URL || 'http://127.0.0.1:8034/visual-integration/';
const output=process.env.VIS04A_EVIDENCE || path.join(ROOT,'evidence');
fs.mkdirSync(output,{recursive:true});
const pct=(values,p)=>{const v=[...values].sort((a,b)=>a-b);return v[Math.min(v.length-1,Math.floor(v.length*p))] || 0;};
const report={environment:{node:process.version,os:`${os.type()} ${os.release()} ${os.arch()}`,cpu:os.cpus()[0].model,
  logicalCPUs:os.cpus().length,physicalDevice:false,build:'webpack production standalone React/CSS',date:new Date().toISOString()},
  limitations:['Cloud headless Chromium is not a physical phone. Device performance budgets remain UNVERIFIED.',
    'rAF after DOM update is a proxy for presentation, not a measured display scanout.',
    'Independent QA, physical phone, Safari/Firefox, screen reader, owner visual, Narrative E and EG-09 remain pending.'],screens:[],traces:[],composition:[],benchmarks:[]};
let browser;
const errors=[];
const state=page=>page.locator('.play-area').evaluate(el=>({...el.dataset}));
async function ready(page){
  await page.locator('.sprite').first().waitFor({state:'attached'});
  await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete && i.naturalWidth>0));
}
async function geometry(page){
  return page.evaluate(()=>{
    const viewport=document.querySelector('.viewport'),v=viewport.getBoundingClientRect(),t=+viewport.dataset.tile;
    const pitch=+viewport.dataset.pitch, x=+viewport.dataset.cameraX,y=+viewport.dataset.cameraY;
    let anchorError=0,pitchError=0;
    const images=[...document.querySelectorAll('.sprite.body')];
    for(const img of images){
      const r=img.getBoundingClientRect();const ax=r.x-v.x+128*t/224,ay=r.y-v.y+208*t/224;
      anchorError=Math.max(anchorError,Math.abs(ax-(+img.dataset.anchorX-x)),Math.abs(ay-(+img.dataset.anchorY-y)));
      pitchError=Math.max(pitchError,Math.abs(+img.dataset.anchorY-(t+(+img.dataset.row+.5)*t*Math.sin(58*Math.PI/180))));
    }
    const cues=[...document.querySelectorAll('.world [data-cue]')].filter(el=>el.dataset.cue==='player').map(el=>{
      const b=el.getBoundingClientRect();return {cue:el.dataset.cue,left:b.left-v.left,top:b.top-v.top,right:b.right-v.left,bottom:b.bottom-v.top,
        contained:b.left>=v.left-.5 && b.top>=v.top-.5 && b.right<=v.right+.5 && b.bottom<=v.bottom+.5};
    });
    return {tile:t,pitch,width:v.width,height:v.height,camera:{x,y},anchorError,pitchError,cues,
      worldChildren:document.querySelector('.world').children.length,
      visibleLogicalExtent:{columns:v.width/t,rows:v.height/pitch},
      squareEquivalentRows:v.height/t, rowIncreasePercent:(1/Math.sin(58*Math.PI/180)-1)*100,
      pageOverflow:document.documentElement.scrollWidth>innerWidth};
  });
}

(async()=>{
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  report.environment.chromium=browser.version();
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]) for(const deviceScaleFactor of [1,2]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,reducedMotion:'reduce',hasTouch:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(30000);
    const remote=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8034/'))remote.push(r.url());});
    await page.goto(URL);await ready(page);
    assert.equal((await state(page)).row,'1');
    assert.equal(await page.getByRole('button',{name:'Daylight',exact:true}).getAttribute('aria-pressed'),'true');
    assert(await page.getByLabel('Semantic badges').isChecked());
    const g=await geometry(page);assert(g.anchorError<=.5 && g.pitchError<=.5 && !g.pageOverflow);assert(g.cues.every(c=>c.contained));
    const name=`${width}x${height}-dpr${deviceScaleFactor}`;
    if(deviceScaleFactor===1) await page.screenshot({path:path.join(output,`${name}.png`)});
    if(width===390 && deviceScaleFactor===2) await page.locator('.scene-frame').screenshot({path:path.join(output,`${name}-scene.png`)});
    report.screens.push({name,...g,externalRequests:remote});assert.equal(remote.length,0);
    // Identical trace across mode switches: no movement reset on presentation.
    await page.getByRole('button',{name:'Right',exact:true}).click();
    assert.equal((await state(page)).equipment,'extinguisher');
    await page.getByRole('button',{name:'Right',exact:true}).focus();await page.keyboard.press('Space');
    let s=await state(page);assert.equal(s.column,'2');assert.equal(s.equipment,'');assert.equal(s.actions,'2');
    await page.keyboard.press('Enter');assert.equal((await state(page)).column,'3');
    await page.getByLabel('Presentation',{exact:true}).selectOption('legacy');
    assert.equal((await state(page)).column,'3');assert.equal(await page.locator('.sprite').count(),0);
    await page.getByLabel('Presentation',{exact:true}).selectOption('projected');await ready(page);
    for(let i=0;i<6;i++) await page.getByRole('button',{name:'Right',exact:true}).click();
    s=await state(page);assert.equal(s.completed,'true');assert.equal(await page.locator('[data-cue="E"]').count(),1);
    await page.locator('.viewport').focus();await page.keyboard.press('ArrowLeft');assert.deepEqual(await state(page),s);
    const exitGeometry=await geometry(page);assert(exitGeometry.cues.every(c=>c.contained));
    const exitBounds=await page.locator('[data-cue="E"]').boundingBox(),vb=await page.locator('.viewport').boundingBox();
    assert(exitBounds.x>=vb.x && exitBounds.x+exitBounds.width<=vb.x+vb.width+.5);
    // No persistent state or API calls in this host.
    assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
    // Open-edge fixture: every required world boundary, all four explorer headings.
    await page.getByLabel('Playable fixture').selectOption('edges');
    await page.locator('.viewport').focus();
    for(const [key,count] of [['ArrowRight',16],['ArrowDown',11],['ArrowLeft',16],['ArrowDown',1],['ArrowUp',12]]) {
      for(let i=0;i<count;i++) await page.keyboard.press(key);
      const edge=await geometry(page);assert(edge.cues.every(c=>c.contained));
    }
    const initial=await state(page);assert.equal(initial.row,'0');assert.equal(initial.column,'0');
    await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');assert.deepEqual(await state(page),initial);
    // Browser zoom and keyboard focus remain functional with normal page scroll.
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
    assert.equal(await page.evaluate(()=>visualViewport.scale),2);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.getByRole('button',{name:'Down',exact:true}).focus();
    const focus=await page.locator(':focus').evaluate(el=>({label:el.getAttribute('aria-label'),outline:getComputedStyle(el).outlineWidth}));
    assert.equal(focus.label,'Down');assert.equal(focus.outline,'3px');
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    await page.keyboard.press('Tab');assert.notEqual(await page.locator(':focus').getAttribute('aria-label'),'Down');
    await context.close();
    console.log('PASS screen',name);
  }
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));await page.goto(URL);await ready(page);
  // Mode-by-mode complete trace, including blocked input and stationary clear.
  for(const mode of ['projected','legacy']) {
    await page.getByLabel('Presentation',{exact:true}).selectOption(mode);await page.getByRole('button',{name:'Reset fixture'}).click();
    await page.locator('.viewport').focus();const trace=[await state(page)];
    for(const key of ['ArrowUp',...Array(9).fill('ArrowRight'),'ArrowLeft']){await page.keyboard.press(key);trace.push(await state(page));}
    report.traces.push({mode,trace});
  }
  assert.deepEqual(report.traces[0].trace,report.traces[1].trace);
  await page.getByLabel('Presentation',{exact:true}).selectOption('projected');
  await page.getByRole('button',{name:'Reset fixture'}).click();
  await page.getByRole('button',{name:'Lantern dusk'}).focus();await page.keyboard.press('Enter');await ready(page);
  assert.equal(await page.getByRole('button',{name:'Lantern dusk'}).getAttribute('aria-pressed'),'true');
  await page.locator('.scene-frame').screenshot({path:path.join(output,'dusk-color-390-scene.png')});
  await page.getByLabel('Grayscale comparison').check();
  await page.locator('.scene-frame').screenshot({path:path.join(output,'dusk-grayscale-390-scene.png')});
  await page.getByLabel('Semantic badges').uncheck();assert.equal(await page.locator('.badge').count(),0);
  await page.getByLabel('Separate shadows').uncheck();assert.equal(await page.locator('.shadow').count(),0);
  await page.locator('.scene-frame').screenshot({path:path.join(output,'dusk-grayscale-no-badges-390-scene.png')});
  await page.getByLabel('Grayscale comparison').uncheck();await page.getByRole('button',{name:'Daylight',exact:true}).click();
  await page.getByText('Alpha & composition bench',{exact:true}).click();
  for(const surface of ['light','dark','checker']){
    await page.getByLabel('Ground behind sprites').selectOption(surface);await ready(page);
    await page.locator('.scene-frame').screenshot({path:path.join(output,`alpha-${surface}-fractional.png`)});
    report.composition.push({surface,tile:(await geometry(page)).tile,filter:'auto',shadows:false});
  }
  await page.getByRole('button',{name:'70.1°',exact:true}).click();
  assert((await page.locator('.reference img').getAttribute('src')).includes('70.1'));
  assert.equal(await page.locator('.viewport').getAttribute('data-mode'),'projected');
  await page.getByLabel('Ground behind sprites').selectOption('earth');await page.getByLabel('Semantic badges').check();await page.getByLabel('Separate shadows').check();
  // Reach overlap permutations through the real movement function; no position
  // injection or alternate collision implementation in the browser host.
  const {makeFixture}=await import('./projection.mjs');
  const grid=makeFixture('challenge').grid;
  for(const [label,target] of [['rear-of-wall',[2,2]],['front-of-wall',[5,2]],['left-of-wall',[3,1]],['right-of-wall',[3,5]]]){
    await page.getByRole('button',{name:'Reset fixture'}).click();
    const queue=[{p:[1,1],keys:[]}],seen=new Set(['1,1']);let keys;
    for(let i=0;i<queue.length;i++){
      const current=queue[i];if(current.p.join()===target.join()){keys=current.keys;break;}
      for(const [key,[dr,dc]] of [['ArrowUp',[-1,0]],['ArrowRight',[0,1]],['ArrowDown',[1,0]],['ArrowLeft',[0,-1]]]){
        const p=[current.p[0]+dr,current.p[1]+dc],token=grid[p[0]]?.[p[1]];
        if(token!==undefined && token!=='#' && token!=='F' && !seen.has(p.join())){seen.add(p.join());queue.push({p,keys:[...current.keys,key]});}
      }
    }
    assert(keys);await page.locator('.viewport').focus();for(const key of keys)await page.keyboard.press(key);
    assert.equal((await state(page)).row,String(target[0]));assert.equal((await state(page)).column,String(target[1]));
    const sorted=await page.locator('.sprite.body:not([data-role="ground"])').evaluateAll(images=>images.every((el,i)=>!i ||
      +images[i-1].dataset.row<+el.dataset.row || (+images[i-1].dataset.row===+el.dataset.row && +images[i-1].dataset.column<=+el.dataset.column)));
    assert(sorted);await page.locator('.scene-frame').screenshot({path:path.join(output,`overlap-${label}.png`)});
    report.composition.push({permutation:label,position:target,bodyDepthOrder:sorted});
  }
  // Optimized 30-second runs on identical fixtures. Serial, after local builds
  // and Blender finish. Reports physical-device budget as unverified regardless.
  if(!process.env.VIS04A_SKIP_PERF) for(const fixture of ['13×17','21×21']) for(const mode of ['projected','legacy']){
    await page.getByLabel('Playable fixture').selectOption(fixture);await page.getByLabel('Presentation',{exact:true}).selectOption(mode);
    if(mode==='projected')await page.locator('.scene-frame').screenshot({path:path.join(output,`stress-${fixture.replace('×','x')}.png`)});
    // Avoid finishing at E while traversing the perimeter; bounce down/up in the
    // first interior column. This is the identical command stream for both views.
    await page.locator('.viewport').scrollIntoViewIfNeeded();await page.waitForTimeout(500);
    const result=await page.evaluate(async({fixture})=>{
      const frames=[],inputs=[],longTasks=[];let previous=performance.now(),nextInput=previous+200,direction='down',pending=null;
      const el=document.querySelector('.play-area'),limit=fixture==='13×17'?11:19;
      let observer;try{observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({type:'longtask',buffered:false});}catch{}
      const start=performance.now(),heapBefore=performance.memory?.usedJSHeapSize;
      await new Promise(resolve=>{
        function frame(now){
          frames.push(now-previous);previous=now;
          if(pending && el.dataset.actions!==pending.actions){inputs.push(now-pending.start);pending=null;}
          if(now>=nextInput){
            if(+el.dataset.row>=limit)direction='up';if(+el.dataset.row<=1)direction='down';
            pending={start:performance.now(),actions:el.dataset.actions};
            document.querySelector(`button.direction.${direction}`).click();nextInput=now+200;
          }
          if(now-start<30000)requestAnimationFrame(frame);else resolve();
        }requestAnimationFrame(frame);
      });observer?.disconnect();
      return {frames,inputs,longTasks,elapsedMs:performance.now()-start,heapBefore,heapAfter:performance.memory?.usedJSHeapSize,
        domElements:document.querySelectorAll('*').length};
    },{fixture});
    const summary={fixture,mode,durationMs:result.elapsedMs,frameSamples:result.frames.length,inputSamples:result.inputs.length,
      frameP50Ms:pct(result.frames,.5),frameP95Ms:pct(result.frames,.95),frameWorstMs:Math.max(...result.frames),
      inputToNextUpdatedFrameP95Ms:pct(result.inputs,.95),longTasks:result.longTasks,
      heapBefore:result.heapBefore,heapAfter:result.heapAfter,domElements:result.domElements,
      deviceBudget:'UNVERIFIED — virtual cloud host; long tasks are observed, not automatically attributable to art'};
    report.benchmarks.push(summary);console.log('BENCHMARK',JSON.stringify(summary));
  }
  for(const fixture of ['13×17','21×21']){
    const a=report.benchmarks.find(x=>x.fixture===fixture&&x.mode==='projected'),b=report.benchmarks.find(x=>x.fixture===fixture&&x.mode==='legacy');
    if(a&&b)a.frameP95RegressionPercent=(a.frameP95Ms/b.frameP95Ms-1)*100;
  }
  report.errors=errors;assert.deepEqual(errors,[]);report.result='PASS for automated scoped checks; human/device gates pending';
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.result);
})().catch(e=>{report.failure=e.stack;fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
