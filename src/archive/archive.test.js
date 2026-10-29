import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MazeCollectionPage from '../pages/MazeCollectionPage';
import LegacyEntry from './LegacyEntry';
import API from '../utils/api';
import { catalogFixture } from './__fixtures__/catalog';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../components/NavBar', () => () => null);
jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn() }));
const reject = (status, code) => Promise.reject({ response: { status, data: code ? { code } : '<html>Not found</html>' } });
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const response = overrides => ({ data: catalogFixture(overrides) });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); mockNavigate.mockReset(); API.get.mockReset(); API.post.mockReset();
  localStorage.setItem('token', 'synthetic-token');
  localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile-a', name: 'Player A' }));
  API.get.mockImplementation(url => Promise.resolve(response({ month: new URL(url, 'http://local').searchParams.get('month') || '2028-02' })));
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('Today leads, only published dates select, completion is per profile, selection does not start', async () => {
  render(<MazeCollectionPage />);
  const complete = await screen.findByRole('button', { name: /February 28, 2028.*Published, Completed/ });
  expect(screen.getByRole('button', { name: "Play today's maze" })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /February 27, 2028/ })).not.toBeInTheDocument();
  fireEvent.click(complete);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Replay February 28, 2028' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Replay February 28, 2028' }));
  expect(localStorage.getItem('selectedMazeDate')).toBe('2028-02-28');
  expect(mockNavigate).toHaveBeenLastCalledWith('/maze'); expect(API.post).not.toHaveBeenCalled();
  expect(API.get.mock.calls[0][0]).toContain('subProfileId=profile-a');
});
test.each([404, 503])('old API or outage %s is actionable without fabricated Play', async status => {
  API.get.mockImplementation(() => reject(status));
  render(<MazeCollectionPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Archive temporarily unavailable');
  expect(screen.queryByRole('button', { name: /Play today/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
});
test.each([[401, null], [403, null], [404, 'PROFILE_NOT_FOUND']])('ownership/auth failure %s %s clears private indicators', async (status, code) => {
  API.get.mockImplementation(() => reject(status, code));
  render(<MazeCollectionPage />);
  await screen.findByRole('alert');
  expect(API.get).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Completed')).not.toBeInTheDocument();
});
test('private progress failure falls back to metadata with Unknown, never incomplete', async () => {
  API.get.mockImplementation(url => url.includes('subProfileId') ? reject(503) : Promise.resolve(response()));
  render(<MazeCollectionPage />);
  expect(await screen.findByRole('button', { name: /February 28, 2028.*Completion status unknown/ })).toBeEnabled();
  expect(screen.queryByText('Not completed')).not.toBeInTheDocument();
});
test('late callback after profile switch cannot reveal the previous completion', async () => {
  const old = deferred(), fresh = deferred();
  API.get.mockImplementation(url => url.includes('profile-b') ? fresh.promise : old.promise);
  render(<MazeCollectionPage />);
  await waitFor(() => expect(API.get).toHaveBeenCalledTimes(1));
  act(() => {
    localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile-b', name: 'Player B' }));
    window.dispatchEvent(new Event('activeSubProfileChanged'));
  });
  await act(async () => old.resolve(response()));
  expect(screen.queryByRole('button', { name: /February 28, 2028.*Completed/ })).not.toBeInTheDocument();
  await act(async () => fresh.resolve(response({ items: [{ date: '2028-02-28', publicationEra: 'year-round-v1', progress: { completed: false } }] })));
  expect(await screen.findByRole('button', { name: /February 28, 2028.*Not completed/ })).toBeInTheDocument();
});
test('UTC midnight refresh changes Today without choosing a new date or starting an attempt', async () => {
  jest.useFakeTimers();
  API.get.mockResolvedValueOnce(response({ today: '2028-02-29', serverNow: '2028-02-29T23:59:59Z', nextDayAt: '2028-03-01T00:00:00Z',
    lastPublishedDate: '2028-02-29', todayMaze: { date: '2028-02-29', available: true, publicationEra: 'year-round-v1' } })).mockResolvedValue(response());
  render(<MazeCollectionPage />);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: /February 28, 2028.*Published/ }));
  await act(async () => jest.advanceTimersByTime(1001));
  expect(await screen.findByText('March 1, 2028 (UTC)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Replay February 28, 2028' })).toBeInTheDocument();
  expect(API.get.mock.calls.at(-1)[0]).toContain('month=2028-02');
  expect(API.post).not.toHaveBeenCalled();
});
test('recovering a saved UUID does not require catalog availability', () => {
  localStorage.setItem('selectedMazeDate', '2028-02-28');
  sessionStorage.setItem('mazeCompletion:profile-a:2028-02-28', JSON.stringify({ attemptId: 'original-uuid' }));
  render(<LegacyEntry><p>Original result recovery</p></LegacyEntry>);
  expect(screen.getByText('Original result recovery')).toBeInTheDocument(); expect(API.get).not.toHaveBeenCalled();
});
test('corrupt selection and absent publication cannot mount a new gameplay attempt', async () => {
  localStorage.setItem('selectedMazeDate', '2028-02-30');
  const view = render(<LegacyEntry><p>Gameplay</p></LegacyEntry>);
  expect(screen.queryByText('Gameplay')).not.toBeInTheDocument(); view.unmount();
  localStorage.setItem('selectedMazeDate', '2028-02-27');
  render(<LegacyEntry><p>Gameplay</p></LegacyEntry>);
  expect(await screen.findByRole('alert')).toHaveTextContent('No published maze');
  expect(screen.queryByText('Gameplay')).not.toBeInTheDocument();
});

test('unconfirmed recovery remains reachable from an archive without a catalog', async () => {
  API.get.mockImplementation(() => reject(404));
  sessionStorage.setItem('mazeCompletion:profile-a:2028-02-28', JSON.stringify({ attemptId: 'original' }));
  render(<MazeCollectionPage />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Recover result for February 28, 2028 (UTC)' }));
  expect(mockNavigate).toHaveBeenLastCalledWith('/maze');
  expect(localStorage.getItem('selectedMazeDate')).toBe('2028-02-28');
  expect(API.post).not.toHaveBeenCalled();
});

test('a pending result for another date blocks a replacement attempt even through a direct link', () => {
  localStorage.setItem('selectedMazeDate', '2028-02-29');
  sessionStorage.setItem('mazeCompletion:profile-a:2028-02-28', JSON.stringify({ attemptId: 'original-uuid' }));
  render(<LegacyEntry><p>New gameplay</p></LegacyEntry>);
  expect(screen.getByRole('alert')).toHaveTextContent('recover it before starting another maze');
  expect(screen.queryByText('New gameplay')).not.toBeInTheDocument();
  expect(API.get).not.toHaveBeenCalled();
});
test('refresh from a confirmed result revalidates progress, focus/reconnect also refresh', async () => {
  render(<MazeCollectionPage />);
  await screen.findByRole('button', { name: /February 28, 2028.*Published/ });
  const count = API.get.mock.calls.length;
  act(() => window.dispatchEvent(new Event('mazeResultSaved')));
  await waitFor(() => expect(API.get.mock.calls.length).toBeGreaterThan(count));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(API.get.mock.calls.length).toBeGreaterThan(count + 1));
});

test('metadata without an owned profile has Unknown completion and cannot start', async () => {
  localStorage.removeItem('activeSubProfile');
  render(<MazeCollectionPage />);
  await screen.findByRole('button', { name: /February 28, 2028.*Completion status unknown/ });
  expect(screen.getByRole('button', { name: "Play today's maze" })).toBeDisabled();
  expect(API.get.mock.calls[0][0]).not.toContain('subProfileId');
});
