const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const integrated = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const surface = page => page.locator('[data-maze-surface]');
const player = page => page.locator(integrated ? '.pallet-viewport' : '.maze-cell[data-player=true]');
const position = page => player(page).evaluate(el => [+el.dataset.row, +el.dataset.column]);
const directions = { down: [1, 0, 'Up'], right: [0, 1, 'Left'], left: [0, -1, 'Right'] };
async function setup(page, deterministic = true) {
  if (deterministic) await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
    document.addEventListener('pointerdown', event => { window.surfacePointer = event.pointerId; }, true);
  });
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  const grid = Array.from({ length: 21 }, (_, r) => Array.from({ length: 21 }, (_, c) => !r || !c || r === 20 || c === 20 ? '#' : ' '));
  grid[5][5] = 'S'; grid[4][5] = '#'; grid[5][6] = 'X'; grid[5][7] = 'F'; grid[5][8] = 'E';
  let starts = 0;
  await page.route('**/api/**', route => {
    expect(new URL(route.request().url()).pathname).toBe('/api/maze/start');
    starts++;
    return route.fulfill({ json: { maze: { grid }, attemptId: '01234567-89ab-4cde-8fab-0123456789ab', seed: 'synthetic' } });
  });
  await page.goto('/maze');
  await expect(surface(page)).toHaveCount(1);
  await expect(player(page)).toHaveAttribute('data-row', '5');
  await surface(page).scrollIntoViewIfNeeded();
  if (integrated) await expect.poll(() => page.locator('.pallet-sprite').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  if (deterministic) await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  return () => starts;
}
async function visibleBounds(page) {
  return surface(page).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { left: Math.max(0, r.left), right: Math.min(innerWidth, r.right), top: Math.max(0, r.top), bottom: Math.min(innerHeight, r.bottom) };
  });
}
async function origin(page, label) {
  const b = await visibleBounds(page);
  const roles = integrated
    ? { wall: '[data-role=wall]', player: '[data-role^="explorer-"]', equipment: '[data-role=extinguisher]', fire: '[data-role=fire]', goal: '[data-role=tipi]' }
    : { wall: '.maze-cell[data-terrain=wall]', player: '.maze-cell[data-player]', equipment: '.maze-cell', fire: '.maze-cell', goal: 'img[alt=Goal]' };
  if (label in roles) {
    let targets = page.locator(roles[label]);
    if (!integrated && ['equipment', 'fire'].includes(label)) targets = targets.filter({ hasText: label === 'equipment' ? '🧯' : '🔥' });
    const point = await targets.evaluateAll((elements, b) => {
      for (const el of elements) {
        const r = el.getBoundingClientRect();
        const left = Math.max(r.left, b.left + 6), right = Math.min(r.right, b.right - 6);
        const top = Math.max(r.top, b.top + 6), bottom = Math.min(r.bottom, b.bottom - 6);
        if (right > left && bottom > top) return { x: (left + right) / 2, y: (top + bottom) / 2 };
      }
    }, b);
    // Classic fog hides distant equipment/goal until a later state. Their tile
    // coordinates still exist; surface initiation must work under that overlay.
    if (!point && !integrated) {
      const column = { equipment: 6, fire: 7, goal: 8 }[label];
      return page.locator(`.maze-cell[data-row="5"][data-column="${column}"]`).evaluate(el => {
        const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
    }
    expect(point, `${label} should have a visible contact point`).toBeTruthy();
    return point;
  }
  const x = label.includes('left') ? b.left + 6 : label.includes('right') ? b.right - 6 : (b.left + b.right) / 2;
  const y = label.includes('top') ? b.top + 6 : label.includes('bottom') ? b.bottom - 6 : (b.top + b.bottom) / 2;
  return { x, y };
}
async function shot(page, size) {
  if (!process.env.FC_SURFACE_EVIDENCE_DIR) return;
  fs.mkdirSync(process.env.FC_SURFACE_EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.FC_SURFACE_EVIDENCE_DIR, `${integrated ? 'integrated' : 'classic'}-${size}-surface.png`), fullPage: true });
}
for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
  test.describe(`surface ${width}×${height}`, () => {
    test.use({ viewport: { width, height }, isMobile: width !== 1280, hasTouch: width !== 1280 });
    for (const device of ['mouse', 'touch']) test(`${device} starts on walls, sprites, center, edges and corners`, async ({ page, context }) => {
      test.skip(device === 'touch' && width === 1280, 'Desktop uses native mouse.');
      const starts = await setup(page, device === 'mouse');
      const host = await surface(page).elementHandle();
      const cdp = device === 'touch' ? await context.newCDPSession(page) : null;
      const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      for (const label of ['wall', 'player', 'equipment', 'fire', 'goal', 'center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']) {
        const { x, y } = await origin(page, label);
        const b = await visibleBounds(page);
        const direction = y > b.top + (b.bottom - b.top) * .65 ? (x < (b.left + b.right) / 2 ? 'right' : 'left') : 'down';
        const [dr, dc, opposite] = directions[direction];
        const metrics = () => page.evaluate(() => [scrollX, scrollY, visualViewport.offsetLeft, visualViewport.offsetTop, visualViewport.scale]);
        const before = await metrics();
        if (device === 'mouse') { await page.mouse.move(x, y); await page.mouse.down(); }
        else await touch('touchStart', [{ x, y, id: 1 }]);
        await expect(surface(page)).toHaveAttribute('data-input-phase', 'preview');
        expect(await position(page), `${label}: touching alone cannot teleport`).toEqual([5, 5]);
        expect(await host.evaluate(el => el.hasPointerCapture(window.surfacePointer))).toBe(true);
        if (device === 'mouse') await page.mouse.move(x + dc * 28, y + dr * 28);
        else {
          await page.evaluate(() => { window.surfaceMoved = new Promise(resolve => window.addEventListener('pointermove', () => resolve(true), { once: true })); });
          await touch('touchMove', [{ x: x + dc * 28, y: y + dr * 28, id: 1 }]);
          await page.evaluate(() => window.surfaceMoved);
        }
        if (device === 'mouse') await page.mouse.up(); else await touch('touchEnd', []);
        await expect(surface(page)).toHaveAttribute('data-input-phase', 'idle');
        expect(await position(page), label).toEqual([5 + dr, 5 + dc]);
        expect(await metrics(), `${label}: game drag cannot scroll/pan the page`).toEqual(before);
        expect(await host.evaluate(el => el === document.querySelector('[data-maze-surface]'))).toBe(true);
        await page.keyboard.press(`Arrow${opposite}`);
        expect(await position(page)).toEqual([5, 5]);
      }
      expect(starts()).toBe(1);
      await expect(page.locator('.maze-drag-pad')).toHaveCount(0);
      await shot(page, `${width}x${height}`);
    });
    test('capture survives camera/render changes; interruption requires fresh input', async ({ page }) => {
      await setup(page);
      const { x, y } = await origin(page, 'center');
      const host = await surface(page).elementHandle();
      const cameraBefore = await surface(page).getAttribute('data-camera-y');
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 28);
      await page.clock.runFor(940);
      expect(await position(page)).toEqual([10, 5]);
      expect(await host.evaluate(el => el.hasPointerCapture(window.surfacePointer))).toBe(true);
      if (integrated) expect(Number(await surface(page).getAttribute('data-camera-y'))).toBeGreaterThan(Number(cameraBefore));
      await page.mouse.move(x + 28, y); await page.clock.runFor(180);
      expect(await position(page)).toEqual([10, 6]);
      await page.mouse.move(x, y); await page.clock.runFor(800);
      expect(await position(page)).toEqual([10, 6]);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.mouse.move(x, y + 28); await page.clock.runFor(800);
      expect(await position(page)).toEqual([10, 6]); await page.mouse.up();
      const next = await origin(page, 'center');
      await page.mouse.move(next.x, next.y); await page.mouse.down(); await page.mouse.move(next.x, next.y + 28);
      expect(await position(page)).toEqual([11, 6]);
      await page.setViewportSize({ width: width + 1, height });
      await page.mouse.move(next.x + 28, next.y); await page.clock.runFor(800);
      expect(await position(page)).toEqual([11, 6]); await page.mouse.up();
      await page.keyboard.press('ArrowDown'); expect(await position(page)).toEqual([12, 6]);
    });
    test('fallback cancels a captured drag and transfers gestures to the classic surface', async ({ page }) => {
      test.skip(!integrated, 'Requires the integrated-to-classic runtime switch.');
      const starts = await setup(page);
      const { x, y } = await origin(page, 'center');
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 28);
      expect(await position(page)).toEqual([6, 5]);
      // Activate the fallback while the original contact remains held, as an
      // accessibility command can. Native fallback clicks have separate coverage.
      await page.getByRole('button', { name: 'Use classic view' }).evaluate(button => button.click());
      await expect(page.locator('.pallet-viewport')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Up', exact: true })).toBeFocused();
      const classicPosition = () => page.locator('.maze-cell[data-player]').evaluate(el => [+el.dataset.row, +el.dataset.column]);
      await page.mouse.move(x + 28, y); await page.clock.runFor(800);
      expect(await classicPosition()).toEqual([6, 5]); await page.mouse.up();
      await surface(page).scrollIntoViewIfNeeded();
      const fresh = await origin(page, 'center');
      await page.mouse.move(fresh.x, fresh.y); await page.mouse.down(); await page.mouse.move(fresh.x, fresh.y + 28); await page.mouse.up();
      expect(await classicPosition()).toEqual([7, 5]);
      expect(starts()).toBe(1);
      expect(await surface(page).evaluate(el => getComputedStyle(el).touchAction)).toBe('pinch-zoom');
    });
    test('downward top-edge drags do not scroll; multitouch and cancel stop ownership', async ({ page, context }) => {
      test.skip(width === 1280, 'Native touch emulation uses mobile layouts.');
      await setup(page, false);
      const cdp = await context.newCDPSession(page);
      const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      for (const alignTop of [false, true]) {
        await page.evaluate(align => {
          const top = document.querySelector('[data-maze-surface]').getBoundingClientRect().top + scrollY;
          window.scrollTo(0, align ? top : 0);
        }, alignTop);
        const { x, y } = await origin(page, 'top');
        const before = await page.evaluate(() => [scrollY, visualViewport.offsetTop]);
        await touch('touchStart', [{ x, y, id: 1 }]);
        await touch('touchMove', [{ x, y: y + 45, id: 1 }]);
        await expect(surface(page)).toHaveAttribute('data-input-phase', 'holding');
        await touch('touchStart', [{ x, y: y + 45, id: 1 }, { x: x + 30, y: y + 45, id: 2 }]);
        await expect(surface(page)).toHaveAttribute('data-input-phase', 'idle');
        const stopped = await position(page);
        await touch('touchMove', [{ x, y: y + 60, id: 1 }, { x: x + 30, y: y + 60, id: 2 }]);
        await touch('touchCancel', []); await page.waitForTimeout(500);
        expect(await position(page)).toEqual(stopped);
        expect(await page.evaluate(() => [scrollY, visualViewport.offsetTop])).toEqual(before);
      }
      expect(await surface(page).evaluate(el => getComputedStyle(el).touchAction)).toBe('pinch-zoom');
      expect(await surface(page).evaluate(el => [...el.querySelectorAll('*')].every(child => getComputedStyle(child).touchAction === 'pinch-zoom'))).toBe(true);
      // Browser zoom is allowed; this exercises Chromium's pinch implementation,
      // not physical Safari/PWA/browser-chrome behavior.
      const p = await origin(page, 'center');
      const initialScale = await page.evaluate(() => visualViewport.scale);
      const beforePinch = await position(page);
      await touch('touchStart', [{ x: p.x - 45, y: p.y, id: 1 }, { x: p.x + 45, y: p.y, id: 2 }]);
      for (let n = 1; n <= 8; n++) {
        await touch('touchMove', [{ x: p.x - 45 - n * 8, y: p.y, id: 1 }, { x: p.x + 45 + n * 8, y: p.y, id: 2 }]);
        await page.waitForTimeout(20);
      }
      await touch('touchEnd', []);
      expect(await position(page)).toEqual(beforePinch);
      await expect.poll(() => page.evaluate(() => visualViewport.scale)).toBeGreaterThan(initialScale);
      await expect(surface(page)).toHaveAttribute('data-input-phase', 'idle');
    });
  });
}
