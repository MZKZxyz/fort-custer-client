import test from 'node:test';
import assert from 'node:assert/strict';
import { createController, transition, dragDirection, boundedTiming } from '../controller.mjs';
import { ruleFixture, initialState } from '../fixtures.mjs';

function harness() {
  let now = 0, serial = 0;
  const pending = new Map(), callbacks = [], log = [], changes = [];
  let state = initialState(ruleFixture());
  const clock = {
    setTimeout(callback, delay) { const id = ++serial; pending.set(id, { callback, at: now + delay }); callbacks.push(callback); return id; },
    clearTimeout(id) { pending.delete(id); },
  };
  const controller = createController({ clock, command(direction) {
    const result = transition(state, direction); state = result.state;
    log.push({ direction, reason: result.reason, position: state.position, inventory: state.inventory }); return result;
  }, changed(value) { changes.push(value); } });
  return { controller, log, changes, callbacks, pending, state: () => state,
    advance(ms) { const end = now + ms; for (;;) {
      const due = [...pending].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at; pending.delete(due[0]); due[1].callback();
    } now = end; },
  };
}

test('immediate first step, bounded delay and atomic stationary clear latch', () => {
  const h = harness(); const original = ruleFixture();
  h.controller.press('pointer:1', 'right');
  assert.deepEqual(h.state().position, [1, 2]);
  assert.deepEqual(h.state().inventory, ['extinguisher']);
  h.advance(399); assert.equal(h.log.length, 1);
  h.advance(1); assert.equal(h.log.length, 2);
  assert.equal(h.log[1].reason, 'fire cleared');
  assert.deepEqual(h.state().position, [1, 2]);
  assert.equal(h.state().grid[1][3], ' ');
  assert.deepEqual(h.state().inventory, []);
  h.controller.steer('pointer:1', 'left'); h.controller.press('pointer:1', 'right');
  h.advance(5000); assert.equal(h.log.length, 2);
  h.controller.release('pointer:1'); h.controller.press('pointer:1', 'right');
  assert.deepEqual(h.state().position, [1, 3]);
  h.advance(400); assert.equal(h.state().completed, true);
  const completed = h.state(); h.advance(2000);
  h.controller.release('pointer:1'); h.controller.press('key:ArrowLeft', 'left');
  assert.equal(h.state(), completed);
  assert.equal(original[1].slice(1,5).join(''), 'SXFE');
});
test('steady held movement uses configured repeat and does not catch up in a single callback', () => {
  const h = harness(); h.controller.configure({ delay: 200, repeat: 100 });
  h.controller.press('key', 'down'); h.advance(199); assert.equal(h.log.length, 1);
  h.advance(1); assert.equal(h.log.length, 2);
  h.advance(99); assert.equal(h.log.length, 2);
  h.advance(1); assert.equal(h.log.length, 3);
  h.controller.release('key'); h.advance(5000); assert.equal(h.log.length, 3);
});
for (const reason of ['pointerup', 'pointercancel', 'lost capture', 'window blur', 'document hidden', 'modal opened', 'resize', 'orientation', 'focus left control', 'scheme change', 'timing changed']) {
  test(`${reason}: invalidated callbacks and foreign releases cannot move a fresh session`, () => {
    const h = harness(); h.controller.press('old', 'down');
    const stale = h.callbacks[0]; h.controller.cancel(reason);
    h.controller.steer('old', 'right'); stale(); assert.equal(h.log.length, 1);
    h.controller.press('new', 'down'); h.controller.release('old'); stale();
    h.advance(400); assert.equal(h.log.length, 3);
    h.controller.release('new'); h.advance(2000); assert.equal(h.log.length, 3);
  });
}
test('unmount invalidates timers and disallows later activation', () => {
  const h = harness(); h.controller.press('old', 'down'); const stale = h.callbacks[0];
  h.controller.destroy(); stale(); h.controller.press('new', 'down'); h.advance(2000);
  assert.equal(h.log.length, 1); assert.equal(h.pending.size, 0);
});
test('wall, bounds and unequipped fire stop without mutating fixtures', () => {
  const h = harness(); h.controller.press('a', 'up'); h.advance(2000); assert.equal(h.log.length, 1);
  h.controller.steer('a', 'right'); assert.equal(h.log.length, 1);
  const state = initialState([['S', 'F']]);
  assert.deepEqual(transition(state, 'right'), { state, reason: 'fire blocked', terminal: true });
  assert.equal(transition(state, 'left').state, state);
});
test('one owner, neutral drag, axis ambiguity and steering rate cap', () => {
  const h = harness(); assert.equal(h.controller.press('drag'), true);
  assert.equal(h.controller.press('other', 'down'), false);
  assert.equal(h.log.length, 0);
  h.controller.steer('drag', 'down'); assert.equal(h.log.length, 1);
  for (let i = 0; i < 50; i++) { h.controller.steer('drag', 'right'); h.controller.steer('drag', 'down'); }
  assert.equal(h.log.length, 1); h.advance(180); assert.equal(h.log.length, 2);
  h.controller.steer('drag', null); h.advance(1000); assert.equal(h.log.length, 2);
  h.controller.steer('drag', 'down'); h.advance(179); assert.equal(h.log.length, 2);
  h.advance(1); assert.equal(h.log.length, 3);
  assert.deepEqual([[0,0], [17,0], [30,30], [30,25]].map(([x,y]) => dragDirection(x,y)), [null,null,null,null]);
  assert.equal(dragDirection(18,0), 'right'); assert.equal(dragDirection(-18,0), 'left');
  assert.equal(dragDirection(0,18), 'down'); assert.equal(dragDirection(0,-18), 'up');
});
test('timing values clamp and nonfinite inputs fall back', () => {
  assert.deepEqual(boundedTiming({ delay: -1, repeat: 900 }), { delay: 200, repeat: 400 });
  assert.deepEqual(boundedTiming({ delay: Infinity, repeat: NaN }), { delay: 400, repeat: 180 });
});
