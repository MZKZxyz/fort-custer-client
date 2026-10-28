import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LeaderboardPage from './LeaderboardPage';
import API from '../utils/api';
import { catalogFixture } from '../archive/__fixtures__/catalog';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../components/NavBar', () => () => null);
jest.mock('../utils/api', () => ({ get: jest.fn() }));
const scores = [{ name: 'Fresh Player', subProfileId: 'profile-a', time: '8.123', completedMazes: 1 }];
const fresh = overrides => catalogFixture({ firstPublishedDate: '2027-12-30', ...overrides });
const freshFor = (url, overrides) => {
  const data = fresh(overrides);
  const month = new URL(url, 'http://fixture').searchParams.get('month') || '2028-03';
  return { ...data, month, items: data.items.filter(item => item.date.startsWith(month)) };
};
const boards = () => API.get.mock.calls.filter(([url]) => url.startsWith('/leaderboard'));
const choose = name => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); API.get.mockReset(); mockNavigate.mockReset();
  window.history.replaceState({}, '', '/leaderboard?date=2028-02-29');
  localStorage.setItem('token', 'synthetic-a');
  localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile-a' }));
  API.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/maze/archive') ? freshFor(url) : scores }));
});
test.each([404, 503, 'html', 'invalid', 'legacy'])('all frames deny catalog failure %s without calling old boards', async mode => {
  API.get.mockImplementation(url => {
    if (!url.startsWith('/maze/archive')) return Promise.resolve({ data: scores });
    if (mode === 'html') return Promise.resolve({ data: '<html>Cannot GET /api/maze/archive</html>' });
    if (mode === 'invalid') return Promise.resolve({ data: freshFor(url, { nextDayAt: 'broken' }) });
    if (mode === 'legacy') return Promise.resolve({ data: freshFor(url, { items: [{ date: '2028-02-28', publicationEra: 'legacy' }] }) });
    return Promise.reject({ response: { status: mode } });
  });
  render(<LeaderboardPage />);
  await screen.findByRole('alert');
  for (const frame of ['Daily', 'Weekly', 'All-time']) {
    choose(frame);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Fresh Player')).not.toBeInTheDocument();
    expect(screen.queryByText('No fresh archive saved times yet.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
  }
  expect(boards()).toHaveLength(0);
});
test('failed catalog retry stays on selected aggregate and enables it only after verification', async () => {
  let down = true;
  API.get.mockImplementation(url => url.startsWith('/maze/archive') ? down ? Promise.reject({ response: { status: 404 } })
    : Promise.resolve({ data: freshFor(url) }) : Promise.resolve({ data: scores }));
  render(<LeaderboardPage />); await screen.findByRole('alert'); choose('All-time');
  expect(boards()).toHaveLength(0); down = false; choose('Retry');
  expect(await screen.findByRole('cell', { name: 'Fresh Player' })).toBeInTheDocument();
  expect(boards().map(([url]) => url)).toEqual(['/leaderboard/alltime']);
});
test('weekly defaults to server UTC Sunday even with a manipulated stored date and device clock', async () => {
  window.history.replaceState({}, '', '/leaderboard'); localStorage.setItem('selectedMazeDate', '2025-09-01');
  render(<LeaderboardPage />); await screen.findByText('No published maze is available for this selection.');
  expect(boards()).toHaveLength(0); choose('Weekly');
  await screen.findByRole('cell', { name: 'Fresh Player' });
  expect(boards().at(-1)[0]).toBe('/leaderboard/weekly?start=2028-02-27');
  expect(screen.getAllByText('February 27, 2028 – March 4, 2028 (UTC)')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Next UTC week' })).toBeDisabled();
  choose('Previous UTC week'); await waitFor(() => expect(boards().at(-1)[0]).toBe('/leaderboard/weekly?start=2028-02-20'));
  choose('Current UTC week'); await waitFor(() => expect(boards().at(-1)[0]).toBe('/leaderboard/weekly?start=2028-02-27'));
  expect(screen.queryByText(/Summer 2025|legacy/i)).not.toBeInTheDocument();
});
test('first publication bounds weekly controls but sparse/empty weeks remain selectable', async () => {
  API.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/maze/archive') ? freshFor(url, { firstPublishedDate: '2028-02-20' }) : [] }));
  render(<LeaderboardPage />); await screen.findByText('No fresh archive saved times yet.'); choose('Weekly');
  await screen.findByText('No fresh archive saved times yet.'); choose('Previous UTC week');
  await waitFor(() => expect(boards().at(-1)[0]).toBe('/leaderboard/weekly?start=2028-02-20'));
  expect(screen.getByRole('button', { name: 'Previous UTC week' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next UTC week' })).toBeEnabled();
});
test('no first publication and missing today remain empty, never fabricate a daily date', async () => {
  API.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/maze/archive')
    ? freshFor(url, { items: [], firstPublishedDate: null, lastPublishedDate: null, todayMaze: { date: '2028-03-01', available: false } }) : [] }));
  render(<LeaderboardPage />); await screen.findByText('No published maze is available for this selection.');
  expect(boards()).toHaveLength(0); choose('Weekly'); await screen.findByText('No fresh archive saved times yet.');
  expect(screen.getByRole('button', { name: 'Previous UTC week' })).toBeDisabled();
  choose('All-time'); await screen.findByText('No fresh archive saved times yet.');
  expect(boards().map(([url]) => url)).toEqual(['/leaderboard/weekly?start=2028-02-27', '/leaderboard/alltime']);
});
test.each(['garbage', '2025-05-26', '2099-01-01', '2028-02-27'])('daily never queries an unconfirmed selection %s', async date => {
  window.history.replaceState({}, '', `/leaderboard?date=${date}`);
  render(<LeaderboardPage />);
  // Malformed input can use verified Today; valid but unpublished dates cannot.
  if (date === 'garbage') {
    await screen.findByRole('cell', { name: 'Fresh Player' });
    expect(boards().at(-1)[0]).toBe('/leaderboard/daily?date=2028-03-01');
  } else { await screen.findByText('No published maze is available for this selection.'); expect(boards()).toHaveLength(0); }
});
test.each(['Weekly', 'All-time'])('%s distinguishes 503 and unknown-route 404 from empty; retry works', async frame => {
  let status = 503;
  API.get.mockImplementation(url => url.startsWith('/maze/archive') ? Promise.resolve({ data: freshFor(url) })
    : status === 200 ? Promise.resolve({ data: [] }) : Promise.reject({ response: { status } }));
  render(<LeaderboardPage />); choose(frame);
  await screen.findByText('Leaderboard could not be loaded. Please retry.');
  status = 404; choose('Retry leaderboard'); await screen.findByText('Leaderboard could not be loaded. Please retry.');
  expect(screen.queryByText('No published maze is available for this date.')).not.toBeInTheDocument();
  status = 200; choose('Retry leaderboard'); await screen.findByText('No fresh archive saved times yet.');
});
test('catalog refresh failure hides loaded scores and aborts/ignores late leaderboard callbacks', async () => {
  const late = deferred(); let down = false;
  API.get.mockImplementation(url => url.startsWith('/maze/archive') ? down ? Promise.reject({ response: { status: 503 } })
    : Promise.resolve({ data: freshFor(url) }) : url.includes('alltime') ? late.promise : Promise.resolve({ data: scores }));
  render(<LeaderboardPage />); await screen.findByRole('cell', { name: 'Fresh Player' });
  choose('All-time'); await waitFor(() => expect(boards().at(-1)[0]).toBe('/leaderboard/alltime'));
  const signal = boards().at(-1)[1].signal;
  down = true; fireEvent(window, new Event('focus')); await screen.findByRole('alert');
  expect(signal.aborted).toBe(true);
  await act(async () => late.resolve({ data: scores }));
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
test('identity changes suppress late boards until the new catalog is verified', async () => {
  const late = deferred(), newCatalog = deferred();
  API.get.mockImplementation(url => url.startsWith('/maze/archive') ? url.includes('profile-b') ? newCatalog.promise
    : Promise.resolve({ data: freshFor(url) }) : late.promise);
  render(<LeaderboardPage />); await waitFor(() => expect(boards()).toHaveLength(1));
  localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile-b' }));
  fireEvent(window, new Event('activeSubProfileChanged'));
  await act(async () => late.resolve({ data: scores }));
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await act(async () => newCatalog.resolve({ data: fresh() }));
  await screen.findByRole('cell', { name: 'Fresh Player' });
  expect(boards()).toHaveLength(2);
});
test('malformed aggregate scores are failures, never an empty or partial board', async () => {
  API.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/maze/archive') ? freshFor(url) : [...scores, { ...scores[0], completedMazes: '2' }] }));
  render(<LeaderboardPage />); choose('All-time');
  await screen.findByText('Leaderboard could not be loaded. Please retry.');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
