const { test, expect } = require('@playwright/test');
test('production ignores local preferences, query and storage without local asset requests', async ({ page }) => {
  test.skip(!process.env.FC_BUILD_DIR, 'Optimized production bundle check');
  const requests = [];
  page.on('request', req => { if (/__local-meshy|source-[12]-1\.15-|\.glb|\.blend/.test(req.url())) requests.push(req.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('REACT_APP_MAZE_CHARACTER_ART', 'meshy-local');
    localStorage.setItem('REACT_APP_MAZE_CHARACTER_SOURCE', 'girl');
  });
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  await page.route('**/api/**', r => r.fulfill({ json: { maze: { grid: [['S', ' ', 'E']] }, attemptId: 'synthetic' } }));
  await page.goto('/maze?REACT_APP_MAZE_CHARACTER_ART=meshy-local&character=girl');
  await expect(page.locator('[data-maze-surface]')).toHaveCount(1);
  if (process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true') {
    await expect(page.locator('.pallet-viewport')).toBeVisible();
    await expect(page.locator('[data-role^="explorer-"]')).toHaveCount(2);
    await expect.poll(() => page.locator('[data-role^="explorer-"]').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  } else await expect(page.locator('.maze-legacy-host')).toBeAttached();
  expect(requests).toEqual([]);
  expect(await page.locator('[data-character-art]').evaluateAll(imgs => imgs.every(i => i.dataset.characterArt === 'pilot'))).toBe(true);
});
