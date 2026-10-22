import { move, findStart, formatElapsed } from './movement';
const game = (grid, inventory = []) => ({ grid, inventory, position: findStart(grid), completed: false });

test.each(['up', 'down', 'left', 'right'])('walls block %s', direction => {
  const state = game([['#', '#', '#'], ['#', 'S', '#'], ['#', '#', '#']]);
  expect(move(state, direction).state).toBe(state);
});
test('bounds and unrelated input do not move or mutate state', () => {
  const state = game([['S', ' ']]);
  expect(move(state, 'left').state).toBe(state);
  expect(move(state, 'up').state).toBe(state);
  expect(move(state, 'other').state).toBe(state);
  expect(move(state, 'right').state.position).toEqual([0, 1]);
});
test('fire blocks without an extinguisher and requests a hint', () => {
  const state = game([['S', 'F']]);
  expect(move(state, 'right')).toEqual({ state, blockedByFire: true });
});
test('collecting extinguishers is idempotent; fire consumes inventory and clears in place', () => {
  const original = game([['S', 'X', 'X', 'F', 'E']]);
  const first = move(original, 'right').state;
  expect(first.inventory).toEqual(['extinguisher']);
  expect(original.grid[0][1]).toBe('X');
  const second = move(first, 'right').state;
  expect(second.inventory).toEqual(['extinguisher']);
  const cleared = move(second, 'right').state;
  expect(cleared.position).toEqual([0, 2]);
  expect(cleared.inventory).toEqual([]);
  expect(cleared.grid[0][3]).toBe(' ');
  expect(second.grid[0][3]).toBe('F');
  const advanced = move(cleared, 'right').state;
  expect(advanced.position).toEqual([0, 3]);
  const complete = move(advanced, 'right').state;
  expect(complete.completed).toBe(true);
  expect(move(complete, 'left').state).toBe(complete);
});
test('finds starts beyond the first row', () => {
  expect(findStart([['#'], ['S']])).toEqual([1, 0]);
});
test('formats monotonic elapsed milliseconds without accumulating frame drift', () => {
  expect(formatElapsed(61002.9)).toBe('1:01.002');
  expect(formatElapsed(125123)).toBe('2:05.123');
});

test.each([
  ['up', [0, 1]], ['down', [2, 1]], ['left', [1, 0]], ['right', [1, 2]],
])('moves %s into an open tile', (direction, expected) => {
  const state = game([[' ', ' ', ' '], [' ', 'S', ' '], [' ', ' ', ' ']]);
  expect(move(state, direction).state.position).toEqual(expected);
  expect(state.position).toEqual([1, 1]);
});
