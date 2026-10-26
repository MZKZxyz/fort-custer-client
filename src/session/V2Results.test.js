import React from 'react';
import { render, screen } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import V2Results from './V2Results';
import { ATTEMPT_KEY, RECEIPT_KEY, identityDigest } from './contract';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../components/NavBar', () => () => <nav aria-label="Navigation" />);
beforeAll(() => { Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true }); globalThis.TextEncoder = TextEncoder; });
beforeEach(() => { localStorage.clear(); localStorage.setItem('token', 'synthetic-token'); localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'profile' })); localStorage.setItem('selectedMazeDate', '2025-05-26'); });
async function store(status = 'awarded', timing = { status: 'untimed', elapsedMs: null }) {
  localStorage.setItem(RECEIPT_KEY, JSON.stringify({ version: 1, identityHash: await identityDigest('synthetic-token'), profileId: 'profile', date: '2025-05-26', attemptId: 'attempt',
    receipt: { protocol: 'session-v2', date: '2025-05-26', timing, collectible: { status, reward: { name: 'Fixture', secret: 'PRIVATE' } } } }));
  localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ attemptId: 'attempt', phase: 'accepted' }));
}
test.each([['awarded', 'Collectible saved'], ['exhausted', 'No unowned item remained'], ['review-required', 'history needs review'], ['pending', 'recorded and pending'], ['already-used', 'already used']])('accepted untimed %s preserves legacy result/best storage', async (status, message) => {
  await store(status); localStorage.setItem('bestTimes', '{"2025-05-26":"3.000"}'); localStorage.setItem('lastMazeTime', '3.000'); render(<V2Results />);
  expect(await screen.findByText(/Accepted untimed completion/)).toBeInTheDocument(); expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
  expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument(); expect(localStorage.getItem('bestTimes')).toBe('{"2025-05-26":"3.000"}'); expect(localStorage.getItem('lastMazeTime')).toBe('3.000'); expect(localStorage.getItem(ATTEMPT_KEY)).toBeNull();
});
test('official time uses the exact server millisecond and never local provisional or legacy values', async () => {
  await store('exhausted', { status: 'official', elapsedMs: 9123 }); render(<V2Results />);
  expect(await screen.findByText('Official server time: 0:09.123')).toBeInTheDocument(); expect(localStorage.getItem('bestTimes')).toBeNull(); expect(localStorage.getItem('lastMazeTime')).toBeNull();
});
test.each(['foreign', 'unresolved', 'corrupt'])('%s receipt cannot clear original recovery or display accepted result', async kind => {
  await store(); if (kind === 'foreign') localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'foreign' }));
  if (kind === 'unresolved') localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ attemptId: 'attempt', phase: 'completing' }));
  if (kind === 'corrupt') { const r = JSON.parse(localStorage.getItem(RECEIPT_KEY)); r.receipt.collectible = {}; localStorage.setItem(RECEIPT_KEY, JSON.stringify(r)); }
  render(<V2Results />); expect(await screen.findByRole('alert')).toHaveTextContent('Result needs recovery'); expect(localStorage.getItem(ATTEMPT_KEY)).not.toBeNull();
});
