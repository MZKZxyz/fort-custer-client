const { test, expect } = require('@playwright/test');
test('real merged archive/start/complete/daily routes and disposable MongoDB',async({page,request})=>{
  const fixture=await (await request.get('/__fixture')).json();
  await page.addInitScript(({token,profileId})=>{
    localStorage.setItem('token',token);localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileId,name:'Player'}));localStorage.setItem('mazeDirectionButtons','true');
  },fixture);
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto('/mazes');await expect(page.getByRole('button',{name:"Play today's maze"})).toBeEnabled();
  const empty=await (await request.get('/__counts')).json();expect(empty).toEqual({mazeCount:4,attemptCount:0,completed:[]});
  await page.getByRole('button',{name:'Previous month',exact:true}).click();
  await page.getByRole('button',{name:/February 29, 2028.*Not completed/}).click();await page.getByRole('button',{name:'Play February 29, 2028',exact:true}).click();
  await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
  // The unchanged v1 completion service rejects wall-clock runs shorter than 3s.
  await page.waitForTimeout(3100);
  for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/You finished in/)).toBeVisible();
  const savedContext=await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'));
  const attemptId=JSON.parse(savedContext).receipt.attemptId;
  expect(attemptId).toMatch(/^[a-f0-9-]{36}$/);
  await page.route('**/api/maze/archive*',route=>route.fulfill({status:404,contentType:'text/html',body:'Cannot GET /api/maze/archive'}));
  const hidden=await page.evaluate(()=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:'00000000000000000000000b',name:'Player B'}));window.dispatchEvent(new Event('activeSubProfileChanged'));return document.body.innerText;});
  expect(hidden).not.toMatch(/You finished in|February 29, 2028|Maze Complete!/);
  await page.evaluate(profileId=>{localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileId,name:'Player'}));window.dispatchEvent(new Event('activeSubProfileChanged'));},fixture.profileId);
  await expect(page.getByText(/You finished in/)).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('mazeResultContext'))).toBe(savedContext);
  expect((await (await request.get('/__counts')).json()).attemptCount).toBe(1);
  await page.unroute('**/api/maze/archive*');
  await page.getByRole('button',{name:'Browse archive'}).click();
  await expect(page.getByRole('button',{name:/February 29, 2028.*Published, Completed/})).toBeVisible();
  await page.getByRole('button',{name:"View this date's leaderboard"}).click();
  await expect(page.getByRole('cell',{name:'Player',exact:true})).toBeVisible();
  expect(await (await request.get('/__counts')).json()).toEqual({mazeCount:4,attemptCount:1,completed:['2028-02-29']});
  const denied=await request.post('/api/maze/start',{headers:{Authorization:`Bearer ${fixture.token}`},data:{subProfileId:fixture.profileId,date:'2028-03-02'}});
  expect(denied.status()).toBe(404);expect((await denied.json()).code).toBe('MAZE_NOT_PUBLISHED');
  expect((await (await request.get('/__counts')).json()).attemptCount).toBe(1);
});
