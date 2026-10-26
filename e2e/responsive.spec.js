const { test, expect } = require('@playwright/test');
const cameraEnabled = process.env.REACT_APP_MAZE_CAMERA === 'true';

const viewports = [[320,568], [375,667], [390,844], [412,915], [844,390], [1280,800], [1440,900]];
for (const [width, height] of viewports) {
  test(`calendar, navigation and maze remain reachable at ${width}×${height}`, async ({ page }) => {
    test.setTimeout(60000); // Visits several routes and performs native touch gestures.
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'synthetic');
      localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'fixture', name: 'Player' }));
      localStorage.setItem('selectedMazeDate', '2025-05-26');
    });
    const grid = Array.from({ length: 21 }, () => Array(21).fill(' '));
    grid[10][10] = 'S';
    grid[0][0] = 'E';
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/maze/start') return route.fulfill({ json: { maze: { grid }, seed: 'fixture' } });
      if (path === '/api/users/subprofile/fixture') return route.fulfill({ json: { subProfile: { progress: {} }, today: '2025-05-26' } });
      if (path.startsWith('/api/leaderboard/')) return route.fulfill({ json: [] });
      if (path === '/api/maze/rewards') return route.fulfill({ json: [] });
      throw new Error(`Unexpected API request: ${path}`);
    });
    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    await page.route('https://fonts.gstatic.com/**', r => r.abort());
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Use a browser touch gesture, not scrollIntoView, to prove scrolling is enabled.
    const swipeUp = async (x = width / 2, startY = height - 110, distance = height - 150) => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: startY - i * distance / 10 }] });
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    };
    await page.goto('/mazes');
    const play = page.getByRole('button', { name: 'Play May 26, 2025' });
    await expect(play).toBeEnabled();
    await noOverflow();
    if (width >= 1280) {
      const initialPlay = await play.boundingBox();
      const initialNav = await page.locator('nav').boundingBox();
      expect(initialPlay.y + initialPlay.height).toBeLessThanOrEqual(initialNav.y);
    }
    const calendarOverflows = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight);
    await swipeUp();
    if (calendarOverflows) await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await play.scrollIntoViewIfNeeded();
    const box = await play.boundingBox();
    const nav = await page.locator('nav').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
    await play.tap();
    await expect(page).toHaveURL(/\/maze$/);
    if (cameraEnabled) {
      await expect(page.locator('.maze-viewport')).toBeVisible();
      await expect(page.locator('.maze-fog')).toHaveCount(0);
      await expect(page.locator('.maze-legacy-host')).toHaveCount(0);
    } else {
      await expect(page.locator('.maze-legacy-host')).toBeAttached();
      await expect(page.locator('.maze-fog')).toBeVisible();
      await expect(page.locator('.maze-viewport')).toHaveCount(0);
    }
    await expect(page.locator('.maze-slot')).toBeVisible();
    // Preserve width-based tile size, independent of viewport height.
    const tile = await page.locator('.maze-cell').first().boundingBox();
    expect(tile.width).toBeGreaterThanOrEqual(13);
    await noOverflow();
    const mazeOverflows = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight);
    // The classic border can reach the display edge. Hit-test real outside
    // content instead of assuming that a five-pixel margin is scrollable.
    const outside = await page.locator('#maze-input-help').boundingBox();
    const outsideY = outside.y + outside.height / 2;
    expect(await page.evaluate(({ x, y }) => !document.elementFromPoint(x, y)?.closest('[data-maze-surface], [data-direction]'), { x: width / 2, y: outsideY })).toBe(true);
    const beforeScroll = await page.evaluate(() => scrollY);
    await swipeUp(width / 2, outsideY, Math.min(120, outsideY - 10));
    if (mazeOverflows) await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeScroll);
    const playerIndex = () => page.locator('.maze-cell').filter({ hasText: '🧍' }).evaluate(el => [...document.querySelectorAll('.maze-cell')].indexOf(el));
    expect(await playerIndex()).toBe(220);
    await page.getByRole('button', { name: 'Right', exact: true }).tap();
    expect(await playerIndex()).toBe(221);
    await page.keyboard.press('ArrowLeft');
    expect(await playerIndex()).toBe(220);
    await page.getByRole('button', { name: 'Back', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeInViewport();
    await page.getByRole('button', { name: 'Cancel' }).tap();
    await page.getByRole('button', { name: 'Back', exact: true }).tap();
    await page.getByRole('button', { name: 'Yes', exact: true }).tap();
    await expect(page).toHaveURL(/\/mazes$/);
    await page.locator('nav').getByAltText('Collection', { exact: true }).tap();
    await expect(page).toHaveURL(/\/collection$/);
    await expect(page.getByText("You haven't collected any items yet.")).toBeVisible();
    await noOverflow();
    await page.locator('nav').getByAltText('Leaderboard', { exact: true }).tap();
    await expect(page).toHaveURL(/\/leaderboard$/);
    await page.getByRole('button', { name: 'Weekly', exact: true }).tap();
    await noOverflow();
    await page.goto('/profiles');
    await noOverflow();
    await page.goto('/results');
    await noOverflow();
  });
}

for (const [width, height] of viewports) {
  test(`title and account forms fit at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route('**/api/**', () => { throw new Error('Account layout tests must not submit to an API'); });
    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    await page.route('https://fonts.gstatic.com/**', r => r.abort());
    await page.goto('/');
    await page.getByRole('button', { name: 'Play', exact: true }).tap();
    await expect(page).toHaveURL(/\/login$/);
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByPlaceholder('Email').fill('fixture@example.invalid');
      const submit = page.getByRole('button', { name: path === '/login' ? 'Login' : 'Register', exact: true });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
      const box = await submit.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  });
}
