const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const row = { name: 'Fresh Player', subProfileId: 'profile-a', completedMazes: 1, time: '8.123' };
async function setup(page, options = {}) {
  const state = { catalogMode: 'ready', scoreStatus: 200, rows: [], reads: [], ...options };
  await page.addInitScript(() => { localStorage.setItem('selectedMazeDate', '2025-09-01'); localStorage.setItem('token', 'synthetic-token'); localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile-a', name: 'Player' })); });
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()); state.reads.push(url.pathname + url.search);
    if (url.pathname === '/api/maze/archive') {
      if (state.catalogMode === 'old') return route.fulfill({ status: 404, contentType: 'text/html', body: 'Cannot GET /api/maze/archive' });
      if (state.catalogMode === 'offline') return route.fulfill({ status: 503, json: { code: 'ARCHIVE_UNAVAILABLE' } });
      if (state.catalogMode === 'invalid') return route.fulfill({ json: { items: [] } });
      const month = url.searchParams.get('month') || '2027-01';
      const today = state.today || '2027-01-03';
      const first = state.empty ? null : '2026-12-28';
      const dates = state.empty ? [] : ['2026-12-28', ...(state.missingToday ? [] : [today])];
      const item = date => ({ date, publicationEra: state.catalogMode === 'legacy' ? 'legacy' : 'year-round-v1' });
      return route.fulfill({ json: { today, serverNow: `${today}T12:00:00.000Z`, nextDayAt: state.nextDayAt || '2027-01-04T00:00:00.000Z', month,
        firstPublishedDate: first, lastPublishedDate: dates.at(-1) || null,
        todayMaze: state.empty || state.missingToday ? { date: today, available: false } : { ...item(today), available: true },
        items: dates.filter(d => d.startsWith(month)).map(item) } });
    }
    if (url.pathname.startsWith('/api/leaderboard/')) {
      if (state.hold) await state.hold;
      return route.fulfill({ status: state.scoreStatus, json: state.scoreStatus === 200 ? state.rows : { code: state.scoreStatus === 404 ? 'MAZE_NOT_PUBLISHED' : 'LEADERBOARD_UNAVAILABLE' } });
    }
    throw Error(`Unexpected request: ${url.pathname}`);
  });
  return state;
}
const boards = state => state.reads.filter(url => url.startsWith('/api/leaderboard/'));
async function capture(page, name) {
  if (!process.env.FC_RANKING_EVIDENCE) return;
  fs.mkdirSync(process.env.FC_RANKING_EVIDENCE, { recursive: true });
  await page.screenshot({ path: path.join(process.env.FC_RANKING_EVIDENCE, `${name}.png`), fullPage: true });
}
for (const mode of ['old', 'offline', 'invalid', 'legacy']) test(`${mode} catalog blocks every board even when older endpoints would return scores`, async ({ page }) => {
  const state = await setup(page, { catalogMode: mode, rows: [{ ...row, name: 'Historical test player' }] });
  await page.goto('/leaderboard'); await expect(page.getByRole('alert')).toBeVisible();
  for (const frame of ['Daily', 'Weekly', 'All-time']) {
    await page.getByRole('button', { name: frame, exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByText('Historical test player')).toHaveCount(0);
    await expect(page.getByText('No fresh archive saved times yet.')).toHaveCount(0);
  }
  expect(boards(state)).toEqual([]);
  if (mode === 'old') await capture(page, 'old-backend-all-time-neutral');
  state.catalogMode = 'ready'; state.rows = [row]; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.leaderboard-list:visible li, .leaderboard-table:visible tbody tr').filter({ hasText: 'Fresh Player' })).toBeVisible();
  expect(boards(state)).toEqual(['/api/leaderboard/alltime']);
});
for (const [width, height] of [[320, 568], [375, 667], [390, 844], [844, 390], [1280, 800]]) test(`fresh weekly UTC keyboard and all-time at ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height }); const errors = []; page.on('pageerror', e => errors.push(e.message));
  const state = await setup(page); await page.goto('/leaderboard?date=2026-12-28');
  await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
  const weekly = page.getByRole('button', { name: 'Weekly', exact: true });
  await weekly.focus(); await page.keyboard.press('Enter'); await expect(weekly).toHaveAttribute('aria-pressed', 'true'); await expect(weekly).toBeFocused();
  await expect(page.getByText('January 3, 2027 – January 9, 2027 (UTC)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next UTC week' })).toBeDisabled();
  const prev = page.getByRole('button', { name: 'Previous UTC week' }); await prev.focus();
  expect(await prev.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter'); await expect(page.getByText('December 27, 2026 – January 2, 2027 (UTC)', { exact: true })).toBeVisible();
  await expect(prev).toBeDisabled(); await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
  expect(boards(state)).toContain('/api/leaderboard/weekly?start=2026-12-27');
  await page.getByRole('button', { name: 'Current UTC week' }).click();
  await expect(page.getByText('January 3, 2027 – January 9, 2027 (UTC)', { exact: true })).toBeVisible();
  if (width === 320) await capture(page, '320-weekly-empty');
  const targets = await page.locator('main button:visible').evaluateAll(nodes => nodes.filter(n => !n.closest('nav')).map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
  expect(targets.every(t => t.width >= 44 && t.height >= 44)).toBe(true);
  state.rows = [row]; await page.getByRole('button', { name: 'All-time', exact: true }).click();
  await expect(page.locator('.leaderboard-list:visible li, .leaderboard-table:visible tbody tr').filter({ hasText: 'Fresh Player' })).toBeVisible();
  await expect(page.getByRole(width <= 600 ? 'list' : 'table', { name: 'All-time fresh archive saved times' })).toBeVisible();
  expect(boards(state).at(-1)).toBe('/api/leaderboard/alltime');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 320) {
    await capture(page, '320-all-time-list');
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.leaderboard-list').scrollIntoViewIfNeeded(); await capture(page, '320-all-time-text200');
    const bottom = await page.locator('.leaderboard-list').boundingBox(), nav = await page.locator('nav').boundingBox();
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(nav.y);
  }
  expect(errors).toEqual([]);
});
for (const date of ['garbage', '2025-05-26', '2099-01-01']) test(`direct entry date ${date} cannot select old/future weekly rankings`, async ({ page }) => {
  await page.clock.install({ time: new Date('2099-01-01T00:00:00Z') });
  const state = await setup(page); await page.goto(`/leaderboard?date=${date}`);
  if (date === 'garbage') {
    await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
    expect(boards(state)).toEqual(['/api/leaderboard/daily?date=2027-01-03']);
  } else {
    await expect(page.getByText('No published maze is available for this selection.')).toBeVisible();
    expect(boards(state)).toEqual([]);
  }
  await page.getByRole('button', { name: 'Weekly', exact: true }).click();
  await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
  expect(boards(state).at(-1)).toBe('/api/leaderboard/weekly?start=2027-01-03');
});
test('empty launch and missing today distinguish unpublished daily from valid empty aggregates', async ({ page }) => {
  const state = await setup(page, { empty: true }); await page.goto('/leaderboard');
  await expect(page.getByText('No published maze is available for this selection.')).toBeVisible();
  await page.getByRole('button', { name: 'Weekly', exact: true }).click(); await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous UTC week' })).toBeDisabled();
  state.empty = false; state.missingToday = true;
  await page.goto('/leaderboard?date=2027-01-03'); await expect(page.getByText('No published maze is available for this selection.')).toBeVisible();
  expect(boards(state).filter(url => url.includes('daily'))).toEqual([]);
  await page.getByRole('button', { name: 'All-time', exact: true }).click(); await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
});
test('daily 404, aggregate 503, retry and catalog loss do not resurrect cached scores', async ({ page }) => {
  const state = await setup(page, { scoreStatus: 404 }); await page.goto('/leaderboard?date=2026-12-28');
  await expect(page.getByText('No published maze is available for this date.')).toBeVisible();
  state.scoreStatus = 503; await page.getByRole('button', { name: 'Weekly', exact: true }).click();
  await expect(page.getByText('Leaderboard could not be loaded. Please retry.')).toBeVisible();
  state.scoreStatus = 200; state.rows = [row]; await page.getByRole('button', { name: 'Retry leaderboard' }).click();
  await expect(page.locator('.leaderboard-list:visible li, .leaderboard-table:visible tbody tr').filter({ hasText: 'Fresh Player' })).toBeVisible();
  state.catalogMode = 'offline'; await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('alert')).toContainText('Archive temporarily unavailable'); await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'All-time', exact: true }).click(); await expect(page.getByRole('table')).toHaveCount(0);
  expect(boards(state).some(url => url.endsWith('/alltime'))).toBe(false);
});
test('delayed aggregate response cannot cross catalog revalidation failure', async ({ page }) => {
  let release; const state = await setup(page); await page.goto('/leaderboard?date=2026-12-28');
  await expect(page.getByText('No fresh archive saved times yet.')).toBeVisible();
  state.hold = new Promise(resolve => { release = resolve; }); state.rows = [row];
  await page.getByRole('button', { name: 'All-time', exact: true }).click();
  await expect.poll(() => boards(state).at(-1)).toBe('/api/leaderboard/alltime');
  state.catalogMode = 'old'; await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('alert')).toBeVisible(); release();
  await expect(page.getByRole('table')).toHaveCount(0);
});
test('UTC Saturday to Sunday rollover changes the current week using catalog clock', async ({ page }) => {
  await page.clock.install({ time: new Date('2040-01-01T00:00:00Z') });
  const state = await setup(page, { today: '2027-01-02', nextDayAt: '2027-01-03T00:00:00.000Z' });
  await page.goto('/leaderboard'); await page.getByRole('button', { name: 'Weekly', exact: true }).click();
  await expect(page.getByText('December 27, 2026 – January 2, 2027 (UTC)', { exact: true })).toBeVisible();
  state.today = '2027-01-03'; state.nextDayAt = '2027-01-04T00:00:00.000Z';
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText('January 3, 2027 – January 9, 2027 (UTC)', { exact: true })).toBeVisible();
  await expect.poll(() => boards(state).at(-1)).toBe('/api/leaderboard/weekly?start=2027-01-03');
});
