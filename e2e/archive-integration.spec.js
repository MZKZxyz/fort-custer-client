const { test, expect } = require('@playwright/test');
test('exact merged fresh default app, rankings, privacy and old UUID recovery with disposable Mongo', async ({ page, request }) => {
  const fixture = await (await request.get('/__fixture')).json();
  await page.addInitScript(({ token, profileId }) => {
    localStorage.setItem('token', token); localStorage.setItem('activeSubProfile', JSON.stringify({ _id: profileId, name: 'Player' }));
    localStorage.setItem('mazeDirectionButtons', 'true');
  }, fixture);
  await page.route('https://fonts.googleapis.com/**', r => r.abort()); await page.route('https://fonts.gstatic.com/**', r => r.abort());
  const writes = []; page.on('request', req => { if (req.method() === 'POST' && req.url().includes('/api/maze/')) writes.push({ path: new URL(req.url()).pathname, body: req.postDataJSON() }); });
  await page.goto('/mazes'); await expect(page.getByRole('button', { name: "Play today's maze" })).toBeDisabled();
  expect((await (await request.get('/__counts')).json()).attemptCount).toBe(1); // retained old receipt
  await request.post('/__publish'); await page.reload(); await expect(page.getByRole('button', { name: "Play today's maze" })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await page.getByRole('button', { name: /February 29, 2028.*Not completed/ }).click();
  await page.getByRole('button', { name: 'Play February 29, 2028', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Right', exact: true })).toBeVisible(); await request.post('/__advance');
  let lost = false;
  await page.route('**/api/maze/complete', async route => {
    if (!lost) { lost = true; await route.fetch(); return route.abort('connectionreset'); }
    return route.continue();
  });
  const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  for (const action of fixture.solution) { await page.keyboard.press(key[action]); await page.waitForTimeout(110); }
  await expect(page.getByRole('button', { name: 'Retry saving' })).toBeVisible(); await page.reload();
  await page.getByRole('button', { name: 'Retry saving' }).click(); await expect(page.getByText(/You finished in/)).toBeVisible();
  const savedContext = await page.evaluate(() => sessionStorage.getItem('mazeResultContext'));
  const attemptId = JSON.parse(savedContext).receipt.attemptId;
  expect(attemptId).toMatch(/^[a-f0-9-]{36}$/);
  expect(writes.filter(r => r.path.endsWith('/start'))).toHaveLength(1);
  expect(writes.filter(r => r.path.endsWith('/complete')).map(r => r.body)).toEqual(Array(2).fill({ date: '2028-02-29', subProfileId: fixture.profileId, attemptId }));
  await page.route('**/api/maze/archive*', route => route.fulfill({ status: 404, contentType: 'text/html', body: 'Cannot GET /api/maze/archive' }));
  const hidden = await page.evaluate(() => {
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: '00000000000000000000000b', name: 'Player B' }));
    window.dispatchEvent(new Event('activeSubProfileChanged')); return document.body.innerText;
  });
  expect(hidden).not.toMatch(/You finished in|February 29, 2028|Maze Complete!/);
  await page.evaluate(profileId => { localStorage.setItem('activeSubProfile', JSON.stringify({ _id: profileId, name: 'Player' })); window.dispatchEvent(new Event('activeSubProfileChanged')); }, fixture.profileId);
  await expect(page.getByText(/You finished in/)).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('mazeResultContext'))).toBe(savedContext);
  await page.unroute('**/api/maze/archive*'); await page.getByRole('button', { name: 'Browse archive' }).click();
  await expect(page.getByRole('button', { name: /February 29, 2028.*Published, Completed/ })).toBeVisible();
  await page.getByRole('button', { name: "View this date's leaderboard" }).click(); await expect(page.getByRole('listitem').filter({ hasText: '1. Player' })).toBeVisible();
  await page.getByRole('button', { name: 'Weekly', exact: true }).click(); await expect(page.getByRole('listitem').filter({ hasText: '1. Player' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous UTC week' })).toBeDisabled();
  await page.getByRole('button', { name: 'All-time', exact: true }).click(); await expect(page.getByText('Total saved time: 10.000s', { exact: true })).toBeVisible();
  await expect(page.getByText('1 published maze', { exact: true })).toBeVisible(); // excludes old progress
  const alltime = await (await request.get('/api/leaderboard/alltime')).json();
  expect(alltime).toEqual([{ name: 'Player', subProfileId: fixture.profileId, time: '10.000', completedMazes: 1 }]);
  expect(await (await request.get('/api/leaderboard/weekly?start=2025-05-26')).json()).toEqual([]);
  for (const date of ['2025-05-26', '2028-03-02']) {
    const denied = await request.post('/api/maze/start', { headers: { Authorization: `Bearer ${fixture.token}` }, data: { subProfileId: fixture.profileId, date } });
    expect(denied.status()).toBe(404); expect((await denied.json()).code).toBe('MAZE_NOT_PUBLISHED');
  }
  // Original historical receipt recovery remains possible even with an old API catalog outage.
  await request.post('/__snapshot');
  await page.route('**/api/maze/archive*', route => route.fulfill({ status: 404, contentType: 'text/html', body: 'Cannot GET /api/maze/archive' }));
  await page.evaluate(({ profileId, oldDate, oldAttemptId }) => {
    localStorage.setItem('selectedMazeDate', oldDate);
    sessionStorage.setItem(`mazeCompletion:${profileId}:${oldDate}`, JSON.stringify({ attemptId: oldAttemptId }));
  }, fixture);
  await page.goto('/maze'); await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.getByText(/You finished in/)).toContainText('00:12.345');
  const restored = JSON.parse(await page.evaluate(() => sessionStorage.getItem('mazeResultContext')));
  expect(restored.date).toBe(fixture.oldDate); expect(restored.receipt.attemptId).toBe(fixture.oldAttemptId);
  const counts = await (await request.get('/__counts')).json();
  expect(counts).toEqual({ mazeCount: 5, attemptCount: 2, byDate: { '2025-05-26': 1, '2028-02-29': 1 },
    completed: ['2025-05-26', '2028-02-29'], snapshotUnchanged: true, ddl: [] });
  expect(writes.filter(r => r.path.endsWith('/start'))).toHaveLength(1);
});
