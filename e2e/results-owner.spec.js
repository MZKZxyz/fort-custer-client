const { test, expect } = require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
async function capture(page,name){if(!process.env.FC_RESULT_EVIDENCE)return;fs.mkdirSync(process.env.FC_RESULT_EVIDENCE,{recursive:true});for(const fullPage of [false,true])await page.screenshot({path:path.join(process.env.FC_RESULT_EVIDENCE,`${name}-${fullPage?'page':'viewport'}.png`),fullPage});}
const profileA='00000000000000000000000a',profileB='00000000000000000000000b';
const accountA='000000000000000000000001',accountB='000000000000000000000002';
const token=id=>`header.${Buffer.from(JSON.stringify({id})).toString('base64url')}.signature`;
const originalToken=token(accountA);
const attemptId='01234567-89ab-4cde-8fab-0123456789ab';
const reward={id:'synthetic',name:'Original keepsake',image:'crate.png',description:'Original private description',category:'Original category',rarity:'Original rarity'};
async function setup(page,{mode='old',legacy=false,active=profileA}={}){
  const writes=[];
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('**/api/**',route=>{
    if(route.request().method()!=='GET')writes.push(route.request().postDataJSON());
    if(mode==='old')return route.fulfill({status:404,contentType:'text/html',body:'<html>Cannot GET /api/maze/archive</html>'});
    return route.fulfill({status:503,json:{code:'ARCHIVE_UNAVAILABLE'}});
  });
  await page.goto('/');
  const raw=await page.evaluate(async({profileA,active,originalToken,attemptId,reward,legacy})=>{
    localStorage.setItem('token',originalToken);localStorage.setItem('activeSubProfile',JSON.stringify({_id:active,name:active===profileA?'Player A':'Player B'}));
    localStorage.setItem('lastMazeTime','123.456');localStorage.setItem('lastReward',JSON.stringify(reward));localStorage.setItem('lastNewRecord','true');
    localStorage.setItem('selectedMazeDate','2028-02-29');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({accountId:'000000000000000000000001'})));
    const identityHash=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
    const ctx=legacy?{date:'2028-02-29',profileId:profileA,accountId:null}:{version:2,date:'2028-02-29',profileId:profileA,accountId:'000000000000000000000001',identityHash,
      receipt:{time:'123.456',reward,newRecord:true,attemptId}};
    const raw=JSON.stringify(ctx);sessionStorage.setItem('mazeResultContext',raw);return raw;
  },{profileA,active,originalToken,attemptId,reward,legacy});
  await page.goto('/results');return{raw,writes};
}
const assertNoPrivate=async page=>{
  await expect(page.getByText('Saved result unavailable for this player')).toBeVisible();
  await expect(page.getByText(/February 29, 2028|You finished in|personal best|Original (keepsake|private description|category|rarity)/)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Open reward crate'})).toHaveCount(0);
  await expect(page.getByRole('img',{name:'Original keepsake'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Replay Maze'})).toHaveCount(0);
};
async function switchAndRead(page,changes){
  return page.evaluate(({profile,token,logout})=>{
    if(logout)localStorage.clear();
    if(profile)localStorage.setItem('activeSubProfile',JSON.stringify({_id:profile,name:profile.endsWith('a')?'Player A':'Player B'}));
    if(token)localStorage.setItem('token',token);
    window.dispatchEvent(new Event('activeSubProfileChanged'));
    return{body:document.body.innerText,rewards:[...document.querySelectorAll('img.reveal')].map(img=>img.alt),crate:!!document.querySelector('.reward-crate-button')};
  },changes);
}
const assertImmediateHidden=snapshot=>{
  expect(snapshot.body).not.toMatch(/February 29, 2028|You finished in|personal best|Original (keepsake|private description)/);
  expect(snapshot.rewards).toEqual([]);expect(snapshot.crate).toBe(false);
};
for(const [width,height]of [[320,568],[375,667],[390,844],[844,390],[1280,800]])test(`QA reproduction has no private receipt under B at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});const state=await setup(page,{active:profileB});await assertNoPrivate(page);
  expect(await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'))).toBe(state.raw);
  expect(await page.evaluate(()=>localStorage.getItem('lastNewRecord'))).toBe('true');
  await page.reload();await assertNoPrivate(page);expect(state.writes).toEqual([]);
});
for(const mode of ['old','503'])test(`mounted A → B → A cancels reveals and restores original receipt with ${mode} catalog`,async({page})=>{
  const state=await setup(page,{mode});await expect(page.getByText(/You finished in/)).toContainText('02:03.456');
  await page.getByRole('button',{name:'Open reward crate'}).click();
  assertImmediateHidden(await switchAndRead(page,{profile:profileB}));await assertNoPrivate(page);
  await page.waitForTimeout(1300);await assertNoPrivate(page);if(mode==='old')await capture(page,'other-player-neutral');
  // Global mirrors can change without corrupting the saved owner-bound snapshot.
  await page.evaluate(()=>{localStorage.setItem('lastMazeTime','999.999');localStorage.setItem('lastReward','{"name":"Other reward"}');});
  await switchAndRead(page,{profile:profileA});await expect(page.getByText(/You finished in/)).toContainText('02:03.456');
  await page.getByRole('button',{name:'Open reward crate'}).click();await expect(page.getByText('Original private description')).toBeVisible();
  await expect(page.getByRole('img',{name:'Original keepsake'})).toBeVisible();if(mode==='old')await capture(page,'owner-restored');
  // Test the fully revealed payload too, not just an unopened crate.
  assertImmediateHidden(await switchAndRead(page,{profile:profileB}));await assertNoPrivate(page);
  await switchAndRead(page,{profile:profileA});await expect(page.getByText(/You finished in/)).toContainText('02:03.456');
  expect(await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'))).toBe(state.raw);expect(state.writes).toEqual([]);
});
for(const mode of ['logout','account'])test(`${mode} conceals synchronously and original sign-in restores receipt after reload`,async({page})=>{
  const state=await setup(page);await expect(page.getByText(/You finished in/)).toBeVisible();
  assertImmediateHidden(await switchAndRead(page,mode==='logout'?{logout:true}:{token:token(accountB)}));await assertNoPrivate(page);
  await switchAndRead(page,{token:originalToken,profile:profileA});await expect(page.getByText(/You finished in/)).toContainText('02:03.456');
  await page.reload();await expect(page.getByText(/You finished in/)).toContainText('02:03.456');
  await expect(page.getByText(/personal best/)).toBeVisible();expect(await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'))).toBe(state.raw);
  expect(state.writes).toEqual([]);
});
for(const malformed of ['missing','broken','legacy'])test(`${malformed} owner context never exposes unbound legacy caches`,async({page})=>{
  const state=await setup(page,{legacy:malformed==='legacy'});
  if(malformed!=='legacy')await page.evaluate(value=>{
    if(value==='missing')sessionStorage.removeItem('mazeResultContext');else sessionStorage.setItem('mazeResultContext','{broken');
    window.dispatchEvent(new Event('storage'));
  },malformed);
  await assertNoPrivate(page);expect(await page.evaluate(()=>localStorage.getItem('lastMazeTime'))).toBe('123.456');
  expect(await page.evaluate(()=>localStorage.getItem('lastNewRecord'))).toBe('true');expect(state.writes).toEqual([]);
});
test('independent QA legacy reproduction with null account binding stays private under B',async({page})=>{
  const state=await setup(page,{legacy:true,active:profileB});await assertNoPrivate(page);
  expect(await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'))).toBe(state.raw);
  expect(await page.evaluate(()=>localStorage.getItem('lastNewRecord'))).toBe('true');expect(state.writes).toEqual([]);
});
