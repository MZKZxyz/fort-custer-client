const { archiveFixture } = require('./archive-fixture.cjs');
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
test.use({ trace: { mode: 'on', sources: false } });
const integrated = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const host = page => page.locator('[data-maze-surface]');
const player = page => page.locator(integrated ? '.pallet-viewport' : '.maze-cell[data-player=true]');
async function pos(page, r, c) {
  await expect(player(page)).toHaveAttribute('data-row', String(r));
  await expect(player(page)).toHaveAttribute('data-column', String(c));
}
function fixture(kind) {
  const grid = Array.from({ length: 21 }, () => Array(21).fill('#'));
  for (let c = 3; c <= 12; c++) grid[6][c] = ' ';
  const corner = kind === 'far' ? 7 : 6;
  for (let r = 7; r <= 10; r++) grid[r][corner] = ' ';
  for (let c = 3; c <= corner; c++) grid[10][c] = ' ';
  grid[5][6] = ' '; // T-junction; the controller must not choose this branch.
  grid[6][3] = 'S'; grid[6][5] = 'X'; grid[10][3] = 'E';
  if (kind === 'side-fire') grid[7][5] = 'F';
  if (kind === 'forward-fire') { grid[6][4] = 'X'; grid[6][5] = 'F'; }
  if (kind === 'goal-forward') grid[6][5] = 'E';
  return grid;
}
async function setup(page, kind = 'corners', native = false) {
  const manual = process.env.FC_STEERING_PLAYTEST === 'true';
  if (!manual && !native) await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
  });
  const requests = [];
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  await page.route('**/api/**', route => {
    if (archiveFixture(route)) return;
    const url = new URL(route.request().url()).pathname;
    requests.push({ url, body: route.request().postDataJSON() });
    if (url.endsWith('/start')) return route.fulfill({ json: { maze: { grid: fixture(kind) }, attemptId: '01234567-89ab-4cde-8fab-0123456789ab', seed: 'synthetic' } });
    expect(url).toBe('/api/maze/complete');
    return route.fulfill({ status: 503, json: { error: 'Synthetic save interruption. Retry preserves the attempt.' } });
  });
  await page.goto('/maze'); await pos(page, 6, 3);
  if (integrated) await expect.poll(() => page.locator('.pallet-sprite').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  await host(page).scrollIntoViewIfNeeded();
  if (manual) await page.pause();
  else if (!native) await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  const origin = await host(page).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left) + 18, y: Math.max(0, r.top) + 18 };
  });
  return { ...origin, requests };
}
async function press(page, p) { await page.mouse.move(p.x, p.y); await page.mouse.down(); }
async function steer(page, p, dx, dy) { await page.mouse.move(p.x + dx, p.y + dy); }
async function screenshot(page, size, name) {
  if (!process.env.FC_STEERING_EVIDENCE_DIR) return;
  fs.mkdirSync(process.env.FC_STEERING_EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.FC_STEERING_EVIDENCE_DIR, `${integrated ? 'integrated' : 'classic'}-${size}-${name}.png`), fullPage: false });
}
for (const [width, height] of [[320,568],[390,844],[844,390],[1280,800]]) {
  test.describe(`steering ${width}×${height}`, () => {
    test.use({ viewport: { width, height }, isMobile: width !== 1280, hasTouch: width !== 1280 });
    test('production UI has instructions and no comparison or visible diagnostics', async ({page}) => {
      await setup(page);
      await expect(page.getByRole('combobox',{name:'Drag steering'})).toHaveCount(process.env.REACT_APP_MAZE_INPUT_PREVIEW === 'true' ? 1 : 0);
      await expect(page.locator('#maze-input-help')).toHaveCSS('width','1px');
      if(integrated) {
        await expect(page.getByRole('button',{name:'Use classic view'})).toBeVisible();
        await expect(page.locator('.pallet-position')).toHaveCSS('width','1px');
        await expect(host(page)).toHaveAttribute('aria-describedby','maze-input-help maze-position-help');
      }
    });
    test('two consecutive anticipated corners keep one contact and protected deadlines', async ({ page }) => {
      const p = await setup(page); await press(page, p); await steer(page, p, 30, 0); await pos(page, 6, 4);
      await steer(page, p, 0, 30);
      await page.clock.runFor(399); await pos(page, 6, 4);
      await page.clock.runFor(1); await pos(page, 6, 5);
      await expect(host(page)).toHaveAttribute('data-input-phase','holding');
      await screenshot(page, `${width}x${height}`, 'queued');
      await page.clock.runFor(180); await pos(page, 6, 6);
      await page.clock.runFor(180); await pos(page, 7, 6);
      await page.clock.runFor(180); await pos(page, 8, 6);
      await steer(page, p, -30, 0);
      await page.clock.runFor(180); await pos(page, 9, 6);
      await page.clock.runFor(180); await pos(page, 10, 6);
      await page.clock.runFor(180); await pos(page, 10, 5);
      await page.mouse.up(); await page.clock.runFor(600); await pos(page, 10, 5);
      expect(p.requests).toHaveLength(1);
    });
    test('farther opening expires and identical jitter cannot re-arm; reversal is direct', async ({ page }) => {
      const p = await setup(page, 'far'); await press(page, p); await steer(page, p, 30, 0); await steer(page, p, 0, 30);
      await page.clock.runFor(760); await pos(page, 6, 6);
      await expect(host(page)).toHaveAttribute('data-input-phase','blocked');
      for (const a of [70,80,100,90,75,95]) await steer(page, p, 30*Math.cos(a*Math.PI/180), 30*Math.sin(a*Math.PI/180));
      await page.clock.runFor(1000); await pos(page, 6, 6);
      await steer(page, p, -30, 0); await page.clock.runFor(179); await pos(page, 6, 6);
      await page.clock.runFor(1); await pos(page, 6, 5); await page.mouse.up();
    });
    test('queued side fire pauses without spending equipment; explicit clearing is stationary and terminal', async ({ page }) => {
      const p = await setup(page, 'side-fire'); await press(page, p); await steer(page, p, 30, 0); await steer(page, p, 0, 30);
      await page.clock.runFor(580); await pos(page, 6, 5);
      await expect(page.getByRole('img', { name: 'Equipment: extinguisher' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText('Fire blocks queued travel');
      await steer(page, p, 0, -30); await steer(page, p, 0, 30); await page.clock.runFor(180);
      await pos(page, 6, 5); await expect(page.getByRole('img', { name: 'Equipment: empty' })).toBeVisible();
      await steer(page, p, -30, 0); await steer(page, p, 0, 30); await page.clock.runFor(800); await pos(page, 6, 5);
      await page.mouse.up(); await press(page, p); await steer(page, p, 0, 30); await pos(page, 7, 5); await page.mouse.up();
    });
    test('forward fire is not an anticipated opening', async ({ page }) => {
      const p = await setup(page, 'forward-fire'); await press(page, p); await steer(page, p, 30, 0); await steer(page, p, 0, 30);
      await page.clock.runFor(600); await pos(page, 6, 4);
      await expect(page.getByRole('img', { name: 'Equipment: extinguisher' })).toBeVisible(); await page.mouse.up();
    });
    test('forward goal completes exactly once and clears queued intent', async ({ page }) => {
      const p = await setup(page, 'goal-forward'); await press(page, p); await steer(page, p, 30, 0); await steer(page, p, 0, 30);
      await page.clock.runFor(400); await pos(page, 6, 5);
      await expect(page.getByRole('dialog', { name: 'Save result' })).toBeVisible();
      await page.clock.runFor(1000); await page.mouse.up();
      expect(p.requests.filter(r => r.url.endsWith('/complete'))).toEqual([{ url: '/api/maze/complete', body: {
        subProfileId: 'synthetic-profile', date: '2025-05-26', attemptId: '01234567-89ab-4cde-8fab-0123456789ab',
      } }]);
    });
    test('interactive original/fixed/trailing comparison cancels old input and shows the anchor difference', async ({ page }) => {
      test.skip(process.env.REACT_APP_MAZE_INPUT_PREVIEW !== 'true', 'Comparison is preview-only');
      const p = await setup(page);
      for (const mode of ['legacy','fixed','trailing']) {
        await page.getByRole('combobox', { name: 'Drag steering' }).selectOption(mode);
        await host(page).scrollIntoViewIfNeeded();
        const point = await host(page).evaluate(el => { const r=el.getBoundingClientRect(); return {x:Math.max(0,r.left)+18,y:Math.max(0,r.top)+18}; });
        await press(page, point); await steer(page, point, 240, 0);
        const before = Number(await player(page).getAttribute('data-column'));
        await steer(page, point, 240, 64); await page.clock.runFor(400);
        expect(Number(await player(page).getAttribute('data-column'))).toBe(before+1);
        await page.clock.runFor(360);
        await expect(player(page)).toHaveAttribute('data-row',mode === 'trailing' ? '7' : '6');
        await page.mouse.up();
        if (mode === 'trailing') await page.keyboard.press('ArrowUp');
        // Return to the same initial cell with exact keyboard commands for A/B.
        while (Number(await player(page).getAttribute('data-column')) > 3) await page.keyboard.press('ArrowLeft');
        await pos(page,6,3);
      }
      expect(p.requests).toHaveLength(1);
    });
    test('settings and modal discard queued intent; fallback cancels the old surface owner', async ({ page }) => {
      const p = await setup(page); await press(page,p); await steer(page,p,30,0); await steer(page,p,0,30);
      await page.clock.runFor(400); await pos(page,6,5);
      if (process.env.REACT_APP_MAZE_INPUT_PREVIEW === 'true') await page.getByRole('combobox',{name:'Drag steering'}).selectOption('fixed');
      else await page.keyboard.press('Escape');
      await steer(page,p,0,30); await page.clock.runFor(1000); await pos(page,6,5); await page.mouse.up();
      await page.getByRole('button',{name:'Back',exact:true}).click(); await page.keyboard.press('Escape');
      await page.clock.runFor(800); await pos(page,6,5);
      if(integrated){
        await page.getByRole('button',{name:'Use classic view'}).click();
        await expect(page.locator('.pallet-viewport')).toHaveCount(0);
        await expect(page.locator('.maze-cell[data-player]')).toHaveAttribute('data-column','5');
      }
      expect(p.requests).toHaveLength(1);
    });
    test('native touch anticipates and cancels under controlled deadlines while page offsets stay fixed', async ({page,context})=>{
      test.skip(width===1280,'Desktop mouse coverage; native CDP touch uses mobile layouts.');
      const p=await setup(page);
      const cdp=await context.newCDPSession(page);
      const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
      const scroll=await page.evaluate(()=>[scrollX,scrollY,visualViewport.offsetTop]);
      await touch('touchStart',[{x:p.x,y:p.y,id:1}]);
      await touch('touchMove',[{x:p.x+30,y:p.y,id:1}]);
      await page.clock.runFor(400);
      await pos(page,6,5);
      await touch('touchMove',[{x:p.x,y:p.y+30,id:1}]);
      await page.clock.runFor(360);
      await expect.poll(()=>player(page).getAttribute('data-row').then(Number)).toBeGreaterThan(6);
      await touch('touchCancel',[]);
      const stopped=await player(page).evaluate(el=>[el.dataset.row,el.dataset.column]);
      await page.clock.runFor(500);
      expect(await player(page).evaluate(el=>[el.dataset.row,el.dataset.column])).toEqual(stopped);
      expect(await page.evaluate(()=>[scrollX,scrollY,visualViewport.offsetTop])).toEqual(scroll);
    });
  });
}
