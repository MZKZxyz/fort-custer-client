import { findStart, move } from '../game/movement';
import { ATTEMPT_KEY, RECEIPT_KEY, PROTOCOL, MAX_COMMANDS, MAX_BYTES,
  directions, transcript, problem, digest, identityDigest, randomKey, allowed, receiptView } from './contract';

const copy = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keyPattern = /^[A-Za-z0-9_-]{8,128}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const states = ['PREPARED', 'STARTED', 'COMPLETED', 'EXPIRED', 'ABANDONED'];
export const initialState = grid => ({ grid: copy(grid), position: findStart(grid), inventory: [], completed: false });
export function replay(grid, commands) {
  if (!Array.isArray(commands) || commands.length > MAX_COMMANDS
    || JSON.stringify(transcript(commands)).length > MAX_BYTES) throw problem('PREFIX_INVALID');
  return commands.reduce((state, command, index) => {
    if (!same(Object.keys(command).sort(), ['dir', 'seq']) || command.seq !== index + 1
      || !directions.includes(command.dir) || state.completed) throw problem('PREFIX_INVALID');
    return move(state, command.dir).state;
  }, initialState(grid));
}
export async function verifySession(session, date) {
  const m = session?.manifest, grid = session?.grid;
  if (session?.protocol !== PROTOCOL || !uuid.test(session.attemptId) || session.date !== date
    || !states.includes(session.state) || !Number.isSafeInteger(session.revision) || session.revision < 1
    || !Number.isSafeInteger(session.expiresAt) || (session.state === 'STARTED' && !Number.isSafeInteger(session.startedAt))
    || (session.state === 'PREPARED' && !uuid.test(session.nonce))
    || !Array.isArray(grid) || !grid.length || grid.length > 101 || !Array.isArray(grid[0])
    || !grid[0].length || grid[0].length > 101 || grid.some(row => !Array.isArray(row)
      || row.length !== grid[0].length || row.some(tile => !['#', ' ', 'S', 'E', 'X', 'F'].includes(tile)))
    || grid.flat().filter(tile => tile === 'S').length !== 1 || grid.flat().filter(tile => tile === 'E').length !== 1
    || m?.protocol !== PROTOCOL || m.date !== date || m.gridHash !== session.gridHash
    || m.rulesVersion !== 'cardinal-fire-v1' || m.validationPolicyVersion !== 'route-replay-v1'
    || m.integrityTier !== 'server-timed-legal-route-v1' || m.publicLabel !== 'Server-timed · route validated'
    || m.runClass !== 'standard' || !Array.isArray(m.abilityIds) || m.abilityIds.length
    || m.competitionVersion !== 'cardinal-fire-standard-v1' || m.scoringMethod !== 'playable-receipt-v2'
    || !/^[a-f0-9]{64}$/.test(m.mazeVersion) || await digest(grid) !== session.gridHash) throw problem('MANIFEST_INVALID');
  return session;
}

// Local checkpoints detect corruption by replay and a SHA-256 binding of the
// server grid/manifest. They are not proof of human input or tamper resistance.
export class PlayableSession {
  constructor({ api, storage = localStorage, profileId, date, token, context = () => ({
    token: localStorage.getItem('token'), profileId: JSON.parse(localStorage.getItem('activeSubProfile'))?._id,
    date: localStorage.getItem('selectedMazeDate') || date,
  }), now = () => Date.now() }) {
    Object.assign(this, { api, storage, profileId, date, token, context, now });
    this.live = false;
    this.epoch = 0;
  }
  interrupt() { this.live = false; this.epoch++; }
  current(epoch) { if (epoch !== this.epoch) throw problem('STALE_OPERATION'); this.assertContext(); }
  assertContext() {
    const current = this.context();
    if (current.token !== this.token || current.profileId !== this.profileId || current.date !== this.date) throw problem('CONTEXT_CHANGED');
  }
  persist(next) {
    this.assertContext();
    try {
      if (this.record && this.storage.getItem(ATTEMPT_KEY) !== JSON.stringify(this.record)) throw problem('STORAGE_CHANGED');
      const encoded = JSON.stringify(next);
      this.storage.setItem(ATTEMPT_KEY, encoded);
      if (this.storage.getItem(ATTEMPT_KEY) !== encoded) throw problem('STORAGE_UNAVAILABLE');
    } catch { this.live = false; throw problem('STORAGE_UNAVAILABLE'); }
    this.record = next;
  }
  async initialize() {
    const epoch = this.epoch;
    this.assertContext();
    const identityHash = await identityDigest(this.token);
    this.current(epoch);
    let record;
    try { record = JSON.parse(this.storage.getItem(ATTEMPT_KEY)); }
    catch { throw problem('STORAGE_UNAVAILABLE'); }
    if (record) {
      if (record.version !== 1 || record.identityHash !== identityHash || record.profileId !== this.profileId
        || record.date !== this.date || (record.attemptId && !uuid.test(record.attemptId))
        || !['createKey', 'readyKey', 'completionKey', 'abandonKey'].every(key => keyPattern.test(record[key]))) throw problem('ATTEMPT_SCOPE');
      this.record = record;
      return this.resolve(); // recovery remains possible with admission OFF
    }
    let capabilities;
    try { capabilities = await this.api.capabilities(); this.current(epoch); }
    catch (error) {
      if ([404, 426].includes(error.response?.status)) return { legacy: true };
      throw error;
    }
    if (!allowed(capabilities)) return { legacy: true }; // before any possible create only
    this.persist({ version: 1, identityHash, profileId: this.profileId, date: this.date,
      createKey: randomKey(), readyKey: randomKey(), completionKey: randomKey(), abandonKey: randomKey(),
      commands: [], phase: 'creating' });
    return this.resolve();
  }
  async acceptSession(session, epoch = this.epoch) {
    await verifySession(session, this.date);
    const pin = await digest({ grid: session.grid, manifest: session.manifest });
    this.current(epoch);
    const r = this.record;
    if ((r.attemptId && r.attemptId !== session.attemptId) || (r.pin && r.pin !== pin)) throw problem('PIN_CHANGED');
    // Keep the verified owned identity even when its local prefix needs review.
    this.session = session;
    const state = replay(session.grid, r.commands);
    if (r.checkpoint && !same(r.checkpoint, state)) throw problem('CHECKPOINT_INVALID');
    if (!r.checkpoint && (r.commands.length || session.state !== 'PREPARED')) throw problem('PREFIX_MISSING');
    this.persist({ ...r, attemptId: session.attemptId, pin, checkpoint: state,
      session, ...(session.nonce ? { readyPayload: { subProfileId: this.profileId, key: r.readyKey,
        nonce: session.nonce, gridHash: session.gridHash, rulesVersion: session.manifest.rulesVersion } } : {}) });
    this.state = state;
    return { session, state };
  }
  async resolve() {
    const epoch = this.epoch;
    this.live = false; this.assertContext();
    const r = this.record;
    if (!r) throw problem('ATTEMPT_MISSING');
    let session = r.attemptId ? await this.api.status(r.attemptId, this.profileId)
      : await this.api.create({ subProfileId: this.profileId, date: this.date, createKey: r.createKey });
    this.current(epoch);
    if (session.state === 'COMPLETED' || session.saveStatus === 'resolving' || r.completion) {
      // A missing/failed result read is never abort proof. Only recover can prove it.
      await verifySession(session, this.date);
      if (r.attemptId !== session.attemptId || (r.pin && r.pin !== await digest({ grid: session.grid, manifest: session.manifest }))) throw problem('PIN_CHANGED');
      this.current(epoch);
      this.session = session;
      try { return await this.acceptReceipt(await this.api.result(session.attemptId, this.profileId), epoch); }
      catch (error) { if (error.response?.status !== 503) throw error; }
      this.current(epoch);
      const recovery = await this.api.recover(session.attemptId, this.profileId);
      this.current(epoch);
      if (recovery.status === 'accepted') return this.acceptReceipt(recovery, epoch);
      if (recovery.outcome === 'no-pending') session = recovery.session;
      else if (recovery.outcome === 'aborted' && recovery.retrySameOperation === true) session = await this.api.status(session.attemptId, this.profileId);
      else throw problem('OUTCOME_UNRESOLVED');
    }
    const result = await this.acceptSession(session, epoch);
    if (['EXPIRED', 'ABANDONED', 'COMPLETED'].includes(session.state)) throw problem(`SESSION_${session.state}`);
    if (this.record.completion) return this.submit();
    if (session.saveStatus === 'resolving') throw problem('OUTCOME_UNRESOLVED');
    if (result.state.completed) throw problem('COMPLETION_INTENT_MISSING');
    return result;
  }
  async ready() {
    const epoch = this.epoch;
    this.assertContext();
    if (this.session.state === 'PREPARED') {
      this.persist({ ...this.record, phase: 'ready' });
      await this.acceptSession(await this.api.ready(this.record.attemptId, this.record.readyPayload, this.session.revision), epoch);
    }
    this.current(epoch);
    if (this.session.state !== 'STARTED') throw problem(`SESSION_${this.session.state}`);
    if (this.now() >= this.session.expiresAt) throw problem('CHECK_DEADLINE');
    this.persist({ ...this.record, phase: 'playing' });
    this.live = true;
    return Math.max(0, this.now() - this.session.startedAt); // provisional, includes ACK latency
  }
  append(direction, before, after) {
    this.assertContext();
    if (!this.live || this.record.completion || this.now() >= this.session.expiresAt) throw problem('INPUT_LOCKED');
    if (!same(before, this.state) || before.completed || !directions.includes(direction)) throw problem('CHECKPOINT_INVALID');
    const commands = [...this.record.commands, { seq: this.record.commands.length + 1, dir: direction }];
    if (commands.length > MAX_COMMANDS || JSON.stringify(transcript(commands)).length > MAX_BYTES) throw problem('TRANSCRIPT_LIMIT');
    // Persist both command and predicted pure transition BEFORE any UI/state effect.
    const next = { ...this.record, commands, checkpoint: after };
    if (after.completed) { next.completion = transcript(commands); next.phase = 'completing'; }
    this.persist(next); this.state = after;
    if (after.completed) this.live = false;
  }
  async submit() {
    const epoch = this.epoch;
    this.live = false; this.assertContext();
    const r = this.record;
    if (!r.completion || !same(r.completion, transcript(r.commands)) || !this.state.completed) throw problem('COMPLETION_INVALID');
    // Frozen payload/key survives every timeout, abort proof and refresh.
    return this.acceptReceipt(await this.api.complete(r.attemptId, {
      subProfileId: this.profileId, completionKey: r.completionKey, transcript: r.completion,
    }, this.session.revision), epoch);
  }
  async acceptReceipt(raw, epoch = this.epoch) {
    this.current(epoch);
    this.live = false;
    this.assertContext();
    const receipt = receiptView(raw, this.record);
    const stored = { version: 1, identityHash: this.record.identityHash, profileId: this.profileId,
      date: this.date, attemptId: this.record.attemptId, receipt };
    try { this.storage.setItem(RECEIPT_KEY, JSON.stringify(stored)); }
    catch { throw problem('STORAGE_UNAVAILABLE'); }
    this.persist({ ...this.record, phase: 'accepted', receipt });
    return { receipt };
  }
  async abandon() {
    const epoch = this.epoch;
    this.live = false; this.assertContext();
    const r = this.record;
    if (!r?.attemptId) throw problem('CREATE_UNRESOLVED');
    const s = await this.api.status(r.attemptId, this.profileId);
    await verifySession(s, this.date);
    this.current(epoch);
    if (s.attemptId !== r.attemptId) throw problem('PIN_CHANGED');
    if (s.saveStatus === 'resolving' || s.state === 'COMPLETED' || r.completion) throw problem('RESOLVE_SAVE_FIRST');
    if (!['EXPIRED', 'ABANDONED'].includes(s.state)) {
      this.persist({ ...r, phase: 'abandoning' });
      const ack = await this.api.abandon(r.attemptId, { subProfileId: this.profileId, key: r.abandonKey, reason: 'restart' }, s.revision);
      this.current(epoch);
      if (ack.attemptId !== r.attemptId || ack.state !== 'ABANDONED') throw problem('OUTCOME_UNRESOLVED');
    }
    this.storage.removeItem(ATTEMPT_KEY); // only terminal proof permits an explicit restart
    this.record = null;
  }
}
