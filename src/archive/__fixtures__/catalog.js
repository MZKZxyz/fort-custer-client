export const catalogFixture = (overrides = {}) => ({
  today: '2028-03-01', serverNow: '2028-03-01T12:00:00.000Z', nextDayAt: '2028-03-02T00:00:00.000Z',
  month: '2028-02', firstPublishedDate: '2025-05-26', lastPublishedDate: '2028-03-01',
  todayMaze: { date: '2028-03-01', available: true, publicationEra: 'year-round-v1', progress: { completed: false } },
  items: [
    { date: '2028-02-28', publicationEra: 'year-round-v1', progress: { completed: true } },
    { date: '2028-02-29', publicationEra: 'year-round-v1', progress: { completed: false } },
  ], ...overrides,
});
