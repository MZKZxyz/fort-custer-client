const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const integrated = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const evidence = process.env.FC_EVIDENCE_DIR;
const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';
const player = page => page.locator(integrated ? '.pallet-viewport' : '.maze-cell[data-player=true]');
async function position(page, row, column) {
  await expect(player(page)).toHaveAttribute('data-row', String(row));
  await expect(player(page)).toHaveAttribute('data-column', String(column));
}
async function setup(page, deterministic = true) {
  if (deterministic && process.env.FC_PLAYTEST !== 'true') {
    await page.clock.install({ time: new Date('2026-10-25T12:00:00Z') });
  }
  const grid = Array.from({ length: 13 }, (_, r) => Array.from({ length: 17 }, (_, c) => !r || !c || r === 12 || c === 16 ? '#' : ' '));
  grid[1][1] = 'S'; grid[1][2] = 'X'; grid[1][3] = 'F'; grid[1][7] = 'E';
  const requests = [];
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('**/api/**', route => {
    requests.push({ url: new URL(route.request().url()).pathname, body: route.request().postDataJSON() });
    if (requests.at(-1).url.endsWith('/start')) return route.fulfill({ json: { maze: { grid }, attemptId, seed: 'synthetic' } });
    // Deliberately keep arrival visible while the completion request is pending.
    return new Promise(() => {});
  });
  await page.goto('/maze');
  await expect(page.getByRole('button', { name: 'Right', exact: true })).toBeVisible();
  await position(page, 1, 1);
  if (process.env.FC_PLAYTEST === 'true') await page.pause();
  else if (deterministic) await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  return requests;
}
async function capture(page, name) {
  if (!evidence) return;
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: path.join(evidence, `${integrated ? 'integrated' : 'classic'}-${name}.png`), fullPage: true });
}
for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
  test.describe(`${width}×${height}`, () => {
    test.use({ viewport: { width, height }, isMobile: width !== 1280, hasTouch: width !== 1280 });
    test('held keyboard, terminal fire, wall steering and exactly-once arrival', async ({ page }) => {
      const requests = await setup(page);
      await page.keyboard.down('ArrowRight');
      await page.clock.runFor(400);
      await expect(page.getByRole('img', { name: 'Equipment: empty' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText('Fire cleared');
      await position(page, 1, 2);
      await page.keyboard.down('ArrowRight');
      await page.clock.runFor(700);
      await position(page, 1, 2);
      await capture(page, `${width}x${height}-cleared`);
      await page.keyboard.up('ArrowRight');
      const pad = page.locator('[data-maze-surface]'); await pad.scrollIntoViewIfNeeded();
      const box = await pad.boundingBox(); const x = box.x + box.width / 2; const y = box.y + box.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x, y - 35);
      await expect(pad).toHaveAttribute('data-input-phase', 'blocked');
      await page.clock.runFor(600); await position(page, 1, 2);
      await page.mouse.move(x, y + 35);
      await page.clock.runFor(180);
      await position(page, 2, 2);
      await page.mouse.move(x, y); // neutral cancels repeats
      await page.clock.runFor(400); await position(page, 2, 2);
      await page.mouse.up();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.down('ArrowRight');
      await page.clock.runFor(1000);
      await position(page, 1, 7);
      await page.clock.runFor(500);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await position(page, 1, 7);
      if (integrated) {
        await expect(page.locator('[data-role=tipi]')).toHaveCount(1);
        await expect(page.locator('[data-role^=explorer]')).toHaveCount(0);
        await page.locator('.pallet-viewport').scrollIntoViewIfNeeded();
      }
      await capture(page, `${width}x${height}-arrival`);
      expect(requests).toEqual([
        { url: '/api/maze/start', body: { subProfileId: 'synthetic-profile', date: '2025-05-26' } },
        { url: '/api/maze/complete', body: { subProfileId: 'synthetic-profile', date: '2025-05-26', attemptId } },
      ]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
    test('modal, focus return, resize and Space/Enter input', async ({ page }) => {
      await setup(page);
      await page.keyboard.down('ArrowDown'); await position(page, 2, 1);
      const back = page.getByRole('button', { name: 'Back', exact: true }); await back.click();
      await page.clock.runFor(500); await position(page, 2, 1);
      await page.keyboard.up('ArrowDown');
      await page.keyboard.press('ArrowRight'); await position(page, 2, 1);
      for (const key of ['Tab', 'Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
      }
      await page.keyboard.press('Escape'); await expect(back).toBeFocused();
      const right = page.getByRole('button', { name: 'Right', exact: true }); await right.focus();
      await page.keyboard.press(' '); await position(page, 2, 2);
      await page.keyboard.press('Enter'); await position(page, 2, 3);
      await page.keyboard.down('ArrowDown'); await position(page, 3, 3);
      await page.setViewportSize({ width: width + 1, height });
      await page.keyboard.down('ArrowDown'); await page.clock.runFor(600);
      await position(page, 3, 3); await page.keyboard.up('ArrowDown');
      await page.keyboard.press('ArrowRight'); await position(page, 3, 4);
    });
    test('pointer fire clear stays terminal through steering until a fresh contact', async ({ page }) => {
      await setup(page);
      const pad = page.locator('[data-maze-surface]'); await pad.scrollIntoViewIfNeeded();
      const box = await pad.boundingBox(); const x = box.x + box.width / 2; const y = box.y + box.height / 2;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 35, y);
      await page.clock.runFor(400);
      await expect(page.getByRole('status')).toContainText('Fire cleared');
      await position(page, 1, 2);
      await page.mouse.move(x, y + 35); await page.clock.runFor(250);
      await page.mouse.move(x + 35, y); await page.clock.runFor(500);
      await position(page, 1, 2); await page.mouse.up();
      await page.getByRole('button', { name: 'Right', exact: true }).click();
      await position(page, 1, 3);
    });
    test('native touch drag redirects at a wall and cancellation stops it', async ({ page, context }) => {
      test.skip(width === 1280, 'Desktop coverage uses native mouse and keyboard.');
      await setup(page, false);
      const pad = page.locator('[data-maze-surface]'); await pad.scrollIntoViewIfNeeded();
      const box = await pad.boundingBox(); const x = box.x + box.width / 2; const y = box.y + box.height / 2;
      const cdp = await context.newCDPSession(page);
      const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      await touch('touchStart', [{ x, y, id: 1 }]);
      await touch('touchMove', [{ x, y: y - 32, id: 1 }]);
      await expect(pad).toHaveAttribute('data-input-phase', 'blocked');
      await touch('touchMove', [{ x, y: y + 32, id: 1 }]);
      await expect.poll(() => player(page).getAttribute('data-row').then(Number)).toBeGreaterThan(1);
      await touch('touchCancel', []);
      await expect(pad).toHaveAttribute('data-input-phase', 'idle');
      const stoppedRow = Number(await player(page).getAttribute('data-row'));
      await page.waitForTimeout(600);
      await position(page, stoppedRow, 1);
      expect(await pad.evaluate(el => getComputedStyle(el).touchAction)).toBe('pinch-zoom');
      expect(await page.locator(integrated ? '.pallet-viewport' : '.maze-grid').evaluate(el => getComputedStyle(el).touchAction)).toBe('pinch-zoom');
      // Native page swiping away from the maze surface must still scroll.
      await page.evaluate(() => window.scrollTo(0, 0));
      const before = await page.evaluate(() => scrollY);
      const outside = await page.locator('.field-meta').boundingBox();
      const outsideY = outside.y + outside.height / 2;
      expect(await page.evaluate(({ x, y }) => !document.elementFromPoint(x, y)?.closest('[data-maze-surface], [data-direction]'), { x: width / 2, y: outsideY })).toBe(true);
      const distance = Math.min(120, outsideY - 10);
      await touch('touchStart', [{ x: width / 2, y: outsideY, id: 2 }]);
      for (let n = 1; n <= 5; n++) {
        await touch('touchMove', [{ x: width / 2, y: outsideY - n * distance / 5, id: 2 }]);
        await page.waitForTimeout(20);
      }
      await touch('touchEnd', []);
      if (await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 20)) {
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
      }
      await position(page, stoppedRow, 1);
    });
  });
}
