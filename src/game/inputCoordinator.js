import { createController, dragDirection } from './inputController';

const arrows = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

// One ownership/scheduler boundary for all production input adapters. The shell
// supplies a synchronous canonical command and cancels before modal/view changes.
export function bindMazeInput(root, { command, changed }) {
  const controller = createController({ command, changed });
  const removers = [];
  let pointer = null;
  let heldKey = null;
  const rejectedPointers = new WeakSet();
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  };
  const clearPointer = () => {
    const previous = pointer;
    pointer = null;
    if (previous?.element.hasPointerCapture?.(previous.id)) previous.element.releasePointerCapture(previous.id);
  };
  const cancel = reason => {
    controller.cancel(reason);
    heldKey = null;
    clearPointer();
  };
  const release = (event, reason) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    controller.release(pointer.owner, reason);
    clearPointer();
  };
  listen(root, 'pointerdown', event => {
    const element = event.target.closest?.('[data-direction], [data-maze-surface]');
    if (!element || event.button !== 0 || rejectedPointers.has(event)) return;
    if (!event.isPrimary || pointer || heldKey) { cancel('additional input'); return; }
    element.focus({ preventScroll: true });
    const owner = `pointer:${event.pointerId}`;
    const drag = element.hasAttribute('data-maze-surface');
    pointer = { id: event.pointerId, owner, element, drag, x: event.clientX, y: event.clientY };
    element.setPointerCapture?.(event.pointerId);
    controller.press(owner, drag ? null : element.dataset.direction, { drag });
  });
  listen(root, 'click', event => {
    const button = event.target.closest?.('[data-direction]');
    if (!button || event.detail !== 0 || pointer || heldKey) return;
    controller.press('activation', button.dataset.direction);
    controller.release('activation', 'single activation');
  });
  listen(root, 'contextmenu', event => {
    if (event.target.closest?.('[data-direction], [data-maze-surface]')) event.preventDefault();
  });
  listen(root, 'dragstart', event => {
    if (event.target.closest?.('[data-maze-surface]')) event.preventDefault();
  });
  listen(window, 'pointermove', event => {
    if (!pointer?.drag || event.pointerId !== pointer.id) return;
    controller.steer(pointer.owner, dragDirection(event.clientX - pointer.x, event.clientY - pointer.y));
  });
  listen(window, 'pointerup', event => release(event, 'pointerup'));
  listen(window, 'pointercancel', event => release(event, 'pointercancel'));
  listen(document, 'lostpointercapture', event => release(event, 'lost capture'));
  listen(document, 'pointerdown', event => {
    if (pointer && event.pointerId !== pointer.id) {
      rejectedPointers.add(event);
      cancel('additional pointer');
    }
  }, true);
  listen(window, 'keydown', event => {
    if (event.key === 'Escape') { cancel('Escape'); return; }
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, select, [contenteditable], dialog')) return;
    const direction = arrows[event.key] || ([' ', 'Enter'].includes(event.key) ? event.target.closest?.('[data-direction]')?.dataset.direction : null);
    // Keep arrows available on initial page load, but never hijack navigation
    // or other controls outside this maze shell.
    if (!direction || (event.target !== window && event.target !== document.body && !root.contains(event.target))) return;
    event.preventDefault();
    if (event.repeat || heldKey || pointer) return;
    heldKey = event.code || event.key;
    controller.press(`key:${heldKey}`, direction);
  });
  listen(window, 'keyup', event => {
    if (heldKey !== (event.code || event.key)) return;
    if ([' ', 'Enter'].includes(event.key)) event.preventDefault();
    controller.release(`key:${heldKey}`, 'keyup');
    heldKey = null;
  });
  listen(document, 'focusout', event => { if (root.contains(event.target)) cancel('focus changed'); });
  listen(window, 'blur', () => cancel('window blur'));
  listen(document, 'visibilitychange', () => { if (document.hidden) cancel('document hidden'); });
  for (const type of ['resize', 'orientationchange', 'pagehide']) listen(window, type, () => cancel(type));
  if (window.visualViewport) listen(window.visualViewport, 'resize', () => cancel('viewport resize'));
  return { cancel, destroy() { cancel('unmount'); controller.destroy(); removers.forEach(remove => remove()); } };
}
