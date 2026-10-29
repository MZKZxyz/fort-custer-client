const { archiveFixture } = require('./archive-fixture.cjs');
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

// Only these two geometry/evidence cases require the opted-in camera.
test.skip(process.env.REACT_APP_MAZE_CAMERA !== 'true', 'Camera requires REACT_APP_MAZE_CAMERA=true');
const viewports = [[320,568],[375,667],[390,844],[412,915],[844,390],[1280,800],[390,240]];
for (const [rows, columns] of [[13,17],[21,21]]) {
  test(`camera geometry, visibility, resize and motion ${rows}×${columns}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('token','synthetic');
      localStorage.setItem('activeSubProfile',JSON.stringify({_id:'fixture'}));
      localStorage.setItem('selectedMazeDate','2025-05-26');
      Math.random=()=>0;
    });
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());
    await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    const grid=Array.from({length:rows},()=>Array(columns).fill(' '));
    for (let c=2;c<6;c++) grid[2][c]='#';
    grid[3][5]='#';
    grid[0][0]='S'; grid[1][1]='F'; grid[1][2]='X'; grid[1][3]='E';
    await page.route('**/api/**',r=>archiveFixture(r) || r.fulfill({json:{maze:{grid},seed:'camera',attemptId:'camera-attempt'}}));
    await page.goto('/maze');
    await expect(page.locator('.maze-viewport')).toBeVisible();
    const measurements=[]; const shots=[];
    for(const [width,height] of viewports) {
      await page.setViewportSize({width,height});
      await expect.poll(()=>page.locator('.maze-cell').first().evaluate(e=>e.getBoundingClientRect().width)).toBeCloseTo(Math.max(36,Math.min((width-36)/8,48)),1);
      await page.waitForTimeout(50);
      const measurement=await page.locator('.maze-viewport').evaluate(v=>{
        const t=v.querySelector('.maze-cell').getBoundingClientRect();
        return {width:v.clientWidth,height:v.clientHeight,tileWidth:t.width,tileHeight:t.height,columns:v.clientWidth/t.width,rows:v.clientHeight/t.height,scrollX:v.scrollLeft,scrollY:v.scrollTop};
      });
      measurements.push({viewport:`${width}×${height}`,...measurement});
      if(rows===13) { await page.evaluate(()=>window.scrollTo(0,0)); shots.push({label:`${width}×${height} initial`,data:(await page.screenshot()).toString('base64')}); }
      if(width<height) expect(measurement.columns).toBeGreaterThanOrEqual(7);
      if(width<height) expect(measurement.columns).toBeLessThanOrEqual(9);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('.maze-viewport').scrollIntoViewIfNeeded();
    await expect(page.getByAltText('Goal',{exact:true})).toBeVisible(); // outside old radius-one
    expect(await page.locator('.maze-fog').count()).toBe(0);

    await page.evaluate(() => {
      window.cameraPerf={frames:[],inputs:[]}; let previous;
      const frame = now => { if(previous) window.cameraPerf.frames.push(now-previous); previous=now; requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
      window.addEventListener('keydown', () => { const start=performance.now(); requestAnimationFrame(()=>window.cameraPerf.inputs.push(performance.now()-start)); });
    });
    const start=performance.now();
    const check=async()=>{
      const c=await page.locator('.maze-viewport').evaluate(v=>{
        const p=v.querySelector('[data-player]'); const t=p.getBoundingClientRect(); const b=v.getBoundingClientRect();
        return {x:t.x-(b.x+v.clientLeft),y:t.y-(b.y+v.clientTop),w:t.width,h:t.height,vw:v.clientWidth,vh:v.clientHeight,sx:v.scrollLeft,sy:v.scrollTop,worldW:v.scrollWidth,worldH:v.scrollHeight};
      });
      expect(c.x).toBeGreaterThanOrEqual(-1); expect(c.y).toBeGreaterThanOrEqual(-1);
      expect(c.x+c.w).toBeLessThanOrEqual(c.vw+1); expect(c.y+c.h).toBeLessThanOrEqual(c.vh+1);
      expect(c.sx+c.vw).toBeLessThanOrEqual(c.worldW+1); expect(c.sy+c.vh).toBeLessThanOrEqual(c.worldH+1);
    };
    // Traverse outer edges without touching the goal; resize mid-run, no new attempt.
    for(const [key,count] of [['ArrowRight',columns-1],['ArrowDown',rows-1],['ArrowLeft',columns-1],['ArrowUp',rows-1]]) {
      for(let i=0;i<count;i++) { await page.keyboard.press(key); await check(); }
      if(rows===13 && key==='ArrowDown') shots.push({label:'390×844 bottom-right edge',data:(await page.screenshot()).toString('base64')});
    }
    for(let i=0;i<Math.floor(columns/2);i++) await page.keyboard.press('ArrowRight');
    for(let i=0;i<Math.floor(rows/2);i++) await page.keyboard.press('ArrowDown');
    if(rows===13) shots.push({label:'390×844 mid-grid',data:(await page.screenshot()).toString('base64')});
    await page.setViewportSize({width:844,height:390}); await check();
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.5});
    expect(await page.evaluate(()=>visualViewport.scale)).toBe(1.5);
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.getByRole('button',{name:'Right',exact:true}).focus();
    await expect(page.getByRole('button',{name:'Right',exact:true})).toBeFocused();
    const pacing=await page.evaluate(()=>{const summary=a=>{a.sort((x,y)=>x-y);return {samples:a.length,medianMs:a[Math.floor(a.length/2)],worstMs:a[a.length-1]};};return {frames:summary(window.cameraPerf.frames),inputToNextFrame:summary(window.cameraPerf.inputs)};});
    measurements.push({pacing,traversalWallTimeMs:performance.now()-start,note:'Includes Playwright round trips/assertions; not a frame benchmark',browser:await page.context().browser().version(),domCells:await page.locator('.maze-cell').count()});
    if(rows===13) { const sheet=await page.context().newPage(); await sheet.setViewportSize({width:1020,height:1380}); await sheet.setContent('<style>body{margin:0;background:#eee;font:16px sans-serif;display:grid;grid-template-columns:repeat(3,340px)}figure{margin:10px;text-align:center}img{width:320px;height:410px;object-fit:contain;background:#ddd}figcaption{height:24px}</style>'+shots.map(s=>`<figure><figcaption>${s.label}</figcaption><img src="data:image/png;base64,${s.data}"></figure>`).join('')); await sheet.screenshot({path:'docs/viewport-camera/evidence/contact-sheet.png',fullPage:true}); await sheet.close(); }
    fs.writeFileSync(`docs/viewport-camera/evidence/${rows}x${columns}.json`,JSON.stringify(measurements,null,2)+'\n');
  });
}
