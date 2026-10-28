const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const profileA = '00000000000000000000000a', profileB = '00000000000000000000000b';
const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';
function catalog(month = '2028-03', profile = profileA, options = {}) {
  const today = options.today || '2028-03-01';
  const dates = options.empty ? [] : month === '2028-02' ? ['2028-02-28', '2028-02-29']
    : month === '2028-03' ? ['2028-03-01'] : month === '2025-05' ? ['2025-05-26']
      : month === '2028-01' ? Array.from({length:31},(_,i)=>`2028-01-${String(i+1).padStart(2,'0')}`) : [];
  const item = date => ({ date, publicationEra: date.startsWith('2025') ? 'legacy' : 'year-round-v1',
    ...(profile ? { progress: { completed: profile === profileA && date === '2028-02-28' } } : {}) });
  return { month, today, serverNow: options.serverNow || `${today}T12:00:00.000Z`, nextDayAt: options.nextDayAt || '2028-03-02T00:00:00.000Z',
    firstPublishedDate: options.empty ? null : '2025-05-26', lastPublishedDate: options.empty ? null : options.missingToday ? '2028-02-29' : today,
    todayMaze: options.empty || options.missingToday ? {date:today,available:false} : {...item(today),available:true},
    items: dates.filter(date=>date<=today && !(options.missingToday && date===today)).map(item) };
}
async function setup(page, options = {}) {
  const state = { starts: [], completes: [], reads: [], options, leaderboard: 200 };
  await page.addInitScript(({profileA}) => {
    if (!localStorage.getItem('token')) localStorage.setItem('token','synthetic-token');
    if (!localStorage.getItem('activeSubProfile')) localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileA,name:'Player'}));
    localStorage.setItem('mazeDirectionButtons','true');
  }, {profileA});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname==='/api/maze/archive'){
      state.reads.push(url.search);
      if(state.options.old) return route.fulfill({status:404,contentType:'text/html',body:'<html>Cannot GET /api/maze/archive</html>'});
      if(state.options.offline) return route.fulfill({status:503,json:{code:'ARCHIVE_UNAVAILABLE'}});
      if(state.options.hold && url.searchParams.get('subProfileId')===profileA) await state.options.hold;
      const month=url.searchParams.get('month')||'2028-03';
      return route.fulfill({json:catalog(month,url.searchParams.get('subProfileId'),state.options)});
    }
    if(url.pathname==='/api/maze/start'){
      state.starts.push(req.postDataJSON());
      return route.fulfill({json:{attemptId,seed:'synthetic',maze:{grid:[['S','X','F','E']],width:4,height:1}}});
    }
    if(url.pathname==='/api/maze/complete'){
      state.completes.push(req.postDataJSON());
      if(state.options.lostSave && state.completes.length===1) return route.abort('connectionreset');
      return route.fulfill({json:{attemptId,time:'8.123',reward:state.options.reward||null,today:'2028-03-01'}});
    }
    if(url.pathname.startsWith('/api/leaderboard/')) return route.fulfill({status:state.leaderboard,json:state.leaderboard===200?[]:{code:'MAZE_NOT_PUBLISHED'}});
    throw new Error(`Unexpected synthetic API request: ${url.pathname}`);
  });
  return state;
}
async function capture(page,name){
  if(!process.env.FC_ARCHIVE_EVIDENCE) return;
  fs.mkdirSync(process.env.FC_ARCHIVE_EVIDENCE,{recursive:true});
  for(const fullPage of [false,true]) await page.screenshot({path:path.join(process.env.FC_ARCHIVE_EVIDENCE,`${name}-${fullPage?'page':'viewport'}.png`),fullPage});
}
for(const [width,height] of [[320,568],[375,667],[390,844],[844,390],[1280,800]]){
  test(`Today/archive/replay/leaderboard at ${width}x${height}`,async({page})=>{
    await page.setViewportSize({width,height}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const state=await setup(page);await page.goto('/mazes');
    await expect(page.getByRole('button',{name:"Play today's maze"})).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const targets=await page.locator('main button:visible').evaluateAll(nodes=>nodes.filter(n=>!n.closest('nav')).map(n=>n.getBoundingClientRect().height));
    expect(Math.min(...targets)).toBeGreaterThanOrEqual(44);
    await capture(page,`${width}-today`);
    await page.getByRole('button',{name:'Previous month',exact:true}).click();
    const leap=page.getByRole('button',{name:/February 29, 2028.*Published, Not completed/});
    await leap.focus();await page.keyboard.press('Enter');
    await expect(leap).toHaveAttribute('aria-pressed','true');expect(state.starts).toHaveLength(0);
    await page.getByRole('button',{name:"View this date's leaderboard"}).click();
    await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
    await expect(page.getByRole('heading',{name:'February 29, 2028 (UTC)'})).toBeVisible();
    await page.getByRole('button',{name:'Choose a date in the archive'}).click();
    const play=page.getByRole('button',{name:'Play February 29, 2028',exact:true});await expect(play).toBeEnabled();
    await capture(page,`${width}-selected`);
    await play.scrollIntoViewIfNeeded();const button=await play.boundingBox(),nav=await page.locator('nav').boundingBox();expect(button.y+button.height).toBeLessThanOrEqual(nav.y);
    await play.click();await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
    expect(state.starts).toEqual([{subProfileId:profileA,date:'2028-02-29'}]);
    for(let i=0;i<4;i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/You finished in/)).toContainText('00:08.123');
    await expect(page.getByRole('button',{name:'Replay Maze'})).toBeEnabled();
    expect(state.completes).toEqual([{subProfileId:profileA,date:'2028-02-29',attemptId}]);
    expect(errors).toEqual([]);
  });
}
test('month/year jump, 31-day list, empty month, calendar semantics and enlarged-text fallback',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await setup(page);await page.goto('/mazes');
  await page.getByLabel('Year',{exact:true}).fill('2028');await page.getByRole('combobox',{name:'Month',exact:true}).selectOption('01');await page.getByRole('button',{name:'Go to month'}).click();
  await expect(page.locator('.archive-list li')).toHaveCount(31);
  await page.getByRole('button',{name:'Calendar',exact:true}).click();await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('columnheader',{name:'Sunday'})).toBeVisible();await capture(page,'1280-calendar');
  await page.getByLabel('Year',{exact:true}).fill('2027');await page.getByRole('button',{name:'Go to month'}).click();
  await expect(page.getByText('No published mazes this month.')).toBeVisible();
  await expect(page.locator('.archive-grid button')).toHaveCount(0);await capture(page,'1280-empty-month');
  await page.getByLabel('Year',{exact:true}).fill('2025');await page.getByRole('combobox',{name:'Month',exact:true}).selectOption('05');await page.getByRole('button',{name:'Go to month'}).click();
  await expect(page.getByRole('button',{name:/May 26, 2025.*Published/})).toBeVisible();
  await page.setViewportSize({width:320,height:568});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await expect(page.getByRole('table')).toHaveCount(0);await expect(page.locator('.archive-list li')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.month-selector h3').evaluate(el=>{const range=document.createRange();range.setStart(el.firstChild,0);range.setEnd(el.firstChild,3);return range.getClientRects().length;})).toBe(1);
  expect(await page.locator('nav img').evaluateAll(images=>images.every(image=>{const a=image.getBoundingClientRect(),b=image.closest('button').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;}))).toBe(true);
  await capture(page,'320-text200');
});
for(const mode of ['old','offline','empty'])test(`${mode} catalog is explicit and never invents admission`,async({page})=>{
  const state=await setup(page,{[mode]:true});await page.goto('/mazes');
  if(mode==='empty'){await expect(page.getByText('No published mazes this month.')).toBeVisible();await expect(page.getByRole('button',{name:"Play today's maze"})).toBeDisabled();}
  else await expect(page.getByRole('alert')).toContainText('Archive temporarily unavailable');
  await page.evaluate(()=>localStorage.setItem('selectedMazeDate','2028-03-01'));await page.goto('/maze');
  if(mode==='empty')await expect(page.getByRole('alert')).toContainText('No published maze');
  else await expect(page.getByRole('alert')).toContainText('Archive temporarily unavailable');
  expect(state.starts).toHaveLength(0);
});
test('missing Today offers a separately confirmed latest publication',async({page})=>{
  const state=await setup(page,{missingToday:true});await page.goto('/mazes');
  await expect(page.getByRole('button',{name:"Play today's maze"})).toBeDisabled();
  await page.getByRole('button',{name:'Play latest published maze'}).click();
  await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
  expect(state.starts[0].date).toBe('2028-02-29');
});
test('late private callback after profile switch never paints another profile completion',async({page})=>{
  let release;const hold=new Promise(resolve=>{release=resolve});const state=await setup(page,{hold});
  await page.goto('/mazes');await expect.poll(()=>state.reads.length).toBe(1);
  await page.evaluate(profileB=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileB,name:'Other player'}));window.dispatchEvent(new Event('activeSubProfileChanged'));},profileB);
  await expect(page.getByRole('button',{name:"Play today's maze"})).toBeEnabled();release();
  await page.getByRole('button',{name:'Previous month',exact:true}).click();
  await expect(page.getByRole('button',{name:/February 28, 2028.*Published, Not completed/})).toBeVisible();
  expect(state.starts).toHaveLength(0);
});
test('lost save recovers original UUID with old backend after profile switch and return',async({page})=>{
  const state=await setup(page,{lostSave:true});await page.goto('/mazes');await page.getByRole('button',{name:"Play today's maze"}).click();
  await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
  for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');await expect(page.getByRole('alert')).toContainText('Could not save');
  state.options.old=true;
  await page.evaluate(profileB=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileB}));window.dispatchEvent(new Event('activeSubProfileChanged'));},profileB);
  await expect(page.getByRole('alert')).toContainText('sign-in or profile changed');
  await page.evaluate(profileA=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileA}));window.dispatchEvent(new Event('activeSubProfileChanged'));},profileA);
  await expect(page.getByRole('button',{name:'Retry saving',exact:true})).toBeVisible();await page.reload();
  await page.getByRole('button',{name:'Retry saving',exact:true}).click();await expect(page.getByText(/You finished in/)).toContainText('00:08.123');
  const originalContext=await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'));
  expect(JSON.parse(originalContext).receipt.attemptId).toBe(attemptId);
  const hidden=await page.evaluate(profileB=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileB}));window.dispatchEvent(new Event('activeSubProfileChanged'));return document.body.innerText;},profileB);
  expect(hidden).not.toMatch(/You finished in|March 1, 2028|Maze Complete!/);
  await page.evaluate(profileA=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileA}));window.dispatchEvent(new Event('activeSubProfileChanged'));},profileA);
  await expect(page.getByText(/You finished in/)).toContainText('00:08.123');
  expect(await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'))).toBe(originalContext);
  expect(state.starts).toHaveLength(1);expect(state.completes).toEqual(Array(2).fill({subProfileId:profileA,date:'2028-03-01',attemptId}));
});
for(const timezoneId of ['America/Los_Angeles','Pacific/Kiritimati','Pacific/Pago_Pago']){
  test(`server UTC identity survives drift/travel in ${timezoneId}`,async({browser})=>{
    const context=await browser.newContext({timezoneId,viewport:{width:390,height:844}}),page=await context.newPage();
    await page.clock.install({time:new Date('1999-12-31T23:00:00Z')});await setup(page);await page.goto('http://127.0.0.1:3101/mazes');
    await expect(page.getByText('March 1, 2028 (UTC)',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Previous month',exact:true}).click();
    await expect(page.getByRole('button',{name:/February 29, 2028.*Published/})).toBeVisible();await context.close();
  });
}
test('UTC rollover revalidates Today without resetting an admitted game',async({page})=>{
  await page.clock.install({time:new Date('2000-01-01T00:00:00Z')});
  const state=await setup(page,{today:'2028-02-29',serverNow:'2028-02-29T23:59:59.000Z',nextDayAt:'2028-03-01T00:00:00.000Z'});
  await page.goto('/mazes');await page.getByRole('button',{name:"Play today's maze"}).click();
  await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
  state.options={};await page.clock.runFor(61000);
  await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();expect(state.starts).toHaveLength(1);
  expect(await page.evaluate(()=>localStorage.getItem('selectedMazeDate'))).toBe('2028-02-29');
});
test('future stored selection and malformed local date never start',async({page})=>{
  const state=await setup(page);await page.goto('/mazes');
  for(const date of ['2028-03-02','2028-02-30']){
    await page.evaluate(date=>localStorage.setItem('selectedMazeDate',date),date);await page.goto('/maze');
    await expect(page.getByRole('alert')).toBeVisible();expect(state.starts).toHaveLength(0);
  }
});
test('reward receipt preserves keyboard access to results navigation and reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await setup(page,{reward:{id:'fixture',name:'Synthetic item',image:'crate.png'}});await page.goto('/mazes');
  await page.getByRole('button',{name:"Play today's maze"}).click();await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
  for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  const crate=page.getByRole('button',{name:'Open reward crate'});await expect(crate).toBeVisible();
  await page.keyboard.press('Tab');await expect(crate).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Replay Maze'})).toBeEnabled();
  await page.getByRole('button',{name:'Browse archive'}).click();await expect(page.getByRole('heading',{name:'Daily Maze Archive'})).toBeVisible();
});
test('corrupt cached profiles keep title/profile navigation usable while archive API is absent',async({page})=>{
  await setup(page,{old:true});await page.goto('/');
  await page.evaluate(()=>{localStorage.setItem('subProfiles','broken-json');localStorage.setItem('activeSubProfile','broken-json');});
  await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page).toHaveURL(/\/profiles$/);
  await expect(page.getByRole('button',{name:/Add Player/})).toBeVisible();
});
test('pending result blocks a different-date new start and remains recoverable from an unavailable catalog',async({page})=>{
  const state=await setup(page);await page.goto('/mazes');
  await page.evaluate(({profileA,attemptId})=>{
    sessionStorage.setItem(`mazeCompletion:${profileA}:2028-02-29`,JSON.stringify({attemptId}));
    localStorage.setItem('selectedMazeDate','2028-03-01');
  },{profileA,attemptId});await page.goto('/maze');
  await expect(page.getByRole('alert')).toContainText('recover it before starting another maze');expect(state.starts).toHaveLength(0);
  state.options.old=true;await page.getByRole('button',{name:'Back to mazes'}).click();
  await expect(page.getByRole('button',{name:'Recover result for February 29, 2028 (UTC)'})).toBeVisible();
});
test('keyboard profile selection and native navigation request only the new owner projection',async({page})=>{
  const state=await setup(page);await page.goto('/mazes');
  await page.evaluate(({profileA,profileB})=>localStorage.setItem('subProfiles',JSON.stringify([{_id:profileA,name:'Player'},{_id:profileB,name:'Other player'}])),{profileA,profileB});
  await page.getByRole('button',{name:'Change profile'}).click();
  const select=page.getByRole('button',{name:'Select player Other player'});await select.focus();await page.keyboard.press('Enter');
  const mazes=page.locator('nav').getByRole('button',{name:'Mazes',exact:true});await mazes.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'Daily Maze Archive'})).toBeVisible();
  await page.getByRole('button',{name:'Previous month',exact:true}).click();
  await expect(page.getByRole('button',{name:/February 28, 2028.*Published, Not completed/})).toBeVisible();
  expect(state.reads.at(-1)).toContain(`subProfileId=${profileB}`);
});
