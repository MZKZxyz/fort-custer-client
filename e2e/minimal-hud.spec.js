const { archiveFixture } = require('./archive-fixture.cjs');
const {test,expect}=require('@playwright/test');
test.setTimeout(90000);
const fs=require('node:fs'),path=require('node:path');
const output=process.env.FC_HUD_EVIDENCE;
const id='01234567-89ab-4cde-8fab-0123456789ab';
const pos=page=>page.locator('.maze-cell[data-player]');
for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]])test.describe(`${width}x${height}`,()=>{
 test.use({viewport:{width,height},isMobile:width!==1280,hasTouch:width!==1280});
 test('production HUD, interactions, dialogs, persistence and recovery',async({page,context})=>{
  await page.clock.install();let starts=0,completes=[],pending=[],failed=false;
  await page.addInitScript(()=>{
   localStorage.setItem('token','synthetic-token');localStorage.setItem('activeSubProfile',JSON.stringify({_id:'synthetic-profile'}));localStorage.setItem('selectedMazeDate','2025-05-26');
  });
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  await context.route('**/api/**',async route=>{
    if (archiveFixture(route)) return;
   if(route.request().url().endsWith('/start')){
    starts++;const grid=Array.from({length:13},()=>Array(17).fill('#'));
    for(let c=3;c<=9;c++)grid[6][c]=' ';grid[6][5]='S';grid[6][6]='X';grid[6][7]='F';grid[6][8]='E';grid[5][5]='F';
    return route.fulfill({json:{maze:{grid},attemptId:id,seed:'synthetic'}});
   }
   completes.push(route.request().postDataJSON());await new Promise(resolve=>pending.push(resolve));
   return route.fulfill({status:failed?503:200,json:failed?{error:'Synthetic connection interruption. Retry saving.'}:{time:'8.000',reward:null}});
  });
  async function capture(name){if(!output)return;fs.mkdirSync(output,{recursive:true});for(const fullPage of [false,true])await page.screenshot({path:path.join(output,`${width}x${height}-${name}-${fullPage?'page':'window'}.png`),fullPage});}
  const key=direction=>page.keyboard.press(`Arrow${direction}`);
  await page.goto('/maze');await expect(pos(page)).toHaveAttribute('data-column','5');await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
  if(process.env.FC_HUD_BASELINE==='true'){await capture('before');return;}
  await expect(page.locator('.dpad')).toHaveCount(0);await expect(page.locator('.field-notice')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);await expect(page.locator('.maze-banner,.maze-hud,.pallet-status')).toHaveCount(0);
  await expect(page.locator('.maze-fog')).toHaveCount(1);await expect(page.locator('.pallet-viewport,.maze-viewport')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(1);await expect(page.getByRole('status')).toBeEmpty();await capture('initial');
  await key('Left');await expect(pos(page)).toHaveAttribute('data-column','4');await expect(page.getByRole('status')).toBeEmpty();await capture('moving');await key('Right');
  await page.keyboard.down('ArrowLeft');await page.getByRole('button',{name:'Help',exact:true}).click();await page.clock.runFor(1000);await page.keyboard.up('ArrowLeft');
  await expect(page.getByRole('dialog',{name:'Maze help'})).toBeVisible();await expect(page.locator('#maze-help-title')).toBeFocused();await capture('help');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Help',exact:true})).toBeFocused();
  const stopped=await pos(page).getAttribute('data-column');await page.clock.runFor(1000);expect(await pos(page).getAttribute('data-column')).toBe(stopped);
  // Return from the immediate held step using ordinary commands.
  while(Number(await pos(page).getAttribute('data-column'))<5)await key('Right');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Show direction buttons'}).click();await page.getByRole('button',{name:'Close Controls'}).click();
  for(const button of await page.locator('.dpad-btn').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(48);expect(b.height).toBeGreaterThanOrEqual(48);}
  await capture('directions');await page.getByRole('button',{name:'Left',exact:true}).click();await expect(pos(page)).toHaveAttribute('data-column','4');await page.getByRole('button',{name:'Right',exact:true}).focus();await page.keyboard.press('Enter');await expect(pos(page)).toHaveAttribute('data-column','5');await page.reload();await expect(page.getByRole('button',{name:'Right',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Hide direction buttons'}).click();await page.getByRole('button',{name:'Close Controls'}).click();
  await page.getByRole('button',{name:'Back',exact:true}).click();await capture('quit');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Back',exact:true})).toBeFocused();
  await key('Up');await expect(page.getByRole('status')).toContainText('Fire blocks');await capture('fire-blocked');
  await key('Right');await expect(page.getByRole('img',{name:'Equipment: extinguisher'})).toBeVisible();await capture('equipment');
  await page.keyboard.down('ArrowRight');await page.clock.runFor(1000);await expect(pos(page)).toHaveAttribute('data-column','6');await expect(page.getByRole('status')).toContainText('stayed in place');await capture('fire-cleared');await page.keyboard.up('ArrowRight');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Show direction buttons'}).click();await page.getByRole('button',{name:'Close Controls'}).click();await capture('fire-cleared-directions');
  await page.getByRole('button',{name:'Right',exact:true}).click();await expect(pos(page)).toHaveAttribute('data-column','7');
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Hide direction buttons'}).click();await page.getByRole('button',{name:'Close Controls'}).click();
  await expect(pos(page)).toHaveAttribute('data-column','7');await key('Right');await expect.poll(()=>completes.length).toBe(1);await capture('saving');
  failed=true;pending.shift()();await expect(page.getByRole('dialog',{name:'Save result'})).toBeVisible();await capture('save-error');
  const previousStarts=starts;await page.reload();await expect(page.getByRole('alert')).toContainText('may already be saved');expect(starts).toBe(previousStarts);await capture('recovery');
  await page.getByRole('button',{name:'Retry saving'}).click();await expect.poll(()=>completes.length).toBe(2);await capture('retry-saving');expect(completes[1]).toEqual(completes[0]);expect(completes[0].attemptId).toBe(id);
  failed=false;pending.shift()();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('lastMazeTime'))).toBe('8.000');
  // Independent fresh page for enlarged text and native touch, not recovery replacement props.
  const other=await context.newPage();await other.clock.install();await other.goto('/maze');await expect(other.getByRole('button',{name:'Help',exact:true})).toBeVisible();
  await other.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(()=>other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(output){for(const fullPage of [false,true])await other.screenshot({path:path.join(output,`${width}x${height}-text200-${fullPage?'page':'window'}.png`),fullPage});}
  await other.getByRole('button',{name:'Help',exact:true}).click();
  await expect(other.getByRole('dialog',{name:'Maze help'})).toBeVisible();await expect(other.locator('#maze-help-title')).toBeFocused();
  if(output)for(const fullPage of [false,true])await other.screenshot({path:path.join(output,`${width}x${height}-help200-${fullPage?'page':'window'}.png`),fullPage});
  await other.keyboard.press('Escape');
  await expect(other.getByRole('button',{name:'Help',exact:true})).toBeFocused();
  await other.clock.pauseAt(new Date(await other.evaluate(()=>Date.now())+1000));
  if(width!==1280){
    const surface=other.locator('[data-maze-surface]');await surface.scrollIntoViewIfNeeded();
    const p=await surface.evaluate(el=>{const r=el.getBoundingClientRect();return{x:(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y:(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2};});
    const scroll=await other.evaluate(()=>[scrollX,scrollY]);const cdp=await context.newCDPSession(other);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-30,y:p.y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await expect(pos(other)).toHaveAttribute('data-column','4');
    await other.clock.runFor(1000);await expect(pos(other)).toHaveAttribute('data-column','4');
    expect(await other.evaluate(()=>[scrollX,scrollY])).toEqual(scroll);
  }
  await other.close();
 });
});
