const { archiveFixture } = require('./archive-fixture.cjs');
const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ context }) => { await context.route('**/api/maze/archive*', archiveFixture); });
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const enabled = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const evidence = process.env.FC_EVIDENCE_DIR;
const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';

function gridFor(rows = 13, columns = 17) {
  const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) =>
    !r || !c || r === rows - 1 || c === columns - 1 || (r > 3 && r < rows - 2 && c > 3 && c < columns - 2 && (r % 4 === 0 || c % 4 === 0)) ? '#' : ' '));
  grid[1][1] = 'S'; grid[1][2] = 'X'; grid[1][3] = 'F'; grid[1][5] = 'E';
  return grid;
}
async function setup(page, grid = gridFor()) {
  const requests = [];
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('**/api/**', async route => {
    if (archiveFixture(route)) return;
    const url = new URL(route.request().url()).pathname;
    requests.push({ url, body: route.request().postDataJSON() });
    if (url === '/api/maze/start') return route.fulfill({ json: { maze: { grid }, attemptId, seed: 'synthetic' } });
    expect(url).toBe('/api/maze/complete');
    // Keep the completed scene present for invariant assertions and evidence.
    return route.fulfill({ status: 503, json: { error: 'Synthetic save interruption. Retry to recover.' } });
  });
  await page.goto('/maze');
  await expect(page.locator('.pallet-viewport')).toBeVisible();
  await expect.poll(() => page.locator('.pallet-sprite').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  return requests;
}
async function press(page, direction, touch = false) {
  const button = page.getByRole('button', { name: direction, exact: true });
  if (touch) await button.tap(); else await page.keyboard.press(`Arrow${direction}`);
}
const position = page => page.locator('.pallet-viewport');

test.describe('flagged integration', () => {
test.skip(!enabled, 'Production sprite integration requires exact true opt-in.');
for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
  for (const rows of [13, 21]) {
    test(`playable ${rows} rows at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const requests = await setup(page, gridFor(rows, rows === 13 ? 17 : 21));
      await expect(page.locator('[data-role=tipi]')).toHaveCount(1);
      await expect(page.locator('.pallet-badge').filter({ hasText: /^E$/ })).toHaveCount(0);
      await expect(page.locator('.maze-fog, .maze-legacy-host')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await press(page, 'Up');
      await expect(position(page)).toHaveAttribute('data-row', '1');
      await expect(position(page)).toHaveAttribute('data-column', '1');
      await press(page, 'Right', true);
      await expect(position(page)).toHaveAttribute('data-column', '2');
      await expect(page.getByRole('img', { name: 'Equipment: extinguisher' })).toBeVisible();
      await press(page, 'Right');
      await expect(position(page)).toHaveAttribute('data-column', '2');
      await expect(page.getByRole('img', { name: 'Equipment: empty' })).toBeVisible();
      await expect(page.locator('[data-role=fire]')).toHaveCount(0);
      await expect(page.getByRole('status')).toContainText('You stayed in place');
      // Runtime switch preserves the same grid/position/equipment/attempt.
      if (rows === 13) {
        if (evidence) {
          fs.mkdirSync(evidence, { recursive: true });
          await page.screenshot({ path: path.join(evidence, `${width}x${height}-cleared.png`), fullPage: true });
        }
      }
      await press(page, 'Right', true);
      await expect(position(page)).toHaveAttribute('data-column', '3');
      await press(page, 'Right'); await press(page, 'Right', true);
      await expect(page.getByRole('dialog', { name: 'Save result' })).toBeVisible();
      await expect(position(page)).toHaveAttribute('data-column', '5');
      await expect(position(page)).toHaveAttribute('data-completed', 'true');
      await page.keyboard.press('ArrowLeft');
      await expect(position(page)).toHaveAttribute('data-column', '5');
      expect(requests.map(r => r.url)).toEqual(['/api/maze/start', '/api/maze/complete']);
      expect(requests[1].body).toEqual({ subProfileId: 'synthetic-profile', date: '2025-05-26', attemptId });
    });
  }
}

test('quit dialog contains focus, Escape restores it, fallback continues same attempt', async ({ page }) => {
  const requests = await setup(page);
  const back = page.getByRole('button', { name: 'Back', exact: true });
  await back.click();
  const dialog = page.getByRole('dialog', { name: 'Quit maze' });
  await expect(dialog).toBeVisible();
  for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  }
  await page.keyboard.press('ArrowRight');
  await expect(position(page)).toHaveAttribute('data-column', '1');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(back).toBeFocused();
  await press(page, 'Right'); await press(page, 'Right');
  await page.getByRole('button', { name: 'Use classic view' }).click();
  await expect(page.locator('.pallet-viewport')).toHaveCount(0);
  await expect(page.locator('.maze-cell[data-player=true]')).toHaveAttribute('data-column', '2');
  await expect(page.getByRole('img', { name: 'Equipment: empty' })).toBeVisible();
  await press(page, 'Right');
  await expect(page.locator('.maze-cell[data-player=true]')).toHaveAttribute('data-column', '3');
  expect(requests).toHaveLength(1);
});

test('responsive camera follows outer edges, resizing, enlarged text and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const grid = Array.from({ length: 21 }, () => Array(21).fill(' '));
  grid[0][0] = 'S'; grid[20][20] = 'E';
  await setup(page, grid);
  for (let n = 0; n < 20; n++) await press(page, 'Right');
  for (let n = 0; n < 19; n++) await press(page, 'Down');
  const results = [];
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => position(page).evaluate(el => Math.abs(Number(el.dataset.tile) - Math.max(36, Math.min((innerWidth - 36) / 8, 48))))).toBeLessThan(.01);
    const geometry = await position(page).evaluate(el => {
      const world = el.querySelector('.pallet-world');
      const p = el.querySelector('.pallet-player-cue').getBoundingClientRect();
      const clip = el.getBoundingClientRect();
      return { x: +el.dataset.cameraX, y: +el.dataset.cameraY, width: el.clientWidth, height: el.clientHeight,
        worldWidth: world.offsetWidth, worldHeight: world.offsetHeight, pitch: +el.dataset.pitch,
        visible: p.left >= clip.left && p.right <= clip.right && p.top >= clip.top && p.bottom <= clip.bottom };
    });
    expect(geometry.visible).toBe(true);
    expect(geometry.x).toBeGreaterThanOrEqual(0); expect(geometry.y).toBeGreaterThanOrEqual(0);
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(geometry.worldWidth + 1);
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(geometry.worldHeight + 1);
    results.push({ viewportWidth: width, viewportHeight: height, ...geometry });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
  if (evidence) fs.writeFileSync(path.join(evidence, 'geometry.json'), JSON.stringify(results, null, 2));
});

test('missing sprite offers same-attempt fallback', async ({ page }) => {
  await page.route('**/*wall-daylight-body*.png', route => route.abort());
  // Other sprites load; wall failure is deliberately expected here.
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
  });
  let starts = 0;
  await page.route('**/api/maze/start', route => { starts++; return route.fulfill({ json: { maze: { grid: gridFor() }, attemptId } }); });
  await page.goto('/maze');
  await expect(page.getByRole('alert')).toContainText('Maze artwork could not load');
  await page.getByRole('button', { name: 'Use classic view' }).click();
  await expect(page.locator('.maze-cell[data-player=true]')).toHaveAttribute('data-column', '1');
  expect(starts).toBe(1);
});

test('failed renderer chunk offers classic view without another start', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
  });
  let starts = 0;
  await page.route('**/api/maze/start', route => { starts++; return route.fulfill({ json: { maze: { grid: gridFor() }, attemptId } }); });
  await page.route('**/static/js/*.chunk.js', route => route.abort());
  await page.goto('/maze');
  await expect(page.getByRole('alert')).toContainText('Maze artwork could not load');
  await page.getByRole('button', { name: 'Use classic view' }).click();
  await expect(page.locator('.maze-cell[data-player=true]')).toHaveAttribute('data-column', '1');
  expect(starts).toBe(1);
});

// Art identity is checked in addition to successful image decoding in the route.
test('runtime daylight kit matches the merged pilot byte-for-byte', async () => {
  const manifest = require('../docs/visual-integration/assets/manifest.json');
  const active = manifest.assets.filter(a => a.mood === 'daylight' && a.role !== 'exit');
  expect(active).toHaveLength(15);
  for (const asset of active) {
    const content = fs.readFileSync(path.join(__dirname, '../src/assets/pallet-garden', asset.file));
    expect(crypto.createHash('sha256').update(content).digest('hex')).toBe(asset.sha256);
  }
});

});

test('default build keeps classic rendering and never requests the sprite kit', async ({ page }) => {
  test.skip(enabled || process.env.REACT_APP_MAZE_CAMERA === 'true', 'Default-build assertion requires both presentation flags off.');
  const spriteRequests = [];
  page.on('request', request => { if (/daylight|945\.|PalletMaze/.test(request.url())) spriteRequests.push(request.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('**/api/maze/start', route => route.fulfill({ json: { maze: { grid: gridFor() }, attemptId } }));
  await page.goto('/maze');
  await expect(page.locator('.maze-legacy-host')).toBeAttached();
  await expect(page.locator('.pallet-viewport')).toHaveCount(0);
  await press(page, 'Right'); await press(page, 'Right');
  await expect(page.locator('.maze-cell[data-player=true]')).toHaveAttribute('data-column', '2');
  expect(spriteRequests).toEqual([]);
  if (evidence) for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: path.join(evidence, `${width}x${height}-classic.png`), fullPage: true });
  }
});

test('classic fallback keeps focus when optional directions are hidden', async ({page}) => {
  test.skip(!enabled, 'Requires the local integrated opt-in build');
  const requests=await setup(page);
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByRole('button',{name:'Hide direction buttons'}).click();
  await page.getByRole('button',{name:'Close Controls'}).click();
  await page.getByRole('button',{name:'Use classic view'}).click();
  await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeFocused();
  await expect(page.locator('.maze-cell[data-player]')).toHaveAttribute('data-column','2');
  await expect(page.locator('.maze-fog')).toHaveCount(1);
  expect(requests.filter(r=>r.url.endsWith('/start'))).toHaveLength(1);
});
