const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const character = process.env.REACT_APP_MAZE_CHARACTER_ART === 'meshy-local' ? (process.env.REACT_APP_MAZE_CHARACTER_SOURCE || 'boy') : 'pilot';
const integrated = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const evidence = process.env.FC_ART_EVIDENCE_DIR;
async function setup(page, cell) {
  await page.addInitScript(cell => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
    localStorage.setItem('mazeDirectionButtons', 'true');
    // Isolate native asset scale from viewport framing; production camera is unchanged.
    if (cell) Object.defineProperty(window, 'innerWidth', { get: () => cell === 36 ? 324 : 420 });
  }, cell);
  const grid = Array.from({ length: 21 }, (_, r) => Array.from({ length: 21 }, (_, c) => !r || !c || r === 20 || c === 20 ? '#' : ' '));
  grid[5][5] = 'S'; grid[5][6] = 'X'; grid[5][7] = 'F'; grid[5][9] = 'E';
  grid[6][5] = '#'; grid[6][7] = '#'; grid[4][7] = '#';
  const requests = [], artRequests = [];
  page.on('request', req => { if (/__local-meshy|\.glb|\.blend/.test(req.url())) artRequests.push(req.url()); });
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  await page.route('**/api/**', r => {
    const url = new URL(r.request().url()).pathname; requests.push(url);
    if (url === '/api/maze/start') return r.fulfill({ json: { maze: { grid }, attemptId: '01234567-89ab-4cde-8fab-0123456789ab' } });
    return r.fulfill({ status: 503, json: { error: 'Local fixture: save interrupted' } });
  });
  await page.goto('/maze');
  await expect(page.locator('[data-maze-surface]')).toHaveCount(1);
  return { requests, artRequests };
}
const imagesReady = page => expect.poll(() => page.locator('.pallet-sprite').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) for (const cell of [36, 48]) for (const dpr of [1, 2]) {
  test.describe(`${width}x${height} cell${cell} dpr${dpr}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor: dpr });
    test(`${character} gameplay scale and four facings`, async ({ page }) => {
      test.skip(!integrated, 'Integrated art matrix');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const { requests, artRequests } = await setup(page, cell);
      await imagesReady(page);
      const surface = page.locator('.pallet-viewport');
      await expect(surface).toHaveAttribute('data-tile', String(cell));
      const metrics = [];
      for (const [direction, row, col] of [['Up',4,5], ['Left',4,4], ['Down',5,4], ['Right',5,5]]) {
        await page.keyboard.press('Arrow' + direction);
        await expect(surface).toHaveAttribute('data-row', String(row));
        await expect(surface).toHaveAttribute('data-column', String(col));
        await imagesReady(page);
        const sprite = page.locator(`[data-role="explorer-${direction.toLowerCase()}"]`).last();
        await expect(sprite).toHaveAttribute('data-character-art', character);
        const metric = await surface.evaluate(el => {
          const body = el.querySelector('[data-role^="explorer-"]:last-of-type') || [...el.querySelectorAll('[data-role^="explorer-"]')].at(-1);
          const imgs = [...el.querySelectorAll('[data-role^="explorer-"]')];
          return { row: +el.dataset.row, column: +el.dataset.column, tile: +el.dataset.tile,
            cameraX: +el.dataset.cameraX, cameraY: +el.dataset.cameraY,
            images: imgs.map(i => ({ src: new URL(i.src).pathname, left: parseFloat(i.style.left), top: parseFloat(i.style.top), width: parseFloat(i.style.width), height: parseFloat(i.style.height) })),
            bodyOrder: [...el.querySelectorAll('.pallet-world > img')].indexOf(body) };
        });
        const [shadow, body] = metric.images;
        const x = cell + (col + .5) * cell, y = cell + (row + .5) * cell * Math.sin(58 * Math.PI / 180);
        expect(body.left + 128 * cell / 224).toBeCloseTo(x, 3);
        expect(body.top + 208 * cell / 224).toBeCloseTo(y, 3);
        expect(shadow.left + 128 * cell / 112).toBeCloseTo(x, 3);
        expect(shadow.top + 150 * cell / 112).toBeCloseTo(y, 3);
        metrics.push({ direction, ...metric });
        if (evidence) {
          fs.mkdirSync(evidence, { recursive: true });
          await page.screenshot({ path: path.join(evidence, `${character}-${width}x${height}-${cell}-dpr${dpr}-${direction}.png`), fullPage: true });
        }
      }
      // Foreground wall follows player in the body DOM paint order.
      const order = await page.locator('.pallet-world').evaluate((el, tile) => {
        const bodies = [...el.querySelectorAll('img')].filter(i => Math.abs(parseFloat(i.style.height) - 352 * tile / 224) < .001);
        const player = bodies.findIndex(i => i.dataset.role.startsWith('explorer-'));
        const wall = bodies.findIndex(i => i.dataset.role === 'wall' &&
          Math.abs(parseFloat(i.style.left) - (tile + 5.5 * tile - 128 * tile / 224)) < .001 &&
          Math.abs(parseFloat(i.style.top) - (tile + 6.5 * tile * Math.sin(58 * Math.PI / 180) - 208 * tile / 224)) < .001);
        return { player, wall };
      }, cell);
      expect(order.player).toBeGreaterThanOrEqual(0);
      expect(order.wall).toBeGreaterThan(order.player);
      await page.keyboard.press('ArrowDown'); // wall: collision retains occupancy
      await expect(surface).toHaveAttribute('data-row', '5');
      await page.getByRole('button', { name: 'Right', exact: true }).tap();
      await expect(surface).toHaveAttribute('data-column', '6');
      await page.keyboard.press('ArrowRight'); // clearing fire stays put
      await expect(surface).toHaveAttribute('data-column', '6');
      await expect(page.locator('[data-role="fire"]')).toHaveCount(0);
      await expect(page.getByRole('status')).toContainText('You stayed in place');
      for (let n = 0; n < 3; n++) await page.keyboard.press('ArrowRight');
      await expect(surface).toHaveAttribute('data-completed', 'true');
      await expect(page.getByRole('dialog', { name: 'Save result' })).toBeVisible();
      await page.keyboard.press('ArrowLeft');
      await expect(surface).toHaveAttribute('data-column', '9');
      expect(requests).toEqual(['/api/maze/start', '/api/maze/complete']);
      expect(artRequests.some(u => /\.glb|\.blend/.test(u))).toBe(false);
      const unique = [...new Set(artRequests)];
      expect(unique.length).toBe(character === 'pilot' ? 0 : 8);
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /__local-meshy|explorer-/.test(r.name)).map(r => ({ path: new URL(r.name).pathname, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, transferSize: r.transferSize })));
      if (evidence) fs.writeFileSync(path.join(evidence, `${character}-${width}x${height}-${cell}-dpr${dpr}.json`), JSON.stringify({ metrics, requests, artRequests: unique.map(u => new URL(u).pathname), resources }, null, 2));
    });
  });
}
test('missing local frames fall back once without blocking input or restarting session', async ({ page }) => {
  test.skip(!integrated || character === 'pilot');
  let misses = 0;
  await page.route('**/__local-meshy/**', route => { misses++; return route.fulfill({ status: 404, body: '' }); });
  const { requests } = await setup(page);
  await expect(page.getByRole('status').filter({ hasText: 'Local explorer' })).toContainText('using pilot');
  await imagesReady(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.pallet-viewport')).toHaveAttribute('data-column', '6');
  await imagesReady(page);
  await page.keyboard.press('ArrowLeft');
  await imagesReady(page);
  await expect(page.locator('[data-role^="explorer-"]')).toHaveCount(2);
  expect(await page.locator('[data-role^="explorer-"]').evaluateAll(imgs => imgs.every(i => i.dataset.characterArt === 'pilot'))).toBe(true);
  expect(misses).toBeLessThanOrEqual(6);
  expect(requests).toEqual(['/api/maze/start']);
});
test('visual gate off cannot request local assets even with local preference', async ({ page }) => {
  test.skip(integrated);
  const { artRequests } = await setup(page);
  await expect(page.locator('.maze-legacy-host')).toBeAttached();
  expect(artRequests).toEqual([]);
});
for (const [width, height] of [[320,568],[390,844],[844,390],[1280,800]]) test(`natural sizing ${width}x${height}`, async ({ page }) => {
  test.skip(!integrated);
  await page.setViewportSize({ width, height });
  await setup(page);
  await imagesReady(page);
  const tile = Math.max(36, Math.min((width - 36) / 8, 48));
  await expect(page.locator('.pallet-viewport')).toHaveAttribute('data-tile', String(tile));
  await page.keyboard.press('ArrowRight');
  await imagesReady(page);
  if (evidence) await page.screenshot({ path: path.join(evidence, `${character}-${width}x${height}-natural.png`), fullPage: true });
});
test('manual local explorer session', async ({ page }) => {
  test.skip(process.env.FC_ART_PLAYTEST !== 'true' || !integrated, 'Explicit local headed review only');
  await setup(page);
  await imagesReady(page);
  await page.pause();
});
