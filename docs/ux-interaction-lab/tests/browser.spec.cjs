const { test, expect } = require('@playwright/test');
const board = page => page.locator('#play-board');
const position = page => board(page).getAttribute('data-position');
const button = (page, direction) => page.getByRole('button', { name: direction, exact: true });
async function boot(page) {
  await page.goto('./');
  await expect(board(page)).toHaveAttribute('data-ready', 'true');
}
async function down(page, direction) {
  const element = button(page, direction);
  await element.scrollIntoViewIfNeeded();
  const b = await element.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
}
async function startDrag(page, dx, dy) {
  const pad = page.locator('#drag-pad'); await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(origin.x, origin.y); await page.mouse.down();
  await page.mouse.move(origin.x + dx, origin.y + dy); return origin;
}
async function count(page) { return Number((await page.locator('#command-count').textContent()).split(' ')[0]); }
async function freeze(page) { await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000)); }

test('pointer hold: pickup → stationary clear → fresh press → completion; no click duplicate', async ({ page }) => {
  await boot(page); await freeze(page); await down(page, 'Right');
  expect(await position(page)).toBe('1,2'); expect(await count(page)).toBe(1);
  await page.clock.runFor(399); expect(await count(page)).toBe(1);
  await page.clock.runFor(1); expect(await count(page)).toBe(2);
  expect(await position(page)).toBe('1,2');
  await expect(page.locator('#equipment')).toHaveText('Equipment: empty');
  await expect(page.locator('#feedback')).toContainText('You stayed in place');
  await page.clock.runFor(3000); expect(await count(page)).toBe(2);
  await page.mouse.up(); expect(await count(page)).toBe(2);
  await down(page, 'Right'); expect(await position(page)).toBe('1,3');
  await page.clock.runFor(400); await expect(board(page)).toHaveAttribute('data-completed', 'true');
  const commands = await count(page); await page.clock.runFor(2000);
  await page.mouse.up(); await button(page, 'Left').click(); expect(await count(page)).toBe(commands);
});

test('drag: threshold, neutral, direction preview and stationary-clear latch across steering', async ({ page }) => {
  await boot(page); await page.getByRole('radio', { name: /B Drag/ }).check(); await freeze(page);
  const origin = await startDrag(page, 17, 0); expect(await count(page)).toBe(0);
  await page.mouse.move(origin.x + 25, origin.y + 24); expect(await count(page)).toBe(0);
  await page.mouse.move(origin.x + 30, origin.y); expect(await position(page)).toBe('1,2');
  await page.mouse.move(origin.x, origin.y); await page.clock.runFor(1000); expect(await count(page)).toBe(1);
  await page.mouse.move(origin.x + 30, origin.y); await page.clock.runFor(180);
  await expect(page.locator('#input-phase')).toHaveText('STOPPED');
  await page.mouse.move(origin.x - 35, origin.y); await page.clock.runFor(2000);
  expect(await position(page)).toBe('1,2'); expect(await count(page)).toBe(2);
  await page.mouse.move(2, 2); await page.mouse.up();
  await startDrag(page, 30, 0); expect(await position(page)).toBe('1,3');
  await page.clock.runFor(400); await expect(board(page)).toHaveAttribute('data-completed', 'true');
  await page.mouse.up();
});

for (const input of ['keyboard', 'D-pad keyboard', 'assistive activation', 'touch tap']) {
  test(`${input}: same atomic rule trace`, async ({ page, browser }) => {
    const context = input === 'touch tap' ? await browser.newContext({ hasTouch: true }) : null;
    const p = context ? await context.newPage() : page;
    await boot(p);
    async function step() {
      if (input === 'keyboard') { await board(p).focus(); await p.keyboard.press('ArrowRight'); }
      else if (input === 'D-pad keyboard') { await button(p, 'Right').focus(); await p.keyboard.press('Space'); }
      else if (input === 'assistive activation') await button(p, 'Right').evaluate(e => e.click());
      else await button(p, 'Right').tap();
    }
    for (const [index, expected] of ['1,2', '1,2', '1,3', '1,4'].entries()) {
      await step(); expect(await position(p)).toBe(expected); expect(await count(p)).toBe(index + 1);
    }
    await expect(board(p)).toHaveAttribute('data-completed', 'true');
    await context?.close();
  });
}

for (const scheme of ['hold', 'drag']) for (const interruption of ['pointerup', 'pointercancel', 'lost capture', 'blur', 'hidden', 'modal', 'resize', 'orientation', 'focus', 'timing', 'switch', 'unmount']) {
  test(`${scheme} cancellation: ${interruption} prevents stale movement`, async ({ page }) => {
    await boot(page);
    if (scheme === 'drag') await page.getByRole('radio', { name: /B Drag/ }).check();
    await freeze(page);
    if (scheme === 'hold') await down(page, 'Down'); else await startDrag(page, 0, 30);
    const start = await position(page); expect(await count(page)).toBe(1);
    const pointerTarget = scheme === 'hold' ? button(page, 'Down') : page.locator('#drag-pad');
    if (interruption === 'pointerup') await page.mouse.up();
    else if (interruption === 'pointercancel') await pointerTarget.dispatchEvent('pointercancel', { pointerId: 1 });
    else if (interruption === 'lost capture') await pointerTarget.evaluate(e => e.releasePointerCapture(1));
    else if (interruption === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    else if (interruption === 'hidden') await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    });
    else if (interruption === 'modal') await page.locator('#pause').evaluate(e => e.click());
    else if (interruption === 'resize') await page.setViewportSize({ width: 1000, height: 800 });
    else if (interruption === 'orientation') await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
    else if (interruption === 'focus') await page.locator('#reset').focus();
    else if (interruption === 'timing') await page.locator('#repeat').evaluate(e => { e.value = '100'; e.dispatchEvent(new Event('input')); });
    else if (interruption === 'switch') await page.locator(`[name=scheme][value=${scheme === 'drag' ? 'hold' : 'drag'}]`).evaluate(e => { e.checked = true; e.dispatchEvent(new Event('change')); });
    else if (interruption === 'unmount') await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    const after = await position(page);
    if (interruption !== 'switch') expect(after).toBe(start);
    await page.mouse.move(5, 5); await page.clock.runFor(2500);
    expect(await position(page)).toBe(after);
    expect(await count(page)).toBe(interruption === 'switch' ? 0 : 1);
    await page.mouse.up();
  });
}

test('keyboard repeat is internal, native repeats never rearm after blur or fire', async ({ page }) => {
  await boot(page); await freeze(page); await board(page).focus(); await page.keyboard.down('ArrowRight');
  await page.clock.runFor(400); expect(await count(page)).toBe(2);
  await board(page).dispatchEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: true });
  await page.clock.runFor(2000); expect(await position(page)).toBe('1,2');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await board(page).dispatchEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: true });
  await page.clock.runFor(1000); expect(await count(page)).toBe(2);
  await page.keyboard.up('ArrowRight'); await page.keyboard.press('ArrowRight'); expect(await position(page)).toBe('1,3');
});

test('obstruction latches, and form fields retain arrow-key behavior in either scheme', async ({ page }) => {
  await boot(page); await freeze(page); await down(page, 'Up'); await page.clock.runFor(3000);
  expect(await count(page)).toBe(1); await page.mouse.up();
  await page.locator('#delay').focus(); await page.keyboard.press('ArrowRight');
  expect(await page.locator('#delay').inputValue()).toBe('420'); expect(await count(page)).toBe(1);
  await page.getByRole('radio', { name: /B Drag/ }).check(); await startDrag(page, 0, -30);
  await page.clock.runFor(2000); expect(await count(page)).toBe(1); await page.mouse.up();
});

test('native modal traps and restores focus; close never resumes movement', async ({ page }) => {
  await boot(page); await page.locator('#pause').click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('#resume')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#resume')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#resume')).toBeFocused();
  await page.keyboard.press('ArrowRight'); expect(await count(page)).toBe(0);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#pause')).toBeFocused(); expect(await count(page)).toBe(0);
});

test('multi-pointer interruption and foreign pointer events cannot take over', async ({ page }) => {
  await boot(page); await freeze(page); await down(page, 'Down');
  await button(page, 'Right').dispatchEvent('pointerdown', { pointerId: 2, isPrimary: false, button: 0 });
  await page.clock.runFor(1000); expect(await count(page)).toBe(1);
  await button(page, 'Down').dispatchEvent('pointerup', { pointerId: 99 });
  await page.clock.runFor(1000); expect(await count(page)).toBe(1); await page.mouse.up();
});

for (const [width, height] of [[320,568], [390,844], [844,390], [1280,800]]) {
  test(`responsive controls, reduced motion, and both fixtures at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' }); await boot(page);
    for (const fixture of ['rules', 'garden']) {
      await page.locator('#fixture').selectOption(fixture);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const direction of ['Down', 'Up', 'Right', 'Left']) {
        const element = button(page, direction); await element.scrollIntoViewIfNeeded();
        const bounds = await element.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
        // Actual hit-testing, including the sticky mobile scene.
        expect(await element.evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x+r.width/2, r.y+r.height/2)); })).toBe(true);
        const commands = await count(page); await element.click(); expect(await count(page)).toBe(commands + 1);
        const player = await page.locator('[data-player]').boundingBox(); const frame = await board(page).boundingBox();
        expect(player.x).toBeGreaterThanOrEqual(frame.x - 1); expect(player.y).toBeGreaterThanOrEqual(frame.y - 1);
        expect(player.x + player.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
        expect(player.y + player.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
        if (width < 781) { expect(frame.y).toBeGreaterThanOrEqual(0); expect(frame.y + frame.height).toBeLessThan(height); }
      }
    }
    await page.locator('#mood').selectOption('dusk');
    await expect(page.locator('body')).toHaveAttribute('data-mood', 'dusk');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
}

test('200% text scaling reflows, zoom permitted and no API/storage side effects', async ({ page }) => {
  const apiCalls = [], errors = [];
  page.on('request', r => { if (/\/api\//.test(r.url())) apiCalls.push(r.url()); });
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage writes forbidden in lab'); }; });
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  // Double computed text sizes once, without multiplying inherited sizes again.
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll('p,button,select,label,output,h1,h2,a,small,.pad-note,.hint')]
      .map(e => [e, parseFloat(getComputedStyle(e).fontSize)]);
    for (const [e, size] of sizes) e.style.fontSize = `${size * 2}px`;
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1.5);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await page.locator('#reset').click(); await button(page, 'Right').click();
  expect(apiCalls).toEqual([]); expect(errors).toEqual([]);
});

for (const scheme of ['hold', 'drag']) test(`native touch ${scheme}: repeat, fire latch, release and pointercancel`, async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await boot(page);
  if (scheme === 'drag') await page.getByRole('radio', { name: /B Drag/ }).check();
  await freeze(page);
  const session = await context.newCDPSession(page);
  const target = scheme === 'drag' ? page.locator('#drag-pad') : button(page, 'Right');
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox(); const x = box.x + box.width/2, y = box.y + box.height/2;
  const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ x, y, id: 1 }]);
  if (scheme === 'drag') await touch('touchMove', [{ x: x+30, y, id: 1 }]);
  expect(await position(page)).toBe('1,2'); await page.clock.runFor(400);
  await page.clock.runFor(1800); expect(await count(page)).toBe(2); expect(await position(page)).toBe('1,2');
  await touch('touchEnd', []); expect(await count(page)).toBe(2);
  await page.locator('#reset').click();
  const downTarget = scheme === 'drag' ? page.locator('#drag-pad') : button(page, 'Down');
  await downTarget.scrollIntoViewIfNeeded(); const d = await downTarget.boundingBox(); const tx = d.x+d.width/2, ty = d.y+d.height/2;
  await touch('touchStart', [{ x: tx, y: ty, id: 1 }]);
  if (scheme === 'drag') await touch('touchMove', [{ x: tx, y: ty+30, id: 1 }]);
  expect(await count(page)).toBe(1);
  await touch('touchCancel', []); await page.clock.runFor(1500); expect(await count(page)).toBe(1);
  await expect(page.locator('#input-phase')).toHaveText('IDLE');
  await context.close();
});

test('native page swipe outside input controls still scrolls', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await boot(page);
  const session = await context.newCDPSession(page);
  const start = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 383, y: 700, id: 1 }] });
  for (const y of [650,590,530,470,400]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 383, y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(start + 100);
  expect(await count(page)).toBe(0); await context.close();
});

test('existing garden fixture: complete via pickup and stationary fire clear, with player-follow at every step', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  await page.locator('#fixture').selectOption('garden');
  const route = await page.evaluate(async () => {
    const { move, findStart } = await import('/src/game/movement.js');
    const fixture = await (await fetch('/docs/art/reference-scene/iteration-2/source/fixture.json')).json();
    const grid = fixture.grid.map(row => [...row]);
    const original = JSON.stringify(grid);
    const start = { grid, position: findStart(grid), inventory: [], completed: false };
    const queue = [{ state: start, path: [] }], seen = new Set();
    const fire = grid.flat().filter(tile => tile === 'F').length;
    for (let index = 0; index < queue.length; index++) {
      const { state, path } = queue[index];
      const id = JSON.stringify([state.position, state.inventory, state.grid]);
      if (seen.has(id)) continue; seen.add(id);
      if (state.completed && state.grid.flat().filter(tile => tile === 'F').length < fire) {
        if (JSON.stringify(grid) !== original) throw new Error('Fixture mutated'); return path;
      }
      for (const direction of ['up','down','left','right']) {
        const next = move(state, direction).state;
        if (next !== state) queue.push({ state: next, path: [...path, { direction, position: next.position, inventory: next.inventory }] });
      }
    }
    throw new Error('No route through fire to tipi');
  });
  expect(route.length).toBeGreaterThan(10); await board(page).focus();
  for (const step of route) {
    await page.keyboard.press(`Arrow${step.direction[0].toUpperCase()}${step.direction.slice(1)}`);
    expect(await position(page)).toBe(step.position.join(','));
    await expect(page.locator('#equipment')).toHaveText(`Equipment: ${step.inventory[0] || 'empty'}`);
    const bounds = await board(page).boundingBox(), player = await page.locator('[data-player]').boundingBox();
    expect(player.x).toBeGreaterThanOrEqual(bounds.x-1); expect(player.y).toBeGreaterThanOrEqual(bounds.y-1);
    expect(player.x+player.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);
    expect(player.y+player.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
  }
  await expect(board(page)).toHaveAttribute('data-completed','true');
  expect(await page.locator('#event-log').textContent()).toContain('complete');
});

for (const device of ['mouse', 'touch']) test(`${device} drag continuity across repeated collisions without releasing`, async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: device === 'touch', viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage(); await boot(page);
    await page.getByRole('radio', { name: /B Drag/ }).check(); await freeze(page);
    const pad = page.locator('#drag-pad'); await pad.scrollIntoViewIfNeeded();
    await pad.evaluate(element => element.addEventListener('pointerdown', event => { window.dragTestPointer = event.pointerId; }));
    const box = await pad.boundingBox(), origin = { x: box.x + box.width/2, y: box.y + box.height/2 };
    const cdp = device === 'touch' ? await context.newCDPSession(page) : null;
    const press = async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...origin, id: 1 }] });
      else { await page.mouse.move(origin.x, origin.y); await page.mouse.down(); }
    };
    const steer = async (dx, dy) => {
      const point = { x: origin.x + dx, y: origin.y + dy };
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
      else await page.mouse.move(point.x, point.y);
      // CDP may acknowledge before a touch move reaches the compositor. Wait
      // for the requested direction before advancing the controlled game clock.
      const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP');
      await expect(page.locator('#input-direction')).toContainText(direction);
    };
    const end = async (cancel = false) => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
      else if (cancel) {
        await pad.evaluate(e => e.releasePointerCapture(window.dragTestPointer));
        await page.mouse.move(origin.x, origin.y); // Flush native lostcapture.
      }
      else await page.mouse.up();
    };
    const expectBlocked = async () => {
      await expect(page.locator('#input-phase')).toHaveText('BLOCKED');
      await expect(pad).toHaveAttribute('data-active', 'true');
      expect(await pad.evaluate(e => e.hasPointerCapture(window.dragTestPointer))).toBe(true);
      await expect(page.locator('#drag-preview')).toHaveText('Path blocked — drag another direction');
      const commands = await count(page); await page.clock.runFor(1500);
      expect(await count(page)).toBe(commands); // No wall sliding or extra blocked steps.
    };
    await press(); await steer(0, -30); expect(await position(page)).toBe('1,1'); await expectBlocked();
    for (const [dx, dy, expected, blocked] of [
      [0,30,'2,1',false], [-30,0,'2,1',true], [30,0,'2,2',false], [-30,0,'2,1',false],
    ]) {
      const commands = await count(page); await steer(dx,dy); await page.clock.runFor(179);
      expect(await count(page)).toBe(commands);
      await page.clock.runFor(1); expect(await position(page)).toBe(expected);
      if (blocked) await expectBlocked();
    }
    await page.clock.runFor(180); await expectBlocked();
    await end(); await expect(page.locator('#input-phase')).toHaveText('IDLE');
    await expect(pad).toHaveAttribute('data-active', 'false');
    expect(await pad.evaluate(e => e.hasPointerCapture(window.dragTestPointer))).toBe(false);
    if (!cdp) await page.mouse.move(origin.x, origin.y + 30);
    const commands = await count(page); await page.clock.runFor(1000); expect(await count(page)).toBe(commands);
    await press(); await steer(0, 30); expect(await position(page)).toBe('3,1'); // Clean new drag.
    await steer(-30, 0); await page.clock.runFor(180); await expectBlocked();
    await end(true); await page.clock.runFor(1000);
    await expect(page.locator('#input-phase')).toHaveText('IDLE');
    expect(await position(page)).toBe('3,1');
    if (!cdp) await page.mouse.up();
  } finally { await context.close(); }
});
