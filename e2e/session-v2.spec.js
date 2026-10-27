const {test,expect}=require('@playwright/test');
const {fixture,identity,id}=require('./session-v2-fixture.cjs');
const fs=require('node:fs'),path=require('node:path');
const integrated=process.env.REACT_APP_MAZE_VISUAL_INTEGRATION==='true';
const output=process.env.FC_V2_EVIDENCE,flagOff=process.env.FC_V2_EXPECT_OFF==='true';
const pos=page=>page.locator('.maze-cell[data-player]');
const key=(page,dir)=>page.keyboard.press(`Arrow${dir[0].toUpperCase()+dir.slice(1)}`);
async function started(page){await expect(pos(page)).toHaveAttribute('data-column','1');await expect(page.getByText('Waiting for server-ready acknowledgment…')).toHaveCount(0);}
async function buttons(page){await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Show direction buttons'}).click();await page.getByRole('button',{name:'Close Controls'}).click();}
async function dragRight(page,touch){
 const surface=page.locator('[data-maze-surface]');await surface.scrollIntoViewIfNeeded();const b=await surface.boundingBox();
 const x=b.x+b.width/2,y=b.y+b.height/2;
 if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+32,y,id:1}]});await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+32,y);await page.waitForTimeout(650);await page.mouse.up();}
}
async function capture(page,size,name){if(!output)return;fs.mkdirSync(output,{recursive:true});for(const fullPage of [false,true])await page.screenshot({path:path.join(output,`${size}-${name}-${fullPage?'page':'window'}.png`),fullPage});}
for(const [width,height]of [[320,568],[390,844],[844,390],[1280,800]])test.describe(`${width}x${height}`,()=>{
 test.use({viewport:{width,height},isMobile:width!==1280,hasTouch:width!==1280});
 test('ready latch, all canonical inputs, stationary fire, recovery and accepted untimed receipt',async({page,context})=>{
  test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context,{holdReady:true,holdComplete:true,failComplete:true});
  const size=`${width}x${height}`;await page.goto('/maze');await expect.poll(()=>state.ready.length).toBe(1);
  await key(page,'right');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands)).toEqual([]);
  await expect(page.locator('.maze-timer')).toHaveText('0:00.000');await capture(page,size,'ready');state.releaseReady();await started(page);
  await expect(page.locator('.maze-fog')).toHaveCount(1);await expect(page.locator('.pallet-viewport,.maze-viewport,select,.maze-banner,.maze-hud,.pallet-status')).toHaveCount(0);
  await capture(page,size,'playing');await key(page,'up'); // wall is recorded exactly once, no routine narration
  await expect(page.getByRole('status')).toBeEmpty();await page.getByRole('button',{name:'Help',exact:true}).click();
  await expect(page.locator('#maze-help-title')).toBeFocused();await key(page,'right');await capture(page,size,'help');await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Help',exact:true})).toBeFocused();await buttons(page);await capture(page,size,'directions');
  await page.getByRole('button',{name:'Down',exact:true}).click();await key(page,'right');await key(page,'right');await key(page,'up');
  await expect(page.getByRole('status')).toContainText('Fire blocks');await capture(page,size,'blocked-fire');
  await key(page,'left');await key(page,'up');await expect(page.getByRole('img',{name:'Equipment: extinguisher'})).toBeVisible();await capture(page,size,'kit');
  await dragRight(page,width!==1280);await expect(pos(page)).toHaveAttribute('data-column','2');await expect(page.getByRole('status')).toContainText('stayed in place');
  await expect(page.getByRole('img',{name:'Equipment: empty'})).toBeVisible();await capture(page,size,'fire-cleared');
  // Refresh reconstructs the cleared tile and requires a fresh deliberate gesture.
  await page.reload();await startedAt(page,2);await expect(page.getByRole('img',{name:'Equipment: empty'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();await capture(page,size,'prefix-recovery');
  await page.getByRole('button',{name:'Right',exact:true}).click();await expect(pos(page)).toHaveAttribute('data-column','3');
  await key(page,'right');await expect.poll(()=>state.completes.length).toBe(1);await capture(page,size,'saving');
  await key(page,'left');expect(state.completes).toHaveLength(1);state.releaseComplete();
  await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();await capture(page,size,'save-error');
  const frozen=state.completes[0],saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')));
  expect(frozen.transcript.commands).toEqual(['up','down','right','right','up','left','up','right','right','right'].map((dir,i)=>({seq:i+1,dir})));
  expect(saved.commands).toEqual(frozen.transcript.commands);state.holdComplete=false;
  await page.reload();await expect(page).toHaveURL(/results\?protocol=session-v2/);await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Collectible saved'})).toBeVisible();await capture(page,size,'accepted-untimed');
  expect(state.completes).toHaveLength(2);expect(state.completes[1]).toEqual(frozen);expect(state.creates).toHaveLength(1);expect(state.ready).toHaveLength(1);expect(state.legacy).toBe(0);
  expect(await page.evaluate(()=>localStorage.getItem('bestTimes'))).toBeNull();expect(await page.evaluate(()=>localStorage.getItem('lastMazeTime'))).toBeNull();
  await page.reload();await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();expect(state.completes).toHaveLength(2);
 });
});
async function startedAt(page,column){await expect(pos(page)).toHaveAttribute('data-column',String(column));await expect(page.getByText('Waiting for server-ready acknowledgment…')).toHaveCount(0);}

test('default build sends zero v2 requests; byte-compatible v1 payload and no preview',async({page,context})=>{
 test.skip(!flagOff||integrated,'default classic compiled build only');await identity(context);const state=await fixture(context);await page.goto('/maze');await started(page);
 expect(state.calls.map(x=>x.path)).toEqual(['/api/maze/start']);expect(state.archiveReads).toBe(1);expect(state.calls[0].body).toEqual({subProfileId:'000000000000000000000002',date:'2025-05-26'});
 for(let i=0;i<4;i++)await key(page,'right');await expect.poll(()=>state.calls.filter(x=>x.path==='/api/maze/complete').length).toBe(1);
 expect(state.calls.find(x=>x.path==='/api/maze/complete').body).toEqual({subProfileId:'000000000000000000000002',date:'2025-05-26',attemptId:id});
 await expect(page.locator('select,.pallet-viewport,.maze-viewport')).toHaveCount(0);expect(state.creates).toHaveLength(0);
});
test('flag OFF never replaces a pending v2 record with legacy',async({page,context})=>{
 test.skip(!flagOff||integrated,'default classic compiled build only');await identity(context);const state=await fixture(context);
 await context.addInitScript(()=>localStorage.setItem('fc.session-v2.attempt.v1','{"version":1}'));await page.goto('/maze');
 await expect(page.getByRole('alert')).toContainText('unresolved v2 attempt');expect(state.calls).toEqual([]);
});
for(const fault of ['loseCreate','loseReady','loseComplete'])test(`${fault}: refresh retains original operation identity`,async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context,{[fault]:true});await page.goto('/maze');
 if(fault!=='loseComplete'){await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();await page.reload();}
 await started(page);const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')));
 for(let i=0;i<4;i++)await key(page,'right');
 if(fault==='loseComplete'){await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();await page.reload();}
 await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();expect(state.completes).toHaveLength(1);expect(state.legacy).toBe(0);
 expect(state.completes[0].completionKey).toBe(original.completionKey);
 if(fault==='loseCreate'){expect(state.creates).toHaveLength(2);expect(state.creates[0]).toEqual(state.creates[1]);}else expect(state.creates).toHaveLength(1);
 expect(state.ready).toHaveLength(1);
});
test('absent admission safely chooses legacy before create',async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context,{admission:false});await page.goto('/maze');await started(page);
 expect(state.creates).toHaveLength(0);expect(state.legacy).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('fc.session-v2.attempt.v1'))).toBeNull();
});
test('two tabs cannot fork prefix or overwrite the original attempt',async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context);await page.goto('/maze');await started(page);await key(page,'right');
 const other=await context.newPage();await other.goto('/maze');await expect(other.getByRole('alert')).toContainText('another tab');await key(other,'right');
 expect(state.creates).toHaveLength(1);expect(await other.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands.length)).toBe(1);
 await page.close();await other.getByRole('button',{name:'Recover original attempt'}).click();await startedAt(other,2);await other.close();
});
test('storage denial prevents create, foreign profile and corrupt prefix block movement, explicit abandonment requires terminal ACK',async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context);await page.goto('/maze');await started(page);
 await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1'));r.commands=[{seq:3,dir:'right'}];localStorage.setItem('fc.session-v2.attempt.v1',JSON.stringify(r));});
 await page.reload();await expect(page.getByRole('alert')).toContainText('inconsistent');expect(state.legacy).toBe(0);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Abandon attempt and restart'}).click();await started(page);expect(state.calls.some(x=>x.path.endsWith('/abandon'))).toBe(true);
 await page.evaluate(()=>localStorage.setItem('activeSubProfile',JSON.stringify({_id:'000000000000000000000099'})));await page.reload();
 await expect(page.getByRole('alert')).toContainText('different sign-in');const creates=state.creates.length;await key(page,'right');expect(state.creates).toHaveLength(creates);
});
test('denied durable storage sends no create',async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context);
 await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='fc.session-v2.attempt.v1')throw new DOMException('denied','QuotaExceededError');return original.call(this,k,v);};});
 await page.goto('/maze');await expect(page.getByRole('alert')).toContainText('storage is unavailable');expect(state.creates).toHaveLength(0);expect(state.legacy).toBe(0);
});


test('integrated v2 renderer falls back without losing canonical prefix, kit, timing or identity',async({page,context})=>{
 test.skip(flagOff||!integrated,'integrated opt-in compiled build only');await identity(context);const state=await fixture(context);
 await page.goto('/maze');await expect(page.locator('.pallet-viewport')).toHaveAttribute('data-column','1');
 await expect(page.getByText('Waiting for server-ready acknowledgment…')).toHaveCount(0);
 await key(page,'right');await key(page,'right');await expect(page.locator('.pallet-viewport')).toHaveAttribute('data-column','2');
 await expect(page.getByRole('img',{name:'Equipment: empty'})).toBeVisible();await capture(page,'integrated','fire-cleared');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')));
 await page.getByRole('button',{name:'Use classic view'}).click();await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeFocused();
 await expect(pos(page)).toHaveAttribute('data-column','2');await capture(page,'integrated','classic-fallback');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands)).toEqual(before.commands);
 await key(page,'right');await key(page,'right');await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();
 expect(state.creates).toHaveLength(1);expect(state.ready).toHaveLength(1);expect(state.completes).toHaveLength(1);
 expect(state.completes[0].completionKey).toBe(before.completionKey);expect(state.completes[0].transcript.commands.map(c=>c.dir)).toEqual(['right','right','right','right']);
});

test('offline interruption preserves prefix, expiry requires owned terminal proof',async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context);await page.goto('/maze');await started(page);await key(page,'right');
 await page.evaluate(()=>dispatchEvent(new Event('offline')));await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();
 const prefix=await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands);await key(page,'right');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands)).toEqual(prefix);
 state.session={...state.session,state:'EXPIRED',revision:3};await page.getByRole('button',{name:'Recover original attempt'}).click();
 await expect(page.getByRole('alert')).toContainText('expired');expect(state.creates).toHaveLength(1);expect(state.legacy).toBe(0);
});

test('late ready ACK never enables another tab and navigation/cancellation emits no synthetic commands',async({page,context})=>{
 test.skip(flagOff||integrated,'opt-in classic compiled build only');await identity(context);const state=await fixture(context,{holdReady:true});
 await page.goto('/maze');await expect.poll(()=>state.ready.length).toBe(1);await page.goto('/mazes');state.releaseReady();
 const other=await context.newPage();await other.goto('/maze');await started(other);expect(state.creates).toHaveLength(1);expect(state.ready).toHaveLength(1);
 expect(await other.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands)).toEqual([]);
 await key(other,'right');await other.evaluate(()=>dispatchEvent(new Event('resize')));await other.waitForTimeout(650);
 expect(await other.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')).commands)).toEqual([{seq:1,dir:'right'}]);await other.close();
});
