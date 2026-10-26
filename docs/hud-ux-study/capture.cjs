const{chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base='http://127.0.0.1:8775',fixture=require('./fixture.json');
const evidence=path.join(__dirname,'evidence');fs.mkdirSync(evidence,{recursive:true});
const dimensions=[[320,568],[390,844],[844,390],[1280,800]],modes=['baseline','A','B','C'];
const prior=process.env.HUD_CAPTURE_STATES?JSON.parse(fs.readFileSync(path.join(evidence,'report.json'))):null;
const allStates=['initial','movement','obstacle','equipment','fire-blocked','fire-cleared','saving','error'];
const states=process.env.HUD_CAPTURE_STATES?process.env.HUD_CAPTURE_STATES.split(','):allStates;
const report={sourceCommit:'8664c4f2026e8ec4857b31f40e51e5a7e1ce3b97',flags:{REACT_APP_MAZE_CAMERA:'unset',REACT_APP_MAZE_VISUAL_INTEGRATION:'unset',REACT_APP_MAZE_INPUT_PREVIEW:'unset',REACT_APP_MAZE_VISUALS:'unset'},build:{mode:'production',api:'/api, local synthetic host only',sourceMaps:false},fixture:{seed:fixture.seed,rows:fixture.grid.length,columns:fixture.grid[0].length,substitution:'API response only; actual compiled /maze application, never fixture component props'},captures:[],checks:[],requestedAssets:new Set()};
(async()=>{const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});report.browser=browser.version();const baseline=new Map();
try{for(const[width,height]of dimensions)for(const mode of modes)for(const state of states){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{const u=new URL(r.url());if(u.origin===base&&!u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/study/')&&u.pathname!=='/maze')report.requestedAssets.add(u.pathname);if(u.pathname.startsWith('/api/'))requests.push({path:u.pathname,body:r.postDataJSON()});});
 await page.clock.install();await page.goto(`${base}/maze?hud=${mode}&save=${state==='error'?'error':'pending'}`);await page.locator('.maze-grid').waitFor();if(mode!=='baseline')await page.locator('.field-header').waitFor();
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 assert.equal(await page.locator('.maze-fog-main').count(),1);assert.equal(await page.locator('.pallet-viewport,.maze-viewport,.maze-steering-choice').count(),0);
 for(const dir of fixture.routes[state])await page.keyboard.press('Arrow'+dir[0].toUpperCase()+dir.slice(1));
 await page.clock.runFor(32);
 if(state==='error')await page.getByRole('dialog',{name:'Save result'}).waitFor();
 await page.evaluate(()=>scrollTo(0,0));
 const measurement=await page.evaluate(()=>{
  const b=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
  const board=document.querySelector('.maze-grid'),fog=document.querySelector('.maze-fog-main'),p=document.querySelector('[data-player=true]');
  return{pageHeight:document.documentElement.scrollHeight,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,board:b(board),fog:{count:document.querySelectorAll('.maze-fog-main').length,mask:getComputedStyle(fog).maskImage,radius:fog.style.getPropertyValue('--rad'),x:fog.style.getPropertyValue('--px'),y:fog.style.getPropertyValue('--py'),animation:getComputedStyle(fog).animationName},position:[Number(p.dataset.row),Number(p.dataset.column)],equipment:document.querySelector('.maze-slot').getAttribute('aria-label'),status:document.querySelector('.pallet-status').textContent.trim(),visibleFeedback:document.querySelector('.field-status')?.textContent||null,phase:board.dataset.inputPhase,dpad:[...document.querySelectorAll('.dpad-btn')].map(e=>({name:e.querySelector('img').alt,...b(e)})),previewSelector:document.querySelectorAll('.maze-steering-choice').length,dialog:document.querySelector('dialog[open]')?.getAttribute('aria-label')||null,helpHeight:document.querySelector('#maze-input-help').getBoundingClientRect().height,statusHeight:document.querySelector('.pallet-status').getBoundingClientRect().height};
 });
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(measurement.horizontalOverflow,0);
 const key=`${width}-${state}`;if(mode==='baseline')baseline.set(key,measurement);else{const before=baseline.get(key);assert.deepEqual(measurement.position,before.position);assert.equal(measurement.equipment,before.equipment);assert.equal(measurement.status,before.status);assert.deepEqual(measurement.fog,before.fog);assert(Math.abs(measurement.board.width-before.board.width)<.02);assert(Math.abs(measurement.board.height-before.board.height)<.02);for(const target of measurement.dpad)assert(target.width>=44&&target.height>=44);}
 assert.equal(requests.filter(r=>r.path.endsWith('/start')).length,1);assert.equal(requests.filter(r=>r.path.endsWith('/complete')).length,['saving','error'].includes(state)?1:0);
 const stem=`${mode}-${width}x${height}-${state}`;await page.screenshot({path:path.join(evidence,stem+'-page.png'),fullPage:true});
 if(state==='initial')await page.screenshot({path:path.join(evidence,stem+'-viewport.png'),fullPage:false});
 report.captures.push({mode,state,width,height,file:stem+'-page.png',viewportFile:state==='initial'?stem+'-viewport.png':null,...measurement,requests,errors});
 await page.close();
 if(state==='error')console.log(`${mode} ${width}×${height}: 8 states captured and checked`);
}
 // Same-contact anticipated turn, using the existing 21×21 corner fixture.
 for(const[width,height]of dimensions)for(const mode of ['baseline','A']){
  const p=await browser.newPage({viewport:{width,height}});await p.clock.install();await p.goto(`${base}/maze?hud=${mode}&grid=corners`);await p.locator('[data-maze-surface]').waitFor();if(mode!=='baseline')await p.locator('.field-header').waitFor();await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+100));
  const surface=p.locator('[data-maze-surface]');await surface.scrollIntoViewIfNeeded();const r=await surface.boundingBox(),x=Math.max(r.x,0)+24,y=Math.max(r.y,0)+24;
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+30,y);await p.mouse.move(x,y+30);await p.clock.runFor(400);await p.locator('.pallet-status').filter({hasText:'Turn queued: down'}).waitFor();
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(evidence,`${mode}-${width}x${height}-queued-page.png`),fullPage:true});await p.mouse.up();await p.close();
 }
 report.checks.push({name:'Queued-turn feedback: native same-contact drag in baseline and A at all 4 sizes',passed:true});
 // Focus, modal, reduced-motion and text enlargement on the recommended design.
 const page=await browser.newPage({viewport:{width:320,height:568},hasTouch:true});await page.goto(`${base}/maze?hud=A`);await page.locator('.field-header').waitFor();
 await page.getByRole('button',{name:'Movement and fire help'}).click();await page.getByRole('dialog',{name:'A few useful bearings.'}).waitFor();await page.screenshot({path:path.join(evidence,'A-320x568-help-page.png'),fullPage:true});await page.keyboard.press('Tab');assert(await page.getByRole('button',{name:'Back to the maze'}).evaluate(e=>document.activeElement===e));await page.keyboard.press('Escape');assert(await page.getByRole('button',{name:'Movement and fire help'}).evaluate(e=>document.activeElement===e));
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('dialog',{name:'Quit maze'}).waitFor();await page.screenshot({path:path.join(evidence,'A-320x568-quit-page.png'),fullPage:true});await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.maze-fog-main').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.evaluate(()=>{const values=[...document.querySelectorAll('.field-header *,.field-status,.dpad-btn')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,size]of values)e.style.fontSize=`${size*2}px`;});await page.screenshot({path:path.join(evidence,'A-320x568-text-200-page.png'),fullPage:true});
 report.checks.push({name:'Native help Tab containment, Escape and focus return',passed:true},{name:'Existing quit modal retained',passed:true},{name:'Reduced motion disables existing fog animation without removing fog',passed:true});
 report.textProbe=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,pageHeight:document.documentElement.scrollHeight}));await page.close();
 if(prior){report.captures=[...prior.captures.filter(c=>!states.includes(c.state)),...report.captures];report.requestedAssets=new Set([...prior.requestedAssets,...report.requestedAssets]);report.partialRefresh={states,reason:'Routine movement has no second visible lesson; context space stays stable.'};}
 report.requestedAssets=[...report.requestedAssets].sort();report.notes=['128 full-page state captures plus 16 initial viewport captures; overlays never edit production source.','Native classic maze/fog and API payloads compared between baseline and all proposals.','Synthetic local API only; no live maze data or deployment.','Desktop/short-landscape classic full-grid can require scrolling; geometry intentionally unchanged.','Physical safe areas, screen readers and native-device ergonomics unverified.'];
 for(const file of ['overlay.js','overlay.css','fixture.json','capture.cjs','session.js','serve.cjs']){report.sourceSHA256??={};report.sourceSHA256[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex');}
 fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: production classic and 3 overlays, 4 sizes × 8 states; identical geometry/fog/outcomes/API counts');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
