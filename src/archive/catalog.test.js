import { catalogFixture } from './__fixtures__/catalog';
import { catalogFresh, validateCatalog } from './catalog';
import { dateLabel, isDate, isMonth, monthDates, shiftMonth } from './dates';

test.each(['2028-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])('real UTC identity %s', date => {
  expect(isDate(date)).toBe(true); expect(dateLabel(date)).not.toBe('No date selected');
});
test.each(['1900-02-29', '2025-02-29', '2028-02-30', '2028-2-01', '0000-01-01', '2028-03-01T00:00:00Z', ' 2028-03-01', null])('rejects malformed date %s', date => expect(isDate(date)).toBe(false));
test('UTC month arithmetic handles leap/year transitions and years below 100', () => {
  expect(monthDates('2028-02')).toHaveLength(29);
  expect(monthDates('1900-02')).toHaveLength(28);
  expect(monthDates('0001-01')[0]).toBe('0001-01-01');
  expect(monthDates('9999-12')).toHaveLength(31);
  expect(shiftMonth('2028-12', 1)).toBe('2029-01');
  expect(shiftMonth('0001-01', -1)).toBeNull();
  expect(isMonth('2028-13')).toBe(false);
});
test('accepts the merged sparse catalog contract and rejects duplicates, future rows and malformed clocks', () => {
  const fixture = catalogFixture();
  expect(validateCatalog(fixture, '2028-02')).toEqual(fixture);
  for (const data of [catalogFixture({ items: [fixture.items[0], fixture.items[0]] }),
    catalogFixture({ items: [{ ...fixture.items[0], date: '2029-02-01' }] }),
    catalogFixture({ serverNow: 'garbage' }), catalogFixture({ month: '2027-02' }),
    catalogFixture({ nextDayAt: '2028-03-01T23:00:00Z' }), catalogFixture({ firstPublishedDate: null })]) {
    expect(() => validateCatalog(data, '2028-02')).toThrow();
  }
});
test('publication freshness follows monotonic elapsed/server boundary, not the device clock', () => {
  jest.spyOn(performance, 'now').mockReturnValue(1500);
  const data = catalogFixture({ serverNow: '2028-03-01T23:59:59.000Z' });
  expect(catalogFresh({ status: 'ready', data, startedAt: 1000 })).toBe(true);
  performance.now.mockReturnValue(2000);
  expect(catalogFresh({ status: 'ready', data, startedAt: 1000 })).toBe(false);
  jest.restoreAllMocks();
});
test.each([['2026-03-08T09:59:59Z', '1:59 AM'], ['2026-03-08T10:00:00Z', '3:00 AM'], ['2026-11-01T08:59:59Z', '1:59 AM'], ['2026-11-01T09:00:00Z', '1:00 AM']])('Los Angeles DST boundary %s does not change the UTC maze key', (instant, localTime) => {
  const date = instant.slice(0,10);
  const start = Date.parse(`${date}T00:00:00Z`);
  const response = catalogFixture({ today:date,month:date.slice(0,7),serverNow:instant,
    nextDayAt:new Date(start+86400000).toISOString(),firstPublishedDate:date,lastPublishedDate:date,
    todayMaze:{date,available:true,publicationEra:'year-round-v1'},items:[{date,publicationEra:'year-round-v1'}] });
  expect(validateCatalog(response).items[0].date).toBe(date);
  expect(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'}).format(new Date(instant))).toBe(localTime);
});
