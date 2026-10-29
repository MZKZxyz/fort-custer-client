const { archiveFixture } = require('./archive-fixture.cjs');
const { test, expect } = require('@playwright/test');
const cameraEnabled = process.env.REACT_APP_MAZE_CAMERA === 'true';

for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
  { width: 390, height: 240 },
]) {
  for (const pointer of ['touch', 'mouse']) {
    test(`${pointer}: every D-pad direction moves at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
        localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
        localStorage.setItem('selectedMazeDate', '2025-05-26');
      });
      // No walls beside the start: this isolates pointer delivery from collision rules.
      const grid = Array.from({ length: 9 }, () => Array(9).fill(' '));
      grid[4][4] = 'S';
      grid[0][0] = 'E';
      await page.route('**/api/**', async route => {
    if (archiveFixture(route)) return;
        expect(new URL(route.request().url()).pathname).toBe('/api/maze/start');
        await route.fulfill({ json: { maze: { grid, width: 9, height: 9 }, seed: 'synthetic' } });
      });
      // Keep tests offline and independent of external font delivery.
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      await page.route('https://fonts.gstatic.com/**', route => route.abort());
      await page.goto('/maze');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('button', { name: 'Up', exact: true })).toBeVisible();
      // Capture real browser click delivery; no dispatchEvent or forced clicks.
      await page.evaluate(() => {
        window.dpadClicks = [];
        document.addEventListener('click', event => {
          const button = event.target.closest('.dpad-btn');
          if (button) window.dpadClicks.push(button.querySelector('img').alt);
        });
      });
      const player = page.locator('.maze-cell').filter({ hasText: '🧍' });
      const index = () => player.evaluate(element => [...document.querySelectorAll('.maze-cell')].indexOf(element));
      expect(await index()).toBe(40);
      for (const [direction, expectedIndex] of [['Up', 31], ['Down', 40], ['Left', 39], ['Right', 40]]) {
        const button = page.getByRole('button', { name: direction, exact: true });
        // The original fixed-screen layout clips controls on short screens.
        // Scroll explicitly to test pointer delivery separately from layout fit.
        await button.scrollIntoViewIfNeeded();
        const bounds = await button.boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height, `${direction} must fit inside the visible viewport`).toBeLessThanOrEqual(viewport.height);
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;
        expect(await page.evaluate(({ x, y, direction }) => {
          const hit = document.elementFromPoint(x, y)?.closest('.dpad-btn');
          return hit?.querySelector('img').alt === direction;
        }, { x, y, direction }), `${direction} must receive the pointer instead of an overlay`).toBe(true);
        if (pointer === 'touch') await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        await expect.poll(index).toBe(expectedIndex);
      }
      expect(await page.evaluate(() => window.dpadClicks)).toEqual(['Up', 'Down', 'Left', 'Right']);
    });
  }
}

// Sizing must remain width-based: short windows must not collapse the maze.
test.describe('feature-mode board and cell proportions', () => {
  test.use({ isMobile: false, hasTouch: false });
  test('retains readable cell widths across viewport heights', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('mazeDirectionButtons', 'true');
      localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
      localStorage.setItem('selectedMazeDate', '2025-05-26');
    });
    const grid = Array.from({ length: 21 }, () => Array(21).fill(' '));
    grid[10][10] = 'S';
    await page.route('**/api/**', route => archiveFixture(route) || route.fulfill({ json: { maze: { grid }, seed: 'synthetic' } }));
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.goto('/maze');
    await expect(page.locator('.maze-grid')).toBeVisible();
    for (const viewport of [
      { width: 320, height: 568 }, { width: 390, height: 844 },
      { width: 844, height: 390 }, { width: 1280, height: 800 },
      { width: 1440, height: 900 }, { width: 390, height: 320 },
      { width: 390, height: 240 },
    ]) {
      await page.setViewportSize(viewport);
      const legacyWidth = Math.min(viewport.width - 16, viewport.width * 0.95 + 20);
      const tileSize = cameraEnabled
        ? Math.max(36, Math.min((viewport.width - 36) / 8, 48))
        : (legacyWidth - 20) / 21;
      const expectedWidth = cameraEnabled ? 21 * tileSize : legacyWidth;
      await expect.poll(async () => {
        const box = await page.locator('.maze-grid').boundingBox();
        return Math.abs(box.width - expectedWidth);
      }).toBeLessThan(1);
      const tile = await page.locator('.maze-cell').first().boundingBox();
      expect(Math.abs(tile.width - tileSize)).toBeLessThan(1);
    }
  });
});
