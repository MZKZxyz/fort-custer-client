import { createController } from './inputController';
import { createDragSteering, snappedDirection } from './dragSteering';
import { move, inspectDirection } from './movement';
import { commandOutcome } from './commandOutcome';

function cornerGrid(opening = 4) {
  const grid = Array.from({ length: 8 }, () => Array(9).fill('#'));
  for (let c = 1; c <= 6; c++) grid[1][c] = ' ';
  for (let r = 2; r <= 5; r++) grid[r][opening] = ' ';
  for (let c = 1; c <= opening; c++) grid[4][c] = ' ';
  grid[1][1] = 'S'; grid[5][opening] = 'E';
  return grid;
}
function harness(grid = cornerGrid(), inventory = []) {
  let time = 0, id = 0;
  const tasks = new Map(), callbacks = [], log = [], phases = [], reads = [];
  let state = { grid, inventory, position: [1, 1], completed: false };
  const clock = {
    now: () => time,
    setTimeout(callback, delay) { const key = ++id; tasks.set(key, { callback, at: time + delay }); callbacks.push(callback); return key; },
    clearTimeout(key) { tasks.delete(key); },
  };
  const controller = createController({ clock, inspect(direction) {
    reads.push({ at: time, direction }); return inspectDirection(state, direction);
  }, command(direction) {
    const result = move(state, direction), outcome = commandOutcome(state, result);
    state = result.state; log.push({ at: time, direction, reason: outcome.reason, position: state.position });
    return outcome;
  }, changed(input) { phases.push(input); } });
  return { controller, log, phases, reads, callbacks, tasks, state: () => state,
    advance(ms) {
      const end = time + ms;
      for (;;) {
        const due = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        time = due[1].at; tasks.delete(due[0]); due[1].callback();
      }
      time = end;
    },
    late(ms) {
      time += ms;
      const due = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (due) { tasks.delete(due[0]); due[1].callback(); }
    },
  };
}
function start(h) { h.controller.press('drag', 'right', { drag: true }); }
const ray = degrees => [40 * Math.cos(degrees * Math.PI / 180), 40 * Math.sin(degrees * Math.PI / 180)];

test('53/37 degree equality retains previous requested direction; jitter never becomes neutral', () => {
  const s = createDragSteering(0, 0, 'fixed');
  expect([40, 44, 46, 49, 52, 54, 50, 46, 40, 36].map(a => s.sample(...ray(a))))
    .toEqual(['right', 'right', 'right', 'right', 'right', 'down', 'down', 'down', 'down', 'right']);
  expect(snappedDirection(...ray(53), 'right')).toBe('right');
  expect(snappedDirection(...ray(53.001), 'right')).toBe('down');
  expect(snappedDirection(...ray(37), 'down')).toBe('down');
  expect(snappedDirection(...ray(36.999), 'down')).toBe('right');
  expect(snappedDirection(-40, 0, 'right')).toBe('left');
});
test.each([45, 135, -45, -135])('cold diagonal %s deterministically selects horizontal', angle => {
  expect(snappedDirection(...ray(angle))).toBe(Math.cos(angle * Math.PI / 180) > 0 ? 'right' : 'left');
});
test('rotated boundaries and max-axis 12/18 hysteresis preserve the specified footprint', () => {
  for (const [q, a] of [['right', 0], ['down', 90], ['left', 180], ['up', -90]]) {
    expect(snappedDirection(...ray(a + 53), q)).toBe(q);
    expect(snappedDirection(...ray(a + 53.01), q)).not.toBe(q);
  }
  const s = createDragSteering(0, 0, 'fixed');
  expect([17.99, 18, 12, 11.99, 17.99, 18].map(x => s.sample(x, 0))).toEqual([null, 'right', 'right', null, null, 'right']);
  expect(createDragSteering(0, 0, 'fixed').sample(13, 13)).toBeNull();
});
test.each([1, 8, 64])('48px trailing anchor bounds long gestures at %spx sampling and stays still while held', spacing => {
  const s = createDragSteering(0, 0);
  for (let x = spacing; x <= 1024; x += spacing) {
    s.sample(x, 0);
    const { anchor, pointer } = s.snapshot();
    expect(Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y)).toBeLessThanOrEqual(48.0000001);
  }
  const held = s.snapshot();
  for (let n = 0; n < 100; n++) { s.sample(held.pointer.x, held.pointer.y); expect(s.snapshot()).toEqual(held); }
});
test('fixed and trailing anchors provide a measurable interactive comparison; original selector keeps its wedge', () => {
  const fixed = createDragSteering(0, 0, 'fixed'), trailing = createDragSteering(0, 0);
  fixed.sample(240, 0); trailing.sample(240, 0);
  expect(fixed.sample(240, 64)).toBe('right'); expect(trailing.sample(240, 64)).toBe('down');
  expect(fixed.snapshot().anchor).toEqual({ x: 0, y: 0 });
  expect(createDragSteering(0, 0, 'legacy').sample(40, 40)).toBeNull();
});

test('early turn two cells ahead: one canonical command at 0/400/580/760, then a second explicit corner', () => {
  const h = harness(); start(h); h.advance(20); h.controller.steer('drag', 'down');
  expect(h.reads).toHaveLength(0); // Input samples do not speculate about gameplay.
  h.advance(740);
  expect(h.log.map(x => [x.at, x.direction])).toEqual([[0, 'right'], [400, 'right'], [580, 'right'], [760, 'down']]);
  h.advance(180); // row 3, col 4
  h.controller.steer('drag', 'left'); h.advance(360);
  expect(h.log.slice(-3).map(x => [x.at, x.direction])).toEqual([[940, 'down'], [1120, 'down'], [1300, 'left']]);
  expect(h.state().position).toEqual([4, 3]);
});
test('unchanged angle and repeated samples cannot renew a two-cell buffer or reach a farther opening', () => {
  const h = harness(cornerGrid(5)); start(h); h.controller.steer('drag', 'down');
  h.advance(580); for (let n = 0; n < 100; n++) h.controller.steer('drag', 'down');
  h.advance(5000);
  expect(h.log.map(x => x.at)).toEqual([0, 400, 580]);
  expect(h.state().position).toEqual([1, 4]);
  expect(h.phases.at(-1)).toMatchObject({ phase: 'blocked', pending: null, reason: 'turn expired' });
  expect(h.tasks.size).toBe(0);
});
test('a late callback expires intent even before the first buffer evaluation; no catch-up', () => {
  const h = harness(); start(h); h.advance(10); h.controller.steer('drag', 'down'); h.late(1000);
  expect(h.log).toHaveLength(1); expect(h.tasks.size).toBe(0);
  expect(h.phases.at(-1).reason).toBe('turn expired');
});
test('late callback during a pending turn cannot revive it at a now-open side', () => {
  const h = harness(); start(h); h.controller.steer('drag', 'down'); h.advance(580); h.late(181);
  expect(h.log).toHaveLength(3); expect(h.state().position).toEqual([1, 4]);
  expect(h.phases.at(-1).reason).toBe('turn expired');
});
test('no request at a T junction means no automatic turn; reversal cancels pending side without forward fallback', () => {
  const straight = harness(); start(straight); straight.advance(760);
  expect(straight.log.map(x => x.direction)).toEqual(['right', 'right', 'right', 'right']);
  const h = harness(); start(h); h.controller.steer('drag', 'down'); h.advance(400);
  h.controller.steer('drag', 'left'); h.advance(180);
  expect(h.log.at(-1)).toMatchObject({ at: 580, direction: 'left', position: [1, 2] });
  expect(h.phases.at(-1).pending).toBeNull();
});
test('latest perpendicular request replaces the only pending turn; no queued corner list', () => {
  const h = harness(); start(h); h.controller.steer('drag', 'down'); h.advance(400);
  h.controller.steer('drag', 'up'); h.advance(360);
  expect(h.log.map(x => x.direction)).toEqual(['right', 'right', 'right', 'right']);
  expect(h.phases.at(-1).pending).toBe('up');
});
test('dead end and both blocked pause without choosing another route or issuing a fallback command', () => {
  const grid = cornerGrid(); grid[1][3] = '#';
  const h = harness(grid); start(h); h.controller.steer('drag', 'down'); h.advance(2000);
  expect(h.log).toHaveLength(1); expect(h.phases.at(-1).phase).toBe('blocked');
});
test('zigzag input cannot reset or shorten the initial delay; neutral re-engagement is not an immediate step', () => {
  const h = harness(); start(h); h.advance(10);
  for (let n = 0; n < 100; n++) { h.controller.steer('drag', 'down'); h.controller.steer('drag', 'right'); }
  h.advance(389); expect(h.log).toHaveLength(1);
  h.advance(1); expect(h.log.at(-1).at).toBe(400);
  h.controller.steer('drag', null); h.advance(10); h.controller.steer('drag', 'right');
  h.advance(179); expect(h.log).toHaveLength(2);
  h.advance(1); expect(h.log.at(-1).at).toBe(590);
});
test.each([{ inventory: [] }, { inventory: ['extinguisher'] }])('pending-side and continued-forward fire never auto-interact, inventory $inventory', ({ inventory }) => {
  for (const side of [true, false]) {
    const grid = cornerGrid(); if (side) grid[2][3] = 'F'; else grid[1][3] = 'F';
    const h = harness(grid, inventory); start(h); h.controller.steer('drag', 'down'); h.advance(2000);
    expect(h.log).toHaveLength(side ? 2 : 1);
    expect(h.state().inventory).toEqual(inventory);
    expect(h.state().grid[side ? 2 : 1][3]).toBe('F');
    expect(h.phases.at(-1).reason).toBe('turn hazard');
  }
});
test('a fresh explicit selection can clear fire once, stationary, then all steering stays latched until release', () => {
  const grid = cornerGrid(); grid[2][3] = 'F';
  const h = harness(grid, ['extinguisher']); start(h); h.controller.steer('drag', 'down'); h.advance(580);
  h.controller.steer('drag', 'up'); h.controller.steer('drag', 'down'); h.advance(180);
  expect(h.log.at(-1).reason).toBe('fire cleared'); expect(h.state().position).toEqual([1, 3]);
  expect(h.state().inventory).toEqual([]);
  h.controller.steer('drag', 'left'); h.controller.steer('drag', 'down'); h.advance(1000);
  expect(h.state().position).toEqual([1, 3]);
  h.controller.release('drag'); h.controller.press('new', 'down', { drag: true });
  expect(h.state().position).toEqual([2, 3]);
});
test('forward continuation can pick up X or complete E, through canonical move only', () => {
  const grid = cornerGrid(); grid[1][3] = 'X'; grid[1][4] = 'E';
  const h = harness(grid); start(h); h.controller.steer('drag', 'down'); h.advance(3000);
  expect(h.state().inventory).toEqual(['extinguisher']); expect(h.state().completed).toBe(true);
  expect(h.log.filter(x => x.reason === 'complete')).toHaveLength(1); expect(h.log).toHaveLength(3);
  expect(h.phases.at(-1).pending).toBeNull();
});
test.each(['pointercancel', 'lost capture', 'blur', 'hidden', 'modal', 'resize', 'multi-contact', 'fallback', 'settings', 'unmount'])('%s invalidates queue and every retained stale callback', reason => {
  const h = harness(); start(h); h.controller.steer('drag', 'down'); h.advance(400);
  const stale = [...h.callbacks];
  if (reason === 'unmount') h.controller.destroy(); else h.controller.cancel(reason);
  for (const callback of stale) callback(); h.controller.steer('drag', 'down'); h.advance(5000);
  expect(h.log).toHaveLength(2); expect(h.tasks.size).toBe(0); expect(h.phases.at(-1).pending).toBeNull();
});
test('unexpected canonical obstruction consumes the tick budget, with no second fallback command', () => {
  let time = 0, callback;
  const clock = { now: () => time, setTimeout(fn) { callback = fn; return 1; }, clearTimeout() {} };
  const command = jest.fn().mockReturnValueOnce({ reason: 'step', terminal: false })
    .mockReturnValue({ reason: 'obstruction', terminal: true });
  const c = createController({ command, inspect: direction => direction === 'down' ? 'wall' : 'open', clock });
  c.press('drag', 'right', { drag: true }); c.steer('drag', 'down');
  time = 400; callback();
  expect(command.mock.calls).toEqual([['right'], ['right']]);
  c.destroy();
});

test('synchronous cancellation while publishing changed intent cannot re-arm paused travel', () => {
  let c;
  const command = jest.fn(() => ({ reason: 'step', terminal: false }));
  c = createController({ command, changed(input) { if (input.reason === 'direction selected') c.cancel('modal'); } });
  c.press('drag', 'right', { drag: true }); c.steer('drag', null);
  expect(() => c.steer('drag', 'down')).not.toThrow();
  expect(command).toHaveBeenCalledTimes(1); c.destroy();
});
