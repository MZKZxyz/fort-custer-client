import { findStart } from '../../src/game/movement.js';

// Exact 13×17 deterministic border/trace fixture from
// docs/viewport-camera/verify.cjs; no random generation or production maze.
export function ruleFixture() {
  const grid = Array.from({ length: 13 }, (_, r) => Array.from({ length: 17 }, (_, c) =>
    r === 0 || c === 0 || r === 12 || c === 16 ? '#' : ' '));
  ['S', 'X', 'F', 'E'].forEach((tile, index) => { grid[1][index + 1] = tile; });
  return grid;
}
export function initialState(grid) {
  return { grid: grid.map(row => [...row]), position: findStart(grid), inventory: [], completed: false };
}
