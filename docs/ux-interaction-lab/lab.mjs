import { createMazeScene } from '../../src/game/scene.js';
import { createCamera } from '../../src/game/camera.js';
import { createController, transition, dragDirection } from './controller.mjs';
import { ruleFixture, initialState } from './fixtures.mjs';

const $ = selector => document.querySelector(selector);
const board = $('#play-board');
const world = $('#world');
const dialog = $('#pause-dialog');
const scope = new AbortController();
const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: scope.signal });
let garden;
try {
  const response = await fetch('../art/reference-scene/iteration-2/source/fixture.json');
  if (!response.ok) throw new Error(`Fixture load: ${response.status}`);
  garden = (await response.json()).grid.map(row => [...row]);
} catch {
  $('#fixture option[value=garden]').disabled = true;
}
let state = initialState(ruleFixture());
let heading = 'up';
let count = 0;
let events = [];
let pointer = null;
let heldKey = null;
let scheme = 'hold';
let lastFocus = null;
const glyphs = { up: '↑', down: '↓', left: '←', right: '→' };
const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const messages = {
  step: 'Step taken.', obstruction: 'Path blocked. Release and choose a fresh direction.',
  'fire blocked': 'Fire blocks the path. Find an extinguisher. Release to choose again.',
  'fire cleared': 'Fire cleared. Equipment used. You stayed in place. Release, then press again to enter.',
  complete: 'Tipi reached. Movement stopped. This local result is not saved.',
};
function render() {
  const scene = createMazeScene(state, { revealAll: true });
  world.style.setProperty('--columns', scene.camera.bounds.columns);
  world.replaceChildren(...scene.rows.flatMap(row => row.map(cell => {
    const element = document.createElement('div');
    element.className = `cell ${cell.terrain}${cell.object === 'exit' ? ' goal' : ''}`;
    element.dataset.row = cell.row;
    element.dataset.column = cell.column;
    if (cell.tile === 'S') element.innerHTML = '<span class="start">S</span>';
    const symbol = { extinguisher: 'kit', fire: 'fire', exit: 'tipi' }[cell.object];
    if (symbol) element.innerHTML += `<svg aria-hidden="true"><use href="#${symbol}"/></svg>${symbol === 'tipi' ? '' : `<span class="badge">${symbol === 'kit' ? 'X' : 'F'}</span>`}`;
    if (cell.isPlayer) {
      element.dataset.player = 'true';
      element.innerHTML += `<span class="player">${glyphs[heading]}</span>`;
    }
    return element;
  })));
  const row = scene.player.row + 1;
  const column = scene.player.column + 1;
  $('#position').textContent = `Row ${row} · column ${column}`;
  $('#equipment').textContent = `Equipment: ${scene.equipment || 'empty'}`;
  board.setAttribute('aria-label', `Playable maze. Row ${row}, column ${column}. Equipment ${scene.equipment || 'empty'}. Use arrow keys. ${state.completed ? 'Tipi reached.' : ''}`);
  board.dataset.position = state.position.join(',');
  board.dataset.completed = state.completed;
  frame();
}
function frame() {
  const tile = Math.max(36, Math.min(board.clientWidth / 8, 48));
  world.style.setProperty('--tile', `${tile}px`);
  const camera = createCamera({ rows: state.grid.length, columns: state.grid[0].length,
    row: state.position[0], column: state.position[1], width: board.clientWidth,
    height: board.clientHeight, tileSize: tile });
  board.scrollLeft = camera.x;
  board.scrollTop = camera.y;
}
const controller = createController({
  command(direction) {
    if (dialog.open || state.completed) return { terminal: true, reason: state.completed ? 'complete' : 'modal' };
    heading = direction;
    const before = state;
    const result = transition(state, direction);
    state = result.state;
    count++;
    events.unshift({ n: count, direction, position: state.position.map(v => v + 1), reason: result.reason });
    events = events.slice(0, 8);
    $('#command-count').textContent = `${count} command${count === 1 ? '' : 's'}`;
    $('#event-log').replaceChildren(...events.map(event => {
      const line = document.createElement('li');
      line.textContent = `${String(event.n).padStart(2, '0')} ${glyphs[event.direction]} [${event.position.join(',')}] ${event.reason}`;
      return line;
    }));
    $('#feedback').textContent = result.reason === 'step' && !before.inventory.length && state.inventory.length
      ? 'Extinguisher equipped. One slot. Approach F to clear it without moving.' : messages[result.reason];
    render();
    return result;
  },
  changed(input) {
    $('#input-phase').textContent = input.phase.toUpperCase();
    $('#input-direction').textContent = input.direction ? `${glyphs[input.direction]} ${input.direction.toUpperCase()}` : '—';
    $('#input-reason').textContent = input.reason;
    document.querySelectorAll('.direction').forEach(button => {
      button.dataset.active = input.phase === 'holding' && button.dataset.direction === input.direction;
    });
    $('#drag-preview').textContent = input.phase === 'stopped' ? 'Stopped — release, then try again'
      : input.phase === 'holding' ? `${glyphs[input.direction]} ${input.direction} · release to stop`
      : input.phase === 'preview' ? 'Neutral · choose a clear direction' : 'Touch or press, then drag';
  },
});
function clearPointer() {
  const previous = pointer;
  pointer = null;
  $('#drag-pad').dataset.active = 'false';
  if (previous?.element.hasPointerCapture(previous.id)) previous.element.releasePointerCapture(previous.id);
}
function cancel(reason) {
  controller.cancel(reason);
  heldKey = null;
  clearPointer();
}
function releasePointer(event, reason) {
  if (!pointer || event.pointerId !== pointer.id) return;
  controller.release(pointer.owner, reason);
  clearPointer();
}
function reset() {
  cancel('reset');
  state = initialState($('#fixture').value === 'garden' ? garden : ruleFixture());
  heading = 'up'; count = 0; events = [];
  $('#event-log').innerHTML = '<li>No commands yet.</li>';
  $('#command-count').textContent = '0 commands';
  $('#feedback').textContent = 'Collect X, clear F, then reach the tipi. Nothing is saved.';
  $('#scene-label').textContent = $('#fixture').value === 'garden' ? 'GARDEN MAZE' : 'RULE CHECK';
  render();
}
function pointerPress(event, direction) {
  if (event.button !== 0 || dialog.open || state.completed) return;
  if (!event.isPrimary || pointer || heldKey) { cancel('additional input'); return; }
  const element = event.currentTarget;
  element.focus({ preventScroll: true });
  const owner = `pointer:${event.pointerId}`;
  if (!controller.press(owner, direction)) return;
  pointer = { id: event.pointerId, owner, element, x: event.clientX, y: event.clientY, drag: direction === null };
  element.setPointerCapture(event.pointerId);
  if (pointer.drag) element.dataset.active = 'true';
}
for (const button of document.querySelectorAll('.direction')) {
  listen(button, 'pointerdown', event => pointerPress(event, button.dataset.direction));
  // Native assistive-technology/programmatic activation has no pointer sequence.
  // Real pointer clicks are already handled on down; never issue a second move.
  listen(button, 'click', event => {
    if (event.detail !== 0 || dialog.open || state.completed || pointer || heldKey) return;
    const owner = 'activation';
    controller.press(owner, button.dataset.direction);
    controller.release(owner, 'single activation');
  });
  listen(button, 'contextmenu', event => event.preventDefault());
}
listen($('#drag-pad'), 'pointerdown', event => pointerPress(event, null));
listen($('#drag-pad'), 'contextmenu', event => event.preventDefault());
listen(window, 'pointermove', event => {
  if (!pointer?.drag || event.pointerId !== pointer.id) return;
  controller.steer(pointer.owner, dragDirection(event.clientX - pointer.x, event.clientY - pointer.y));
});
listen(window, 'pointerup', event => releasePointer(event, 'pointerup'));
listen(window, 'pointercancel', event => releasePointer(event, 'pointercancel'));
listen(document, 'lostpointercapture', event => releasePointer(event, 'lost capture'));
listen(document, 'pointerdown', event => {
  if (pointer && event.pointerId !== pointer.id) cancel('additional pointer');
}, { capture: true });
listen(document, 'keydown', event => {
  if (event.key === 'Escape' && !dialog.open) { cancel('Escape'); return; }
  if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || !event.target.closest('[data-play-input]')) return;
  const direction = keys[event.key] || ([' ', 'Enter'].includes(event.key) ? event.target.dataset.direction : null);
  if (!direction) return;
  event.preventDefault();
  if (event.repeat || heldKey || pointer || state.completed) return;
  heldKey = event.code || event.key;
  controller.press(`key:${heldKey}`, direction);
});
listen(document, 'keyup', event => {
  if (heldKey !== (event.code || event.key)) return;
  // Prevent the native Space activation after the controlled hold.
  if (event.key === ' ') event.preventDefault();
  controller.release(`key:${heldKey}`, 'keyup');
  heldKey = null;
});
listen(document, 'focusout', event => {
  if (event.target.closest('[data-play-input]')) cancel('focus left control');
});
listen(window, 'blur', () => cancel('window blur'));
listen(document, 'visibilitychange', () => { if (document.hidden) cancel('document hidden'); });
listen(window, 'resize', () => { cancel('resize'); frame(); });
listen(window, 'orientationchange', () => { cancel('orientation'); frame(); });
if (window.visualViewport) listen(window.visualViewport, 'resize', () => { cancel('viewport resize'); frame(); });
const observer = new ResizeObserver(frame);
observer.observe(board);
listen($('#pause'), 'click', () => {
  lastFocus = document.activeElement;
  cancel('modal opened'); dialog.showModal();
});
listen(dialog, 'keydown', event => {
  if (event.key === 'Tab') { event.preventDefault(); $('#resume').focus(); }
});
listen(dialog, 'close', () => { cancel('modal closed'); lastFocus?.focus(); });
listen($('#reset'), 'click', reset);
listen($('#fixture'), 'change', reset);
listen($('#mood'), 'change', () => { cancel('light changed'); document.body.dataset.mood = $('#mood').value; });
for (const input of document.querySelectorAll('[name=scheme]')) listen(input, 'change', () => {
  scheme = input.value;
  $('#drag-controls').hidden = scheme !== 'drag';
  $('#scheme-help').textContent = scheme === 'hold'
    ? 'A tap takes one step. Hold for a deliberate first delay, then steady repeats.'
    : 'Drag to select a cardinal direction. Holding the displacement repeats; a quick swipe takes one step.';
  reset();
});
for (const id of ['delay', 'repeat']) listen($(`#${id}`), 'input', () => {
  cancel('timing changed');
  const timing = controller.configure({ delay: Number($('#delay').value), repeat: Number($('#repeat').value) });
  $('#delay-value').textContent = `${timing.delay} ms`;
  $('#repeat-value').textContent = `${timing.repeat} ms`;
  $('#rate').textContent = `${(1000 / timing.repeat).toFixed(1)} steps / second after the first delay. Changes stop movement.`;
});
listen(window, 'pagehide', () => {
  cancel('unmount'); controller.destroy(); observer.disconnect(); scope.abort();
});
// Browsers may restore a page after pagehide without rerunning its module.
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
render();
board.dataset.ready = 'true';
