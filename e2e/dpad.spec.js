const { test, expect } = require('@playwright/test');

for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
]) {
  for (const pointer of ['touch', 'mouse']) {
    test(`${pointer}: every D-pad direction moves at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        localStorage.setItem('token', 'synthetic-token');
        localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
        localStorage.setItem('selectedMazeDate', '2025-05-26');
      });
      // No walls beside the start: this isolates pointer delivery from collision rules.
      const grid = Array.from({ length: 9 }, () => Array(9).fill(' '));
      grid[4][4] = 'S';
      grid[0][0] = 'E';
      await page.route('**/api/**', async route => {
        expect(new URL(route.request().url()).pathname).toBe('/api/maze/start');
        await route.fulfill({ json: { maze: { grid, width: 9, height: 9 }, seed: 'synthetic' } });
      });
      // Keep tests offline and independent of external font delivery.
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      await page.route('https://fonts.gstatic.com/**', route => route.abort());
      await page.goto('/maze');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('button', { name: 'Up', exact: true })).toBeVisible();
      // Capture real browser click delivery. No dispatchEvent, forced clicks, or auto-scroll.
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
