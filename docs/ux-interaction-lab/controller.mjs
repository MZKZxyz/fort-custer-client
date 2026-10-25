import { move } from '../../src/game/movement.js';

export const DEFAULT_TIMING = Object.freeze({ delay: 400, repeat: 180 });
export function boundedTiming({ delay, repeat }) {
  const bound = (value, low, high, fallback) => Number.isFinite(Number(value))
    ? Math.max(low, Math.min(high, Number(value))) : fallback;
  return { delay: bound(delay, 200, 800, 400), repeat: bound(repeat, 100, 400, 180) };
}

// One shared reducer command for every adapter. A stationary clear is terminal
// for the current press even though move() returns a new state.
export function transition(state, direction) {
  const next = move(state, direction);
  const stationary = next.state.position.every((value, index) => value === state.position[index]);
  const reason = next.state === state ? (next.blockedByFire ? 'fire blocked' : 'obstruction')
    : next.state.completed ? 'complete' : stationary ? 'fire cleared' : 'step';
  return { state: next.state, reason, terminal: reason !== 'step' };
}

export function createController({ command, changed = () => {}, clock = globalThis, timing = DEFAULT_TIMING }) {
  let session = null;
  let timer = null;
  let generation = 0;
  let destroyed = false;
  let pace = boundedTiming(timing);
  const invalidate = () => { generation++; clock.clearTimeout(timer); timer = null; };
  const publish = (phase, reason) => changed({ phase, reason, direction: session?.direction || null, owner: session?.owner || null });
  const tick = wait => {
    const ticket = generation;
    timer = clock.setTimeout(() => {
      if (destroyed || ticket !== generation || !session || session.halted || !session.direction) return;
      execute(pace.repeat);
    }, wait);
  };
  const execute = wait => {
    const result = command(session.direction);
    if (result.terminal) {
      invalidate();
      session.halted = true; // Keep ownership until release; drag cannot restart.
      publish('stopped', result.reason);
    } else {
      publish('holding', result.reason);
      tick(wait);
    }
  };
  return {
    press(owner, direction = null) {
      if (destroyed || session) return false;
      invalidate();
      session = { owner, direction, halted: false, started: Boolean(direction) };
      if (direction) execute(pace.delay); else publish('preview', 'choose direction');
      return true;
    },
    steer(owner, direction) {
      if (!session || session.owner !== owner || session.halted || session.direction === direction) return;
      invalidate();
      session.direction = direction;
      if (direction) {
        if (!session.started) { session.started = true; execute(pace.delay); }
        else { publish('holding', 'direction selected'); tick(pace.repeat); }
      } else publish('preview', 'neutral — paused');
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
