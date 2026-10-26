// Actual authenticated Express + disposable MongoDB. No successful API mocks.
// Private JWT/IPC snapshots never enter traces, published logs or screenshots.
const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const server=path.resolve(process.env.FC_SERVER_ROOT||'../fort-custer-server');
const output=process.env.FC_V2_ACTUAL_EVIDENCE;
const contract=JSON.parse(fs.readFileSync(path.join(server,'docs/integration/session-v2.contract.json')));
const gridHash=contract.fixture.gridHash,date=contract.fixture.date;
let integration;
test.beforeAll(async()=>{
 const {spawnIntegration}=await import(pathToFileURL(path.join(server,'tools/integration/client.mjs')).href);
 integration=await spawnIntegration({workers:2,clientOrigins:['http://127.0.0.1:3101']});
 expect(integration.metadata.contractVersion).toBe('fc-session-v2-integration-1');
 expect(integration.metadata.fixture.fixtureHash).toBe(contract.fixture.fixtureHash);
 for(const [name,hash]of Object.entries(contract.sourceSha256))expect(createHash('sha256').update(fs.readFileSync(path.join(server,name))).digest('hex')).toBe(hash);
});
test.afterAll(async()=>{await integration?.close();});
const pos=page=>page.locator('.maze-cell[data-player]');
const key=(page,dir)=>page.keyboard.press(`Arrow${dir[0].toUpperCase()+dir.slice(1)}`);
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.attempt.v1')));
async function ready(page,column=1){await expect(pos(page)).toHaveAttribute('data-column',String(column));await expect(page.getByText('Waiting for server-ready acknowledgment…')).toHaveCount(0);}
async function capture(page,name){if(!output)return;fs.mkdirSync(output,{recursive:true});for(const fullPage of [false,true])await page.screenshot({path:path.join(output,`${name}-${fullPage?'page':'window'}.png`),fullPage});}
async function connect(context,options={}){
 const who=await integration.bootstrap(),state={creates:[],ready:[],completes:[],legacy:[],who,options};
 await context.addInitScript(({token,subProfileId,date})=>{localStorage.setItem('token',token);localStorage.setItem('activeSubProfile',JSON.stringify({_id:subProfileId}));localStorage.setItem('selectedMazeDate',date);},{token:who.token,subProfileId:who.subProfileId,date});
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),body=request.postDataJSON(),p=url.pathname;
  if(!p.startsWith('/api/v2/'))state.legacy.push(p);
  if(p==='/api/v2/sessions')state.creates.push(body);
  if(p.endsWith('/ready'))state.ready.push(body);
  if(p.endsWith('/complete'))state.completes.push(body);
  const target=p==='/api/v2/sessions'?'create':p.endsWith('/ready')?'ready':p.endsWith('/complete')?'complete':null;
  if(target&&options.fault?.operation===target&&!state.armed){state.armed=true;await integration.control('fault',{worker:0,path:p,stage:options.fault.stage,action:options.fault.action});state.faultArmed=true;}
  try{const response=await route.fetch({url:integration.metadata.baseURL+p+url.search,maxRetries:0});await route.fulfill({response});}
  catch{await route.abort('failed').catch(()=>{});}
 });
 return state;
}
async function hit(state){await expect.poll(()=>state.faultArmed).toBe(true);await expect.poll(async()=>(await integration.control('fault-status',{worker:0})).hit,{timeout:15000}).toBe(true);}
async function settle(state,attemptId,dates=1){
 const snap=await integration.control('snapshot'),owned=rows=>rows.filter(r=>r.accountId===state.who.accountId&&r.profileId===state.who.subProfileId),c=snap.collections;
 const results=owned(c.results);expect(results).toHaveLength(dates);expect(results.find(r=>r.attemptId===attemptId)?.response.timing).toEqual({status:'untimed',elapsedMs:null,reason:'TIMING_REVIEW_REQUIRED'});
 expect(owned(c.progress).filter(r=>r.completed)).toHaveLength(dates);expect(owned(c.grants)).toHaveLength(dates);
 const sub=snap.users.find(u=>u._id===state.who.accountId).subProfiles.find(p=>p._id===state.who.subProfileId);expect(sub.rewards).toEqual({'integration-compass':1});expect(sub.progress).toEqual({});
 const session=c.sessions.find(s=>s._id===attemptId);expect(session.state).toBe('COMPLETED');expect(c.slots.filter(s=>s.attemptId===attemptId)).toHaveLength(0);
 const ledger=owned(c.dateLedger),grants=owned(c.grants);expect(ledger.every(l=>['consumed','exhausted'].includes(l.state))).toBe(true);
 for(const grant of grants){expect(c.outbox.find(o=>o._id===grant._id)?.state).toBe('settled');expect(c.outbox.filter(o=>o._id===`settled:${grant._id}`)).toHaveLength(1);}
 expect(c.outbox.filter(o=>o._id===`result:${attemptId}`&&o.type==='receipt-accepted')).toHaveLength(1);
 expect((await integration.control('majority-result',{attemptId})).present).toBe(true);expect(state.legacy).toEqual([]);
 return {results:results.length,grants:grants.length,inventory:1};
}
for(const [width,height]of [[320,568],[390,844],[844,390],[1280,800]])test.describe(`${width}x${height}`,()=>{
 test.use({viewport:{width,height},isMobile:width!==1280,hasTouch:width!==1280});
 test('actual ready latch, mixed commands, fire, durable result and collectible',async({page,context})=>{
  const state=await connect(context,{fault:{operation:'ready',stage:'afterCommit',action:'pause'}});await page.goto('/maze');await hit(state);
  const initial=await stored(page);expect(initial.session.gridHash).toBe(gridHash);await key(page,'right');expect((await stored(page)).commands).toEqual([]);await expect(page.locator('.maze-timer')).toHaveText('0:00.000');
  await capture(page,`${width}x${height}-actual-ready`);await integration.control('release',{worker:0});await ready(page);
  await capture(page,`${width}x${height}-actual-playing`);await key(page,'up');await expect(page.getByRole('status')).toBeEmpty();
  await page.getByRole('button',{name:'Help',exact:true}).click();await expect(page.locator('#maze-help-title')).toBeFocused();await key(page,'right');await capture(page,`${width}x${height}-actual-help`);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Show direction buttons'}).click();await page.getByRole('button',{name:'Close Controls'}).click();await capture(page,`${width}x${height}-actual-directions`);
  await page.getByRole('button',{name:'Down',exact:true}).click();await key(page,'right');await key(page,'right');await key(page,'up');await expect(page.getByRole('status')).toContainText('Fire blocks');await capture(page,`${width}x${height}-actual-blocked-fire`);
  await key(page,'left');await key(page,'up');await expect(page.getByRole('img',{name:'Equipment: extinguisher'})).toBeVisible();await capture(page,`${width}x${height}-actual-kit`);
  const surface=page.locator('[data-maze-surface]');await surface.scrollIntoViewIfNeeded();const b=await surface.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
  if(width===1280){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+32,y);await page.waitForTimeout(650);await page.mouse.up();}
  else{const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+32,y,id:1}]});await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  await expect(pos(page)).toHaveAttribute('data-column','2');await expect(page.getByRole('img',{name:'Equipment: empty'})).toBeVisible();await capture(page,`${width}x${height}-actual-fire-cleared`);
  const prefix=(await stored(page)).commands;await page.reload();await ready(page,2);expect((await stored(page)).commands).toEqual(prefix);await capture(page,`${width}x${height}-actual-prefix-recovery`);
  await key(page,'right');state.options.fault={operation:'complete',stage:'finish:committed',action:'pause'};state.armed=false;state.faultArmed=false;
  await key(page,'right');await hit(state);await capture(page,`${width}x${height}-actual-saving`);const terminal=await stored(page);
  expect(terminal.commands).toEqual(contract.fixture.transcript.commands);await key(page,'left');expect(state.completes).toHaveLength(1);await integration.control('release',{worker:0});
  await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();await expect(page.getByRole('heading',{name:'Collectible saved'})).toBeVisible();await capture(page,`${width}x${height}-actual-accepted`);
  expect(state.creates).toHaveLength(1);expect(state.ready).toHaveLength(1);expect(state.completes).toHaveLength(1);await settle(state,terminal.attemptId);
  expect(await page.evaluate(()=>[localStorage.getItem('lastMazeTime'),localStorage.getItem('bestTimes')])).toEqual([null,null]);await page.reload();await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();expect(state.completes).toHaveLength(1);
 });
});
for(const operation of ['create','ready','complete'])test(`actual lost ${operation} ACK retains original identity and single grant`,async({page,context})=>{
 const state=await connect(context,{fault:{operation,stage:operation==='complete'?'finish:committed':'afterCommit',action:'drop'}});await page.goto('/maze');
 if(operation!=='complete'){await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();await capture(page,`actual-lost-${operation}-error`);await page.reload();}
 await ready(page);const original=await stored(page);for(let i=0;i<4;i++)await key(page,'right');
 if(operation==='complete'){await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();await capture(page,'actual-lost-complete-error');await page.reload();}
 await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();expect(state.completes).toHaveLength(1);expect(state.ready).toHaveLength(1);expect(state.completes[0].completionKey).toBe(original.completionKey);
 if(operation==='create'){expect(state.creates).toHaveLength(2);expect(state.creates[0]).toEqual(state.creates[1]);}else expect(state.creates).toHaveLength(1);
 await settle(state,original.attemptId);
});
test('actual durable intake crash/restart resolves before identical completion retry',async({page,context})=>{
 const state=await connect(context,{fault:{operation:'complete',stage:'finish:admitted',action:'crash'}});await page.goto('/maze');await ready(page);for(let i=0;i<4;i++)await key(page,'right');
 await expect(page.getByRole('heading',{name:'Recover v2 gameplay'})).toBeVisible();const original=await stored(page);await capture(page,'actual-intake-crash-error');
 const before=await integration.control('snapshot');expect(before.collections.results.filter(r=>r.attemptId===original.attemptId)).toHaveLength(0);
 expect(before.collections.sessions.find(s=>s._id===original.attemptId).pending).toBeTruthy();await integration.control('restart-app',{worker:0});await page.reload();
 await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();expect(state.completes).toHaveLength(2);expect(state.completes[1]).toEqual(state.completes[0]);await settle(state,original.attemptId);
});
test('actual two tabs and same-date replay cannot award twice; next date exhausts catalog',async({page,context})=>{
 const state=await connect(context);await page.goto('/maze');await ready(page);await key(page,'right');const original=await stored(page);
 const other=await context.newPage();await other.goto('/maze');await expect(other.getByRole('alert')).toContainText('another tab');await key(other,'right');expect(state.creates).toHaveLength(1);await page.close();
 await other.getByRole('button',{name:'Recover original attempt'}).click();await ready(other,2);for(let i=0;i<3;i++)await key(other,'right');await expect(other.getByText(/Accepted untimed completion/)).toBeVisible();await settle(state,original.attemptId);
 await other.getByRole('button',{name:'Replay Maze'}).click();await ready(other);for(let i=0;i<4;i++)await key(other,'right');await expect(other.getByText(/Accepted untimed completion/)).toBeVisible();
 let snap=await integration.control('snapshot');const owned=rows=>rows.filter(r=>r.accountId===state.who.accountId&&r.profileId===state.who.subProfileId);
 expect(owned(snap.collections.results)).toHaveLength(2);expect(owned(snap.collections.grants)).toHaveLength(1);expect(owned(snap.collections.progress)).toHaveLength(1);
 await other.getByRole('button',{name:'Next Maze'}).click();await ready(other);const next=await stored(other);for(let i=0;i<4;i++)await key(other,'right');await expect(other.getByText(/No unowned item remained/)).toBeVisible();await capture(other,'actual-exhausted');
 snap=await integration.control('snapshot');expect(owned(snap.collections.results)).toHaveLength(3);expect(owned(snap.collections.grants)).toHaveLength(2);expect(owned(snap.collections.progress)).toHaveLength(2);
 expect(snap.users.find(u=>u._id===state.who.accountId).subProfiles.find(p=>p._id===state.who.subProfileId).rewards).toEqual({'integration-compass':1});expect(state.creates[1].createKey).not.toBe(state.creates[0].createKey);expect(next.date).toBe(contract.fixture.alternateDate);await other.close();
});
test('actual storage denial prevents session admission',async({page,context})=>{
 const state=await connect(context);await context.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='fc.session-v2.attempt.v1')throw new DOMException('denied','QuotaExceededError');return set.call(this,k,v);};});
 await page.goto('/maze');await expect(page.getByRole('alert')).toContainText('storage is unavailable');expect(state.creates).toHaveLength(0);
 const snap=await integration.control('snapshot');expect(snap.collections.sessions.filter(s=>s.accountId===state.who.accountId&&s.profileId===state.who.subProfileId)).toHaveLength(0);
});
