import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MazePage from './MazePage';
import API from '../utils/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../utils/api', () => ({ post: jest.fn() }));
let frame, now;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const fixture = { data: { seed: 'synthetic', maze: { grid: [['S', 'X', 'F', 'E']], width: 4, height: 1 } } };
const integrated = process.env.REACT_APP_MAZE_VISUALS === 'true';
const position = container => integrated
  ? Number(container.querySelector('.pallet-viewport')?.dataset.column)
  : [...container.querySelectorAll('.maze-cell')].findIndex(cell => cell.textContent.includes('🧍'));
const ready = async () => {
  await screen.findByRole('button', { name: 'Right' });
  if (integrated) await screen.findByRole('region', { name: 'Maze viewport' });
};
const key = direction => fireEvent.keyDown(window, { key: `Arrow${direction}` });
const pad = direction => fireEvent.click(screen.getByRole('button', { name: direction }));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
  localStorage.setItem('selectedMazeDate', '2025-05-26');
  now = 100;
  jest.spyOn(performance, 'now').mockImplementation(() => now);
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  API.post.mockReset();
  mockNavigate.mockReset();
});
afterEach(() => jest.restoreAllMocks());

test.each([['keyboard', key], ['D-pad', pad]])('%s follows the same pickup, fire, and completion sequence', async (_, input) => {
  const complete = deferred();
  API.post.mockResolvedValueOnce(fixture).mockReturnValueOnce(complete.promise);
  const { container } = render(<MazePage />);
  await ready();
  input('Right');
  expect(position(container)).toBe(1);
  expect(container.querySelector('.maze-slot')).toHaveTextContent('🧯');
  input('Right');
  expect(position(container)).toBe(1);
  expect(container.querySelector('.maze-slot')).toBeEmptyDOMElement();
  input('Right');
  expect(position(container)).toBe(2);
  input('Right');
  input('Left');
  expect(position(container)).toBe(3);
  expect(API.post).toHaveBeenCalledTimes(2);
  expect(API.post).toHaveBeenLastCalledWith('/maze/complete', { subProfileId: 'synthetic-profile', date: '2025-05-26' }, { timeout: 15000 });
  act(() => frame(now + 4000));
  expect(mockNavigate).not.toHaveBeenCalled();
  localStorage.setItem('lastReward', '{"id":"stale"}');
  localStorage.setItem('bestTimes', '{"2025-05-26":"10.000"}');
  await act(async () => complete.resolve({ data: { time: '9.000', reward: null } }));
  expect(localStorage.getItem('lastReward')).toBeNull();
  expect(JSON.parse(localStorage.getItem('bestTimes'))['2025-05-26']).toBe('9.000');
  act(() => frame(now + 3001));
  expect(mockNavigate).toHaveBeenCalledWith('/results');
});

test('failed completion stays on the maze and supports an explicit retry', async () => {
  API.post.mockResolvedValueOnce({ data: { ...fixture.data, maze: { grid: [['S', 'E']] } } })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: { time: '5.000', reward: { id: 'synthetic-reward' } } });
  render(<MazePage />);
  await ready();
  key('Right');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your result');
  act(() => frame(now + 4000));
  expect(mockNavigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(localStorage.getItem('lastMazeTime')).toBe('5.000'));
  expect(API.post).toHaveBeenCalledTimes(3);
  act(() => frame(now + 3001));
  expect(mockNavigate).toHaveBeenCalledWith('/results');
});

test('timer excludes loading time and freezes at the exit', async () => {
  const start = deferred();
  const complete = deferred();
  API.post.mockReturnValueOnce(start.promise).mockReturnValueOnce(complete.promise);
  const { container } = render(<MazePage />);
  now = 10000;
  await act(async () => start.resolve({ data: { ...fixture.data, maze: { grid: [['S', 'E']] } } }));
  now = 11234;
  act(() => frame());
  expect(container.querySelector('.maze-timer')).toHaveTextContent('0:01.234');
  now = 12000;
  key('Right');
  expect(container.querySelector('.maze-timer')).toHaveTextContent('0:02.000');
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('quit dialog blocks both movement methods; unrelated keys do not move', async () => {
  API.post.mockResolvedValueOnce(fixture);
  const { container } = render(<MazePage />);
  await ready();
  fireEvent.keyDown(window, { key: 'a' });
  expect(position(container)).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  key('Right'); pad('Right');
  expect(position(container)).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  pad('Right');
  expect(position(container)).toBe(1);
});

test('StrictMode starts a single backend attempt', async () => {
  API.post.mockResolvedValueOnce(fixture);
  render(<StrictMode><MazePage /></StrictMode>);
  await ready();
  expect(API.post).toHaveBeenCalledTimes(1);
});

test('rapid mixed inputs use the latest position and consume inventory exactly once', async () => {
  API.post.mockResolvedValueOnce(fixture);
  const { container } = render(<MazePage />);
  await ready();
  act(() => {
    key('Right');
    pad('Right');
    key('Right');
  });
  expect(position(container)).toBe(2);
  expect(container.querySelector('.maze-slot')).toBeEmptyDOMElement();
  expect(API.post).toHaveBeenCalledTimes(1);
});

test('fire without inventory shows a hint and does not move either input method', async () => {
  API.post.mockResolvedValueOnce({ data: { ...fixture.data, maze: { grid: [['S', 'F', 'E']] } } });
  const { container } = render(<MazePage />);
  await ready();
  key('Right'); pad('Right');
  expect(position(container)).toBe(0);
  if (integrated) expect(container.querySelector('.pallet-status')).toHaveTextContent('Fire blocks the path');
  else expect(container.querySelector('.thought-bubble')).toBeInTheDocument();
  expect(API.post).toHaveBeenCalledTimes(1);
});

test('missing profile redirects without starting a maze or crashing', async () => {
  localStorage.removeItem('activeSubProfile');
  render(<MazePage />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profiles'));
  expect(API.post).not.toHaveBeenCalled();
});

test('refresh during ambiguous save recovers the same attempt without starting another maze', async () => {
  const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';
  const pending = deferred();
  API.post.mockResolvedValueOnce({ data: { ...fixture.data, attemptId, maze: { grid: [['S', 'E']] } } })
    .mockReturnValueOnce(pending.promise);
  const first = render(<MazePage />);
  await ready();
  key('Right');
  expect(JSON.parse(sessionStorage.getItem('mazeCompletion:synthetic-profile:2025-05-26')).attemptId).toBe(attemptId);
  first.unmount();
  API.post.mockResolvedValueOnce({ data: { time: '8.000', reward: null } });
  render(<StrictMode><MazePage /></StrictMode>);
  expect(await screen.findByRole('alert')).toHaveTextContent('may already be saved');
  expect(API.post).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(localStorage.getItem('lastMazeTime')).toBe('8.000'));
  expect(API.post).toHaveBeenLastCalledWith('/maze/complete', {
    subProfileId: 'synthetic-profile', date: '2025-05-26', attemptId,
  }, { timeout: 15000 });
  act(() => frame(now + 3001));
  expect(mockNavigate).toHaveBeenCalledWith('/results');
  expect(sessionStorage.getItem('mazeCompletion:synthetic-profile:2025-05-26')).toBeNull();
});

test('timeout offers retry and keeps the same stable identifier', async () => {
  const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';
  API.post.mockResolvedValueOnce({ data: { ...fixture.data, attemptId, maze: { grid: [['S', 'E']] } } })
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValueOnce({ data: { time: '8.000', reward: null } });
  render(<MazePage />);
  await ready();
  key('Right');
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(localStorage.getItem('lastMazeTime')).toBe('8.000'));
  expect(API.post.mock.calls[1]).toEqual(API.post.mock.calls[2]);
});

test('camera presentation requires an explicit true build flag', async () => {
  API.post.mockResolvedValueOnce(fixture);
  const { container } = render(<MazePage />);
  await ready();
  const enabled = process.env.REACT_APP_MAZE_CAMERA === 'true';
  if (integrated) {
    expect(container.querySelector('.pallet-viewport')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-role=tipi]')).toHaveLength(1);
    expect(container.querySelector('.maze-fog')).not.toBeInTheDocument();
    return;
  }
  expect(Boolean(container.querySelector('.maze-viewport'))).toBe(enabled);
  expect(Boolean(container.querySelector('.maze-fog'))).toBe(!enabled);
  // Goal is three cells from start: exposed only by the opted-in camera path.
  expect(Boolean(container.querySelector('img[alt="Goal"]'))).toBe(enabled);
});
