import { dateLabel, isDate } from './dates';

// Match the server's Sunday-inclusive / next-Sunday-exclusive UTC week.
// Reject weeks extending outside its real civil-date domain (0001–9999).
export function utcWeek(date) {
  if (!isDate(date)) return null;
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start.getTime() + 6 * 86400000);
  const first = start.toISOString().slice(0, 10), last = end.toISOString().slice(0, 10);
  return isDate(first) && isDate(last) ? { start: first, end: last } : null;
}
export function shiftWeek(start, delta) {
  if (!isDate(start)) return null;
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta * 7);
  return utcWeek(date.toISOString().slice(0, 10))?.start ?? null;
}
export const weekLabel = week => week ? `${dateLabel(week.start)} – ${dateLabel(week.end)} (UTC)` : '';

// The API keeps its existing array shape. A verified, fresh catalog is the
// capability gate, including empty catalogs; never fall back to an old board.
// Catalog metadata cannot attest the server's deployment/release configuration.
export function freshRankingCatalog(catalog) {
  const data = catalog.data;
  return Boolean(catalog.usable && data
    && data.items.every(item => item.publicationEra === 'year-round-v1')
    && (!data.todayMaze.available || (data.todayMaze.publicationEra === 'year-round-v1'
      && data.firstPublishedDate <= data.today && data.lastPublishedDate >= data.today)));
}
