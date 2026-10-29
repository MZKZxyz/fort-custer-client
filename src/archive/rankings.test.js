import { freshRankingCatalog, shiftWeek, utcWeek, weekLabel } from './rankings';
import { catalogFixture } from './__fixtures__/catalog';

test.each([
  ['2026-12-31', '2026-12-27', '2027-01-02'],
  ['2027-01-01', '2026-12-27', '2027-01-02'],
  ['2027-01-02', '2026-12-27', '2027-01-02'],
  ['2027-01-03', '2027-01-03', '2027-01-09'],
  ['2028-02-29', '2028-02-27', '2028-03-04'],
  ['2026-03-08', '2026-03-08', '2026-03-14'],
  ['2026-11-01', '2026-11-01', '2026-11-07'],
  ['0099-01-04', '0099-01-04', '0099-01-10'],
])('UTC Sunday week for %s ignores local year/DST/leap boundaries', (date, start, end) => {
  expect(utcWeek(date)).toEqual({ start, end });
});
test.each(['garbage', '2028-02-30', '2026-11-01T00:00:00Z', '0001-01-01', '9999-12-31', null])('reject unsupported week %s', date => {
  expect(utcWeek(date)).toBeNull();
});
test('seven-day navigation and UTC label span years without a summer clamp', () => {
  expect(shiftWeek('2027-01-03', -1)).toBe('2026-12-27');
  expect(shiftWeek('2026-03-08', 1)).toBe('2026-03-15');
  expect(shiftWeek('2026-11-01', -1)).toBe('2026-10-25');
  expect(shiftWeek('0001-01-07', -1)).toBeNull();
  expect(weekLabel(utcWeek('2027-01-01'))).toBe('December 27, 2026 – January 2, 2027 (UTC)');
});
test('only a usable modern catalog enables rankings; empty is a successful capability response', () => {
  const data = catalogFixture();
  expect(freshRankingCatalog({ usable: true, data })).toBe(true);
  expect(freshRankingCatalog({ usable: false, data })).toBe(false);
  expect(freshRankingCatalog({ usable: true, data: undefined })).toBe(false);
  expect(freshRankingCatalog({ usable: true, data: { ...data, items: [{ date: '2028-02-28', publicationEra: 'legacy' }] } })).toBe(false);
  expect(freshRankingCatalog({ usable: true, data: { ...data, todayMaze: { ...data.todayMaze, publicationEra: 'legacy' } } })).toBe(false);
  expect(freshRankingCatalog({ usable: true, data: catalogFixture({ firstPublishedDate: null, lastPublishedDate: null,
    todayMaze: { date: '2028-03-01', available: false }, items: [] }) })).toBe(true);
});
