import { bindMazeInput } from './inputCoordinator';
import { move } from './movement';
import { commandOutcome } from './commandOutcome';
import { createController } from './inputController';

let root, binding, state, commands;
const key = (type, key = 'ArrowRight', extra = {}) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...extra }));
const pointer = (type, target, extra = {}) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 100, ...extra });
  target.dispatchEvent(event);
};
beforeEach(() => {
  jest.useFakeTimers();
  root = document.createElement('div');
  root.innerHTML = '<button data-direction="right">Right</button><div data-maze-surface tabindex="0"></div><input />';
  document.body.append(root);
  commands = [];
  state = { grid: ['#######', '#SXFE #', '#     #', '#######'].map(row => [...row]), position: [1, 1], inventory: [], completed: false };
  binding = bindMazeInput(root, { command(direction) {
    const result = move(state, direction);
    const outcome = commandOutcome(state, result);
    state = result.state; commands.push(outcome.reason);
    return outcome;
  } });
});
afterEach(() => { binding.destroy(); root.remove(); jest.useRealTimers(); });

test('held native keyboard clears stationary, ignores repeats and requires keyup/new keydown', () => {
  key('keydown');
  jest.advanceTimersByTime(400);
  expect(commands).toEqual(['step', 'fire cleared']);
  for (let n = 0; n < 4; n++) key('keydown', 'ArrowRight', { repeat: true });
  jest.advanceTimersByTime(3000);
  expect(state.position).toEqual([1, 2]);
  expect(state.inventory).toEqual([]);
  key('keydown', 'ArrowDown');
  expect(commands).toHaveLength(2);
  key('keyup'); key('keydown');
  expect(state.position).toEqual([1, 3]);
});

test('D-pad pointerup and ensuing click never issue a duplicate transition', () => {
  const button = root.querySelector('button');
  pointer('pointerdown', button); pointer('pointerup', window);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  jest.advanceTimersByTime(1000);
  expect(commands).toEqual(['step']);
  // Assistive activation without a physical pointer sequence still works.
  button.click();
  expect(commands).toEqual(['step', 'fire cleared']);
});

test('Space/Enter use the same hold and suppress the browser default activation', () => {
  const button = root.querySelector('button'); button.focus();
  const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  button.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  jest.advanceTimersByTime(400);
  button.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
  expect(commands).toEqual(['step', 'fire cleared']);
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(state.position).toEqual([1, 3]);
});

test('drag wall pauses, redirects within the same contact, then release stops', () => {
  const pad = root.querySelector('[data-maze-surface]');
  pointer('pointerdown', pad);
  pointer('pointermove', window, { clientY: 60 });
  jest.advanceTimersByTime(2000);
  expect(commands).toEqual(['obstruction']);
  pointer('pointermove', window, { clientY: 140 });
  jest.advanceTimersByTime(179); expect(commands).toHaveLength(1);
  jest.advanceTimersByTime(1); expect(state.position).toEqual([2, 1]);
  pointer('pointerup', window); jest.advanceTimersByTime(1000);
  expect(commands).toHaveLength(2);
});

test('a child hit captures on the stable maze surface and suppresses native image dragging', () => {
  const surface = root.querySelector('[data-maze-surface]');
  surface.innerHTML = '<span><img alt="Maze sprite" /></span>';
  surface.setPointerCapture = jest.fn();
  pointer('pointerdown', surface.querySelector('img'));
  expect(surface.setPointerCapture).toHaveBeenCalledWith(1);
  expect(document.activeElement).toBe(surface);
  // Rendering can replace sprites while the same captured host survives.
  surface.innerHTML = '<span>Updated maze</span>';
  pointer('pointermove', window, { clientY: 140 });
  expect(state.position).toEqual([2, 1]);
  const drag = new Event('dragstart', { bubbles: true, cancelable: true });
  surface.querySelector('span').dispatchEvent(drag);
  expect(drag.defaultPrevented).toBe(true);
  pointer('pointerup', window);
  jest.advanceTimersByTime(2000);
  expect(commands).toEqual(['step']);
});

test.each(['pointercancel', 'lostpointercapture'])('%s terminates captured input', type => {
  pointer('pointerdown', root.querySelector('button'));
  pointer(type, type === 'pointercancel' ? window : document);
  jest.advanceTimersByTime(2000); expect(commands).toEqual(['step']);
});
test.each(['blur', 'resize', 'orientationchange', 'pagehide'])('%s cancels and native repeats cannot restart', type => {
  key('keydown'); window.dispatchEvent(new Event(type));
  key('keydown', 'ArrowRight', { repeat: true });
  jest.advanceTimersByTime(2000); expect(commands).toEqual(['step']);
});
test('additional contact cancels without acquiring the second pointer', () => {
  const button = root.querySelector('button');
  pointer('pointerdown', button);
  pointer('pointerdown', button, { pointerId: 2 });
  jest.advanceTimersByTime(2000); expect(commands).toEqual(['step']);
});
test('form fields, foreign controls and focus loss preserve keyboard access', () => {
  root.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(commands).toHaveLength(0);
  key('keydown');
  root.querySelector('button').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  jest.advanceTimersByTime(1000); expect(commands).toEqual(['step']);
});
test('unmount removes listeners and cancels a pending repeat', () => {
  key('keydown'); binding.destroy();
  key('keydown', 'ArrowDown'); jest.advanceTimersByTime(2000);
  expect(commands).toEqual(['step']);
});
test('a synchronous shell cancellation inside a command cannot re-arm its timer', () => {
  const command = jest.fn(() => {
    controller.cancel('modal opened');
    return { reason: 'step', terminal: false };
  });
  const controller = createController({ command });
  expect(() => controller.press('key', 'right')).not.toThrow();
  jest.advanceTimersByTime(2000);
  expect(command).toHaveBeenCalledTimes(1);
  controller.destroy();
});

test('coalesced samples select intent without extra commands; comparison changes cancel the held gesture', () => {
  binding.destroy();
  const command = jest.fn(() => ({ reason: 'step', terminal: false }));
  binding = bindMazeInput(root, { command, inspect: () => 'open' });
  const host = root.querySelector('[data-maze-surface]');
  pointer('pointerdown', host);
  pointer('pointermove', window, { clientX: 200, clientY: 200,
    getCoalescedEvents: () => [{ clientX: 140, clientY: 100 }, { clientX: 200, clientY: 100 }] });
  expect(command.mock.calls).toEqual([['right']]);
  jest.advanceTimersByTime(400);
  expect(command.mock.calls).toEqual([['right'], ['down']]);
  binding.configureSteering('legacy');
  pointer('pointermove', window, { clientX: 100, clientY: 200 });
  jest.advanceTimersByTime(1000); expect(command).toHaveBeenCalledTimes(2);
  pointer('pointerup', window); pointer('pointerdown', host);
  pointer('pointermove', window, { clientX: 140, clientY: 140 });
  jest.advanceTimersByTime(1000); expect(command).toHaveBeenCalledTimes(2);
});
