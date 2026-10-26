import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SessionGate from './SessionGate';
import { PlayableSession } from './playableSession';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('./contract', () => ({ ATTEMPT_KEY: 'fc.session-v2.attempt.v1', EXPERIMENTAL_V2: true, createContract: jest.fn() }));
jest.mock('./playableSession', () => ({ PlayableSession: jest.fn() }));
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('token', 'synthetic-token'); localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
  PlayableSession.mockReset();
});
test('StrictMode acquires exactly one lock and initializes one owned session', async () => {
  const initialize = jest.fn().mockResolvedValue({ session: {}, state: {} });
  PlayableSession.mockImplementation(() => ({ initialize, interrupt: jest.fn() }));
  const request = jest.fn((_key, _options, callback) => callback({ name: 'owned' }));
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
  const view = render(<StrictMode><SessionGate>{attached => <p>{attached ? 'Owned playable shell' : 'Legacy shell'}</p>}</SessionGate></StrictMode>);
  expect(await screen.findByText('Owned playable shell')).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1); expect(initialize).toHaveBeenCalledTimes(1);
  const held = request.mock.results[0].value; view.unmount(); await held;
});
test('occupied tab and missing lock support cannot initialize gameplay', async () => {
  Object.defineProperty(navigator, 'locks', { value: { request: jest.fn((_key, _options, callback) => callback(null)) }, configurable: true });
  const view = render(<SessionGate>{() => <p>Gameplay</p>}</SessionGate>);
  expect(await screen.findByRole('alert')).toHaveTextContent('another tab'); expect(PlayableSession).not.toHaveBeenCalled();
  expect(screen.getByRole('heading')).toHaveFocus(); view.unmount();
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
  render(<SessionGate>{() => <p>Gameplay</p>}</SessionGate>);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Web Locks')); expect(PlayableSession).not.toHaveBeenCalled();
});
