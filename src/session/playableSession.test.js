import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import { move } from '../game/movement';
import { PlayableSession, replay, verifySession } from './playableSession';
import { ATTEMPT_KEY, RECEIPT_KEY, MAX_COMMANDS, MAX_BYTES, transcript, digest, receiptView, allowed, identityDigest } from './contract';

const profileId = '000000000000000000000002', date = '2025-05-26', token = 'synthetic-token';
const attemptId = '01234567-89ab-4cde-8fab-0123456789ab';
const grid = ['######', '#SXFE#', '#    #', '######'].map(row => [...row]);
let prepared, started, api, now, storage;
const clone = value => JSON.parse(JSON.stringify(value));
const unavailable = () => Object.assign(new Error('unresolved'), { response: { status: 503, data: { error: 'COMMIT_UNKNOWN' } } });
const receipt = () => ({ protocol: 'session-v2', attemptId, date, status: 'accepted', routeValidated: true,
  progress: { completed: true }, timing: { status: 'untimed', elapsedMs: null }, collectible: { status: 'awarded', reward: { name: 'Fixture', secret: 'private', image: 'https://invalid.example' } } });
const context = () => ({ token, profileId, date });
const make = overrides => new PlayableSession({ api, storage, profileId, date, token, context, now: () => now, ...overrides });
const command = (session, dir) => { const before = session.state; const after = move(before, dir).state; session.append(dir, before, after); return after; };
beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true }); globalThis.TextEncoder = TextEncoder; });
beforeEach(async () => {
  now = 10000; storage = localStorage; storage.clear();
  const gridHash = await digest(grid);
  prepared = { protocol: 'session-v2', attemptId, date, state: 'PREPARED', revision: 1, expiresAt: 310000, startedAt: null,
    nonce: attemptId, grid, gridHash, manifest: { protocol: 'session-v2', date, gridHash, mazeVersion: 'a'.repeat(64),
      rulesVersion: 'cardinal-fire-v1', validationPolicyVersion: 'route-replay-v1', integrityTier: 'server-timed-legal-route-v1',
      publicLabel: 'Server-timed · route validated', runClass: 'standard', abilityIds: [],
      competitionVersion: 'cardinal-fire-standard-v1', scoringMethod: 'playable-receipt-v2' } };
  started = { ...prepared, state: 'STARTED', revision: 2, startedAt: now, expiresAt: now + 7200000 }; delete started.nonce;
  api = { capabilities: jest.fn().mockResolvedValue({ protocol: 'session-v2', capabilities: ['route-transcript-v1'], admission: true }),
    create: jest.fn().mockResolvedValue(prepared), status: jest.fn().mockResolvedValue(started), ready: jest.fn().mockResolvedValue(started),
    complete: jest.fn().mockResolvedValue(receipt()), result: jest.fn().mockRejectedValue(unavailable()),
    recover: jest.fn().mockResolvedValue({ outcome: 'no-pending', session: started }), abandon: jest.fn().mockResolvedValue({ ...started, state: 'ABANDONED' }) };
});
async function playing() { const s = make(); await s.initialize(); await s.ready(); return s; }

test.each([null, {}, { protocol: 'session-v2', admission: false, capabilities: ['route-transcript-v1'] },
  { protocol: 'session-v2', admission: true, capabilities: [] }])('no create before matching capability AND admission: %j', async cap => {
  api.capabilities.mockResolvedValue(cap); expect(await make().initialize()).toEqual({ legacy: true }); expect(api.create).not.toHaveBeenCalled(); expect(storage.getItem(ATTEMPT_KEY)).toBeNull();
});
test('unknown capability request stays unresolved with no create or legacy fallback', async () => {
  api.capabilities.mockRejectedValue(unavailable()); await expect(make().initialize()).rejects.toThrow(); expect(api.create).not.toHaveBeenCalled();
});
test.each([404, 426])('definitively absent capability endpoint (%s) uses legacy before any admitted operation', async status => {
  api.capabilities.mockRejectedValue({ response: { status } }); expect(await make().initialize()).toEqual({ legacy: true }); expect(api.create).not.toHaveBeenCalled();
});
test('keys are durably saved before create and ready; input waits for durable ACK, provisional includes ACK overhead', async () => {
  let resolveReady; api.ready.mockImplementation(() => new Promise(resolve => { resolveReady = resolve; }));
  api.create.mockImplementation(body => { const saved = JSON.parse(storage.getItem(ATTEMPT_KEY)); expect(saved.createKey).toBe(body.createKey); expect(saved.readyKey).toMatch(/^[a-f0-9]{48}$/); return prepared; });
  const s = make(); await s.initialize(); const pending = s.ready(); expect(() => command(s, 'right')).toThrow('INPUT_LOCKED');
  now += 500; resolveReady(started); expect(await pending).toBe(500); expect(s.live).toBe(true);
  expect(api.ready).toHaveBeenCalledWith(attemptId, { subProfileId: profileId, key: s.record.readyKey, nonce: prepared.nonce,
    gridHash: prepared.gridHash, rulesVersion: 'cardinal-fire-v1' }, 1);
});
test('canonical fixture includes blocked wall/fire, pickup, stationary clear, fresh entry, goal; replay and server-shaped sequence', async () => {
  const s = await playing(); const route = ['up', 'down', 'right', 'right', 'up', 'left', 'up', 'right', 'right', 'right'];
  const states = route.map(dir => clone(command(s, dir)));
  expect(states[0].position).toEqual([1, 1]); expect(states[3].position).toEqual([2, 3]); // blocked unarmed fire above is command 5
  expect(states[4].position).toEqual(states[3].position); expect(states[6].inventory).toEqual(['extinguisher']);
  expect(states[7].position).toEqual(states[6].position); expect(states[7].inventory).toEqual([]);
  expect(states[8].position).toEqual([1, 3]); expect(states[9].completed).toBe(true);
  expect(s.state).toEqual(replay(grid, s.record.commands)); expect(() => command(s, 'left')).toThrow('INPUT_LOCKED');
  const frozen = clone(s.record.completion); const keys = clone(s.record);
  await s.submit(); expect(api.complete).toHaveBeenCalledTimes(1); expect(api.complete).toHaveBeenCalledWith(attemptId,
    { subProfileId: profileId, completionKey: keys.completionKey, transcript: frozen }, 2);
  expect(storage.getItem(RECEIPT_KEY)).not.toMatch(/secret|image/); expect(s.record.receipt.timing.elapsedMs).toBeNull();
});
test('lost create ACK reuses original create key without renegotiation or new keys', async () => {
  api.create.mockRejectedValueOnce(unavailable()); await expect(make().initialize()).rejects.toThrow();
  const saved = clone(JSON.parse(storage.getItem(ATTEMPT_KEY))); const fresh = make(); await fresh.initialize();
  expect(api.create.mock.calls[0]).toEqual(api.create.mock.calls[1]); expect(fresh.record.createKey).toBe(saved.createKey); expect(api.capabilities).toHaveBeenCalledTimes(1);
});
test('lost ready ACK recovers original trusted start and scene without issuing a new ready', async () => {
  const s = make(); await s.initialize(); api.ready.mockRejectedValueOnce(unavailable()); await expect(s.ready()).rejects.toThrow();
  const fresh = make(); await fresh.initialize(); now += 700; expect(await fresh.ready()).toBe(700);
  expect(api.create).toHaveBeenCalledTimes(1); expect(api.ready).toHaveBeenCalledTimes(1); expect(fresh.record.readyKey).toBe(s.record.readyKey);
});
test('refresh restores blocked and changed scene prefixes from immutable pinned grid', async () => {
  const s = await playing(); for (const dir of ['up', 'right', 'right']) command(s, dir);
  const fresh = make(); await fresh.initialize(); expect(fresh.state).toEqual(s.state); expect(fresh.state.position).toEqual([1, 2]);
  expect(fresh.state.grid[1][3]).toBe(' '); expect(grid[1][3]).toBe('F'); expect(fresh.live).toBe(false); await fresh.ready(); command(fresh, 'right'); expect(fresh.state.position).toEqual([1, 3]);
});
test.each(['no-pending', 'aborted'])('unknown completion commit uses owned resolver proof %s then same immutable payload', async outcome => {
  const s = await playing(); for (let i = 0; i < 4; i++) command(s, 'right');
  api.complete.mockRejectedValueOnce(unavailable()); await expect(s.submit()).rejects.toThrow();
  api.recover.mockResolvedValue(outcome === 'aborted' ? { outcome, revision: 4, retrySameOperation: true } : { outcome, session: started });
  const fresh = make(); await fresh.initialize(); expect(api.result).toHaveBeenCalledWith(attemptId, profileId); expect(api.recover).toHaveBeenCalledTimes(1);
  expect(api.complete.mock.calls[0][1]).toEqual(api.complete.mock.calls[1][1]); expect(fresh.record.phase).toBe('accepted');
});
test('final committed ACK lost returns receipt without another completion, even if prefix damaged', async () => {
  const s = await playing(); for (let i = 0; i < 4; i++) command(s, 'right');
  api.complete.mockRejectedValueOnce(unavailable()); await expect(s.submit()).rejects.toThrow();
  const broken = JSON.parse(storage.getItem(ATTEMPT_KEY)); delete broken.commands; storage.setItem(ATTEMPT_KEY, JSON.stringify(broken));
  api.status.mockResolvedValue({ ...started, state: 'COMPLETED', revision: 4 }); api.result.mockResolvedValue(receipt());
  expect((await make().initialize()).receipt.timing.status).toBe('untimed'); expect(api.complete).toHaveBeenCalledTimes(1);
});
test('failed result read without resolver proof cannot resend completion', async () => {
  const s = await playing(); for (let i = 0; i < 4; i++) command(s, 'right'); api.recover.mockRejectedValue(unavailable());
  await expect(make().initialize()).rejects.toThrow(); expect(api.complete).not.toHaveBeenCalled();
});
test.each(['token', 'profileId', 'date'])('foreign %s is refused before all network work', async field => {
  await playing(); const s = make({ [field]: 'foreign', context: () => ({ ...context(), [field]: 'foreign' }) });
  const calls = api.status.mock.calls.length; await expect(s.initialize()).rejects.toThrow('ATTEMPT_SCOPE'); expect(api.status).toHaveBeenCalledTimes(calls);
});
test.each(['checkpoint', 'commands', 'pin'])('corrupt %s fails closed with no command or save', async field => {
  await playing(); const saved = JSON.parse(storage.getItem(ATTEMPT_KEY)); saved[field] = field === 'commands' ? [{ seq: 3, dir: 'right' }] : field === 'pin' ? 'bad' : {};
  storage.setItem(ATTEMPT_KEY, JSON.stringify(saved)); await expect(make().initialize()).rejects.toThrow(); expect(api.complete).not.toHaveBeenCalled();
});
test('missing prefix cannot resume; original owned attempt can still be explicitly abandoned', async () => {
  const s = await playing(); delete s.record.checkpoint; storage.setItem(ATTEMPT_KEY, JSON.stringify(s.record));
  const fresh = make(); await expect(fresh.initialize()).rejects.toThrow('PREFIX_MISSING'); await fresh.abandon(); expect(storage.getItem(ATTEMPT_KEY)).toBeNull();
});
test('storage denied before create sends no request; quota during command never advances scene', async () => {
  const denied = { getItem: () => null, setItem: () => { throw new Error('denied'); } };
  await expect(make({ storage: denied }).initialize()).rejects.toThrow('STORAGE_UNAVAILABLE'); expect(api.create).not.toHaveBeenCalled();
  const s = await playing(), before = clone(s.state); const original = s.storage;
  s.storage = { getItem: key => original.getItem(key), setItem: () => { throw new Error('quota'); } };
  expect(() => command(s, 'right')).toThrow('STORAGE_UNAVAILABLE'); expect(s.state).toEqual(before); expect(s.live).toBe(false);
});
test('another writer or changed context cannot overwrite commands', async () => {
  const s = await playing(); storage.setItem(ATTEMPT_KEY, '{}'); expect(() => command(s, 'right')).toThrow('STORAGE_UNAVAILABLE');
  const fresh = make(); fresh.context = () => ({ ...context(), token: 'changed' }); await expect(fresh.initialize()).rejects.toThrow('CONTEXT_CHANGED');
});
test('expiry locks input and requires server terminal proof before explicit release', async () => {
  const s = await playing(); now = started.expiresAt; expect(() => command(s, 'right')).toThrow('INPUT_LOCKED');
  api.status.mockResolvedValue({ ...started, state: 'EXPIRED', revision: 3 }); const fresh = make(); await expect(fresh.initialize()).rejects.toThrow('SESSION_EXPIRED');
  await fresh.abandon(); expect(storage.getItem(ATTEMPT_KEY)).toBeNull(); expect(api.abandon).not.toHaveBeenCalled();
});
test('unknown abandon preserves record/key; completion intent cannot be abandoned', async () => {
  const s = await playing(); const key = s.record.abandonKey; api.abandon.mockRejectedValueOnce(unavailable()); await expect(s.abandon()).rejects.toThrow();
  expect(s.record.abandonKey).toBe(key); await s.abandon(); expect(api.abandon.mock.calls[0][1]).toEqual(api.abandon.mock.calls[1][1]);
  const next = await playing(); for (let i = 0; i < 4; i++) command(next, 'right'); await expect(next.abandon()).rejects.toThrow('RESOLVE_SAVE_FIRST');
});
test('recorder enforces exact server command/byte bounds before unsavable progress', async () => {
  const s = await playing(); s.record.commands = Array.from({ length: MAX_COMMANDS }, (_, i) => ({ seq: i + 1, dir: 'up' }));
  storage.setItem(ATTEMPT_KEY, JSON.stringify(s.record)); expect(() => command(s, 'right')).toThrow('TRANSCRIPT_LIMIT');
  expect(JSON.stringify(transcript(s.record.commands)).length).toBeLessThan(MAX_BYTES); expect(s.state.position).toEqual([1, 1]);
  expect(() => replay(grid, [{ seq: 1, dir: 'diagonal' }])).toThrow('PREFIX_INVALID');
  expect(() => replay(grid, [{ seq: 1, dir: 'up', source: 'pointer' }])).toThrow('PREFIX_INVALID');
  expect(() => replay(grid, [...Array(4)].map((_, i) => ({ seq: i + 1, dir: 'right' })).concat({ seq: 5, dir: 'left' }))).toThrow('PREFIX_INVALID');
});
test('changed grid/hash/rules, unsupported ability or malformed session are refused', async () => {
  for (const value of [{ ...prepared, gridHash: 'bad' }, { ...prepared, revision: 0 },
    { ...prepared, manifest: { ...prepared.manifest, rulesVersion: 'next' } },
    { ...prepared, manifest: { ...prepared.manifest, abilityIds: ['power'] } },
    { ...prepared, grid: [['S', 'S', 'E']] }]) await expect(verifySession(value, date)).rejects.toThrow('MANIFEST_INVALID');
  expect(allowed({ protocol: 'wrong', admission: true, capabilities: ['route-transcript-v1'] })).toBe(false);
});
test('untimed never fabricates official number; receipt UI excludes private fields and rejects foreign identities', () => {
  expect(receiptView(receipt(), { attemptId, date }).timing).toEqual({ status: 'untimed', elapsedMs: null });
  for (const value of [{ ...receipt(), attemptId: 'foreign' }, { ...receipt(), timing: { status: 'untimed', elapsedMs: 100 } },
    { ...receipt(), timing: { status: 'official', elapsedMs: -1 } }]) expect(() => receiptView(value, { attemptId, date })).toThrow('RECEIPT_INVALID');
});


test('renewed JWT for the same account recovers only after a fresh owned status cycle; foreign account cannot rebind', async () => {
  const jwt = (id, nonce) => `e30.${window.btoa(JSON.stringify({ id, nonce }))}.synthetic`;
  const first = jwt('000000000000000000000001', 1), renewed = jwt('000000000000000000000001', 2), foreign = jwt('000000000000000000000009', 1);
  const s = make({ token: first, context: () => ({ ...context(), token: first }) }); await s.initialize(); await s.ready(); command(s, 'right');
  expect(await identityDigest(first)).toBe(await identityDigest(renewed));
  const fresh = make({ token: renewed, context: () => ({ ...context(), token: renewed }) }); await fresh.initialize(); expect(fresh.state.position).toEqual([1, 2]); expect(fresh.live).toBe(false);
  await expect(make({ token: foreign, context: () => ({ ...context(), token: foreign }) }).initialize()).rejects.toThrow('ATTEMPT_SCOPE');
});


test('interrupted ready ACK cannot overwrite a resumed completion or re-enable its input', async () => {
  let ack; api.ready.mockImplementationOnce(() => new Promise(resolve => { ack = resolve; }));
  const s = make(); await s.initialize(); const late = s.ready(); s.interrupt();
  await s.resolve(); await s.ready(); for (let i = 0; i < 4; i++) command(s, 'right'); await s.submit();
  ack(started); await expect(late).rejects.toThrow('STALE_OPERATION');
  expect(s.record.phase).toBe('accepted'); expect(s.live).toBe(false); expect(api.complete).toHaveBeenCalledTimes(1);
});
