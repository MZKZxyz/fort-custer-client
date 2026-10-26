/* global globalThis */
import { move } from './movement.js';
import { commandOutcome } from './commandOutcome.js';

export const DEFAULT_TIMING = Object.freeze({ delay: 400, repeat: 180 });
// Two forward opportunities plus one fixed repeat of callback tolerance. This
// changes intent lifetime only; it never adds opportunities or alters cadence.
export const TURN_POLICY = Object.freeze({ maxForwardSteps: 2, callbackGraceMs: 180 });
export function boundedTiming({ delay, repeat }) {
  const bound = (value, low, high, fallback) => Number.isFinite(Number(value))
    ? Math.max(low, Math.min(high, Number(value))) : fallback;
  return { delay: bound(delay, 200, 800, 400), repeat: bound(repeat, 100, 400, 180) };
}

// One shared reducer command for every adapter. A stationary clear is terminal
// for the current press even though move() returns a new state.
export function transition(state, direction) {
  const next = move(state, direction);
  const { reason, terminal } = commandOutcome(state, next);
  return { state: next.state, reason, terminal };
}

const perpendicular = (a, b) => ['left', 'right'].includes(a) !== ['left', 'right'].includes(b);

// inspect() reads authoritative adjacent tiles; it must never call move(). Only
// command() commits gameplay. Every input shares this single deadline scheduler.
export function createController({ command, inspect, changed = () => {}, clock = globalThis, timing = DEFAULT_TIMING }) {
  let session = null, timer = null, generation = 0, destroyed = false;
  let pace = boundedTiming(timing);
  const now = () => clock.now ? clock.now() : performance.now();
  const invalidate = () => { generation++; clock.clearTimeout(timer); timer = null; };
  const publish = (phase, reason) => changed({ phase, reason, direction: session?.direction || null,
    owner: session?.owner || null, heading: session?.heading || null,
    pending: session?.pending?.direction || null });
  const pause = reason => {
    invalidate(); session.pending = null; session.paused = true; publish('blocked', reason);
  };
  const schedule = at => {
    session.nextAt = at;
    invalidate();
    const ticket = generation;
    timer = clock.setTimeout(() => {
      if (destroyed || ticket !== generation || !session || session.halted || !session.direction) return;
      timer = null;
      // Browsers may round a fractional timeout down. Keep the same deadline
      // rather than executing early and accumulating a faster repeat cadence.
      if (now() < at) { schedule(at); return; }
      execute(false);
    }, Math.max(0, at - now()));
  };
  const choose = at => {
    const s = session, q = s.direction, h = s.heading;
    if (!s.anticipate || !h || !perpendicular(q, h)) { s.pending = null; return { direction: q }; }
    const expiresAt = s.pending?.expiresAt ?? (s.opportunityAt ?? at)
      + TURN_POLICY.maxForwardSteps * pace.repeat + TURN_POLICY.callbackGraceMs;
    if (at > expiresAt) return { pause: 'turn expired' };
    const side = inspect(q);
    // A fresh explicit fire request is a normal interaction. An already queued
    // request encountering fire must pause, without spending equipment.
    if (side === 'fire') return s.pending ? { pause: 'turn hazard' } : { direction: q };
    if (side === 'open') { s.pending = null; return { direction: q }; }
    if (side !== 'wall') return { pause: 'inactive' };
    if (!s.pending) s.pending = { direction: q, steps: 0, expiresAt };
    if (s.pending.steps >= TURN_POLICY.maxForwardSteps) return { pause: 'turn expired' };
    const forward = inspect(h);
    if (forward === 'fire') return { pause: 'turn hazard' };
    if (forward !== 'open') return { pause: 'obstruction' };
    return { direction: h, continued: true };
  };
  const execute = first => {
    const active = session, ticket = generation, at = now();
    active.nextAt = at + (first ? pace.delay : pace.repeat);
    active.paused = false;
    const decision = choose(at);
    if (decision.pause) { pause(decision.pause); return; }
    const result = command(decision.direction);
    if (destroyed || session !== active || ticket !== generation) return;
    if (result.terminal) {
      invalidate(); active.pending = null; active.paused = true;
      const collision = result.reason === 'obstruction' || result.reason === 'fire blocked';
      active.halted = !(active.drag && collision);
      if (active.halted) active.heading = null;
      publish(active.halted ? 'stopped' : 'blocked', result.reason);
    } else {
      active.heading = decision.direction;
      if (decision.continued) active.pending.steps++;
      publish('holding', active.pending ? 'turn queued' : result.reason);
      if (session === active && ticket === generation && !destroyed) schedule(active.nextAt);
    }
  };
  return {
    press(owner, direction = null, { drag = false, anticipate = Boolean(inspect) } = {}) {
      if (destroyed || session) return false;
      invalidate();
      session = { owner, direction, drag, anticipate: drag && anticipate && Boolean(inspect),
        heading: null, pending: null, halted: false, paused: false, started: Boolean(direction), nextAt: null, opportunityAt: null };
      if (direction) execute(true); else publish('preview', 'choose direction');
      return true;
    },
    steer(owner, direction) {
      if (!session || session.owner !== owner || session.halted || session.direction === direction) return;
      session.direction = direction; session.pending = null;
      session.opportunityAt = Math.max(now(), session.nextAt || 0);
      if (!direction) {
        invalidate(); session.heading = null; session.paused = true; publish('preview', 'neutral — paused');
      } else if (!session.started) {
        session.started = true; execute(true);
      } else {
        const active = session;
        publish('holding', 'direction selected');
        if (session !== active || destroyed) return;
        // Updating intent never changes an active deadline. A paused contact
        // resumes at a bounded future deadline, retaining any protected delay.
        if (timer === null) {
          const at = Math.max(session.nextAt || 0, now() + pace.repeat);
          session.opportunityAt = at; schedule(at);
        }
      }
    },
    release(owner, reason = 'release') {
      if (!session || session.owner !== owner) return;
      invalidate(); session = null; publish('idle', reason);
    },
    cancel(reason = 'cancel') {
      if (destroyed) return;
      invalidate(); session = null; publish('idle', reason);
    },
    configure(values) { this.cancel('timing changed'); pace = boundedTiming(values); return pace; },
    destroy() { this.cancel('unmount'); destroyed = true; },
  };
}

// Displacement from the initial contact, not velocity or distance travelled.
// An 18px dead zone and 1.25 axis ratio reject diagonal jitter.
export function dragDirection(dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return null;
  if (Math.abs(dx) >= Math.abs(dy) * 1.25) return dx > 0 ? 'right' : 'left';
  if (Math.abs(dy) >= Math.abs(dx) * 1.25) return dy > 0 ? 'down' : 'up';
  return null;
}
