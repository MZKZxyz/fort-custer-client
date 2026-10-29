// Synthetic catalog admission for existing gameplay regressions. No live API.
function archiveFixture(route) {
  const url = new URL(route.request().url());
  if (url.pathname !== '/api/maze/archive') return false;
  const month = url.searchParams.get('month') || '2025-05';
  const today = '2026-10-27';
  const date = '2025-05-26';
  const item = { date, publicationEra: 'legacy', ...(url.searchParams.has('subProfileId') ? { progress: { completed: false } } : {}) };
  return route.fulfill({ json: { month, today, serverNow: `${today}T12:00:00.000Z`, nextDayAt: '2026-10-28T00:00:00.000Z',
    firstPublishedDate: date, lastPublishedDate: date, todayMaze: { date: today, available: false },
    items: month === date.slice(0, 7) ? [item] : [] } });
}
module.exports = { archiveFixture };
