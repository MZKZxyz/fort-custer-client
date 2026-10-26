import { dragDirection } from './inputController';

export const STEERING_MODES = Object.freeze({
  legacy: 'Original selector · fixed anchor',
  fixed: 'Cardinal snapping · fixed anchor',
  trailing: 'Cardinal snapping · trailing anchor',
});
const angles = { right: 0, down: 90, left: 180, up: -90 };

// Pure geometry, no timers or gameplay. The UX contract retains the maximum-axis
// dead-zone footprint; only the 48px trailing bound uses Euclidean distance.
export function snappedDirection(dx, dy, previous = null) {
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (previous) {
    const distance = Math.abs(((angle - angles[previous] + 540) % 360) - 180);
    if (distance <= 53 + 1e-10) return previous;
  }
  if (Math.abs(dx) >= Math.abs(dy) - 1e-10) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

export function createDragSteering(x, y, mode = 'trailing') {
  let anchor = { x, y }, pointer = { x, y }, requested = null, engaged = false;
  return {
    sample(nextX, nextY) {
      if (nextX === pointer.x && nextY === pointer.y) return requested;
      pointer = { x: nextX, y: nextY };
      let dx = nextX - anchor.x, dy = nextY - anchor.y;
      const length = Math.hypot(dx, dy);
      if (mode === 'trailing' && length > 48) {
        anchor = { x: nextX - 48 * dx / length, y: nextY - 48 * dy / length };
        dx = nextX - anchor.x; dy = nextY - anchor.y;
      }
      if (mode === 'legacy') {
        requested = dragDirection(dx, dy); engaged = Boolean(requested); return requested;
      }
      const radius = Math.max(Math.abs(dx), Math.abs(dy));
      if (radius < (engaged ? 12 : 18)) {
        engaged = false; requested = null;
      } else {
        engaged = true; requested = snappedDirection(dx, dy, requested);
      }
      return requested;
    },
    snapshot() { return { anchor: { ...anchor }, pointer: { ...pointer }, requested, engaged }; },
  };
}
