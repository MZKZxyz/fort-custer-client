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
const position = container => [...container.querySelectorAll('.maze-cell')].findIndex(cell => cell.textContent.includes('🧍'));
const key = direction => fireEvent.keyDown(window, { key: `Arrow${direction}` });
const pad = direction => fireEvent.click(screen.getByRole('button', { name: direction }));
beforeEach(() => {
  localStorage.clear();
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
  await screen.findByRole('button', { name: 'Right' });
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
  expect(API.post).toHaveBeenLastCalledWith('/maze/complete', { subProfileId: 'synthetic-profile', date: '2025-05-26' });
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
  await screen.findByRole('button', { name: 'Right' });
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
  await screen.findByRole('button', { name: 'Right' });
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
  await screen.findByRole('button', { name: 'Right' });
  expect(API.post).toHaveBeenCalledTimes(1);
});

test('rapid mixed inputs use the latest position and consume inventory exactly once', async () => {
  API.post.mockResolvedValueOnce(fixture);
  const { container } = render(<MazePage />);
  await screen.findByRole('button', { name: 'Right' });
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
  await screen.findByRole('button', { name: 'Right' });
  key('Right'); pad('Right');
  expect(position(container)).toBe(0);
  expect(container.querySelector('.thought-bubble')).toBeInTheDocument();
  expect(API.post).toHaveBeenCalledTimes(1);
});

test('missing profile redirects without starting a maze or crashing', async () => {
  localStorage.removeItem('activeSubProfile');
  render(<MazePage />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profiles'));
  expect(API.post).not.toHaveBeenCalled();
});
