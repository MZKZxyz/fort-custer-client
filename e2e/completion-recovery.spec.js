const { test, expect } = require('@playwright/test');

for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
test(`lost completion response survives refresh at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';
  let starts = 0;
  const completions = [];
  await page.addInitScript(() => {
    localStorage.setItem('token', 'synthetic-token');
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
    localStorage.setItem('selectedMazeDate', '2025-05-26');
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/maze/start') {
      starts++;
      return route.fulfill({ json: { attemptId, seed: 'synthetic', maze: { grid: [['S', 'E']] } } });
    }
    expect(path).toBe('/api/maze/complete');
    completions.push(route.request().postDataJSON());
    // Simulate the server having committed but the response being lost.
    if (completions.length === 1) return route.abort('connectionreset');
    return route.fulfill({ json: { attemptId, time: '8.123', reward: null } });
  });
  await page.goto('/maze');
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save your result');
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('may already be saved');
  expect(starts).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByText('You finished in')).toContainText('00:08.123');
  expect(completions).toEqual(Array(2).fill({ subProfileId: 'synthetic-profile', date: '2025-05-26', attemptId }));
  expect(await page.evaluate(() => sessionStorage.getItem('mazeCompletion:synthetic-profile:2025-05-26'))).toBeNull();
});
}
