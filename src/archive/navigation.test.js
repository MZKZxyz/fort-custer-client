import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../pages/ResultsPage';
import LeaderboardPage from '../pages/LeaderboardPage';
import API from '../utils/api';
import { catalogFixture } from './__fixtures__/catalog';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../components/NavBar', () => () => null);
jest.mock('../utils/api', () => ({ get: jest.fn() }));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); mockNavigate.mockReset(); API.get.mockReset();
  localStorage.setItem('token', 'synthetic-token');
  localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile-a' }));
  localStorage.setItem('selectedMazeDate', '2028-02-29');
  localStorage.setItem('lastMazeTime', '8.123');
  window.history.replaceState({}, '', '/');
  API.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/maze/archive') ? catalogFixture() : [] }));
});
test('results preserve receipt/date and navigate to exact replay, Today and archive without a successor', async () => {
  render(<ResultsPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Replay Maze' })).toBeEnabled());
  expect(screen.queryByText(/Next Maze/)).not.toBeInTheDocument();
  expect(screen.getByText('February 29, 2028 (UTC)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Replay Maze' }));
  expect(localStorage.getItem('selectedMazeDate')).toBe('2028-02-29');
  fireEvent.click(screen.getByRole('button', { name: "Today's maze" }));
  expect(localStorage.getItem('selectedMazeDate')).toBe('2028-03-01');
  fireEvent.click(screen.getByRole('button', { name: 'Browse archive' }));
  expect(mockNavigate).toHaveBeenLastCalledWith('/mazes');
});
test('corrupt missing result date never becomes device today, receipt remains readable during outage', async () => {
  localStorage.setItem('selectedMazeDate', 'garbage');
  API.get.mockRejectedValue({ response: { status: 404 } });
  render(<ResultsPage />);
  expect(screen.getByText(/You finished in/)).toHaveTextContent('00:08.123');
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Replay Maze' })).toBeDisabled();
  expect(localStorage.getItem('selectedMazeDate')).toBe('garbage');
});
test.each([200, 404, 503])('daily selected-date scores distinguish %s', async status => {
  window.history.replaceState({}, '', '/leaderboard?date=2028-02-29');
  API.get.mockImplementation(url => url.startsWith('/maze/archive') ? Promise.resolve({ data: catalogFixture() })
    : status === 200 ? Promise.resolve({ data: [] }) : Promise.reject({ response: { status } }));
  render(<LeaderboardPage />);
  const text = status === 200 ? 'No legacy saved results yet.' : status === 404
    ? 'No published maze is available for this date.' : 'Leaderboard could not be loaded. Please retry.';
  expect(await screen.findByText(text)).toBeInTheDocument();
  expect(API.get.mock.calls.find(([url]) => url.startsWith('/leaderboard'))[0]).toBe('/leaderboard/daily?date=2028-02-29');
});
test('weekly and alltime remain separate legacy endpoints even when the catalog is absent', async () => {
  API.get.mockImplementation(url => url.startsWith('/maze/archive') ? Promise.reject({response:{status:404}}) : Promise.resolve({data:[]}));
  render(<LeaderboardPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
  expect(await screen.findByText('Legacy weekly — Summer 2025')).toBeInTheDocument();
  await waitFor(() => expect(API.get.mock.calls.some(([url]) => url === '/leaderboard/weekly?start=2025-09-01')).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Alltime' }));
  await waitFor(() => expect(API.get.mock.calls.some(([url]) => url === '/leaderboard/alltime')).toBe(true));
});
