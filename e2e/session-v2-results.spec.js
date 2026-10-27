const {test,expect}=require('@playwright/test');
const {createHash}=require('node:crypto');
const {identity,profile,date,id}=require('./session-v2-fixture.cjs');
for(const [status,message]of [
 ['awarded','Collectible saved'],['exhausted','No unowned item remained'],['already-used','already used'],
 ['review-required','history needs review'],['pending','recorded and pending'],
])test(`cached accepted ${status}: initial arrival, refresh and keyboard sequence`,async({page,context})=>{
 await identity(context);
 let calls=0;await context.route('**/api/**',route=>{calls++;return route.abort();});
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const stored={version:1,identityHash:createHash('sha256').update(JSON.stringify('synthetic-token')).digest('hex'),
  profileId:profile,date,attemptId:id,receipt:{protocol:'session-v2',date,timing:{status:'untimed',elapsedMs:null},
   collectible:{status,reward:{name:'Synthetic keepsake'}}}};
 await context.addInitScript(value=>{
  if(!localStorage.getItem('fc.session-v2.receipt.v1'))localStorage.setItem('fc.session-v2.receipt.v1',JSON.stringify(value));
  window.acceptedHeadingArrivals=0;
  document.addEventListener('focusin',event=>{if(event.target.tagName==='H1'&&event.target.textContent==='Maze complete')window.acceptedHeadingArrivals++;});
 },stored);
 await page.goto('/results?protocol=session-v2');
 for(const refresh of [false,true]){
  if(refresh)await page.reload();
  const heading=page.getByRole('heading',{name:'Maze complete',level:1});await expect(heading).toBeFocused();
  await expect(heading).toHaveAttribute('tabindex','-1');
  await expect(page.getByText(/Accepted untimed completion/)).toBeVisible();
  await expect(page.getByText(new RegExp(message))).toBeVisible();
  await expect(page.getByText(/Official server time/)).toHaveCount(0);
  await expect(page.locator('[aria-live],[role="status"],[role="alert"]')).toHaveCount(0);
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Replay Maze'})).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Next Maze'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Replay Maze'})).toBeFocused();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(page.getByRole('button',{name:'Replay Maze'})).toBeFocused();
  expect(await page.evaluate(()=>window.acceptedHeadingArrivals)).toBe(1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fc.session-v2.receipt.v1')))).toEqual(stored);
 }
 expect(calls).toBe(0);
});
