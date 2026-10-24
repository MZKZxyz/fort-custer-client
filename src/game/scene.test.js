import { createMazeScene, createMazeViewModel } from './scene';
import { findStart, move } from './movement';

const fixture = (rows, columns) => {
  const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) =>
    r === 0 || c === 0 || r === rows - 1 || c === columns - 1 ? '#' : ' '));
  ['S', 'X', 'X', 'F', 'E'].forEach((tile, i) => { grid[1][i + 1] = tile; });
  return { grid, position: findStart(grid), inventory: [], completed: false };
};
const assertFrozen = value => {
  if (value && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    Object.values(value).forEach(assertFrozen);
  }
};

describe.each([[13, 17], [21, 21]])('%i rows × %i columns', (rows, columns) => {
  test('projects every tile, border, object, player and legacy visibility exactly', () => {
    const state = fixture(rows, columns);
    const scene = createMazeScene(state);
    expect(scene.rows).toHaveLength(rows);
    scene.rows.forEach((row, r) => {
      expect(row).toHaveLength(columns);
      row.forEach((cell, c) => {
        expect(cell).toEqual({
          id: `${r}-${c}`, row: r, column: c, tile: state.grid[r][c],
          terrain: state.grid[r][c] === '#' ? 'wall' : 'floor',
          object: ({ X: 'extinguisher', F: 'fire', E: 'exit' })[state.grid[r][c]] || null,
          isPlayer: r === 1 && c === 1,
          visible: Math.abs(r - 1) <= 1 && Math.abs(c - 1) <= 1,
        });
      });
    });
    expect(scene.camera).toEqual({
      bounds: { rows, columns }, focus: { row: 1.5, column: 1.5 },
      focusPercent: { x: (1.5 / columns) * 100, y: (1.5 / rows) * 100 },
      visionRadius: 1, visibilityRadiusPercent: (1.5 / Math.max(rows, columns)) * 100,
    });
    expect(scene.rows.flat().filter(cell => cell.isPlayer)).toHaveLength(1);
  });

  test('observes canonical S/#/X/F/E transitions without adding movement or equipment slots', () => {
    let state = fixture(rows, columns);
    const initial = createMazeScene(state);
    expect(move(state, 'up').state).toBe(state);
    for (const column of [2, 3]) {
      state = move(state, 'right').state;
      const scene = createMazeScene(state);
      expect(scene.player).toEqual({ row: 1, column });
      expect(scene.equipment).toBe('extinguisher');
      expect(scene.rows[1][column].object).toBeNull();
      expect(state.inventory).toEqual(['extinguisher']);
    }
    const beforeFire = createMazeScene(state);
    state = move(state, 'right').state;
    const cleared = createMazeScene(state);
    expect(cleared.player).toEqual(beforeFire.player);
    expect(cleared.rows[1][4].tile).toBe(' ');
    expect(cleared.rows[1][4].object).toBeNull();
    expect(cleared.equipment).toBeNull();
    expect(beforeFire.rows[1][4].object).toBe('fire');
    state = move(state, 'right').state;
    expect(createMazeScene(state).player.column).toBe(4);
    state = move(state, 'right').state;
    const finished = createMazeScene(state);
    expect(finished.completed).toBe(true);
    expect(finished.rows[1][5]).toMatchObject({ isPlayer: true, object: 'exit' });
    expect(move(state, 'left').state).toBe(state);
    expect(initial.rows[1][2].object).toBe('extinguisher');
    expect(initial.completed).toBe(false);
  });

  test('fire blocks without equipment; radius at the far border has no phantom cells', () => {
    const state = fixture(rows, columns);
    state.position = [1, 3];
    expect(move(state, 'right')).toEqual({ state, blockedByFire: true });
    expect(createMazeScene(state).rows[1][4].object).toBe('fire');
    state.position = [rows - 2, columns - 2];
    const scene = createMazeScene(state);
    expect(scene.rows[rows - 1][columns - 1]).toMatchObject({ terrain: 'wall', visible: true });
    expect(scene.camera.focus).toEqual({ row: rows - 1.5, column: columns - 1.5 });
    expect(scene.rows.flat()).toHaveLength(rows * columns);
  });
});

test('all outputs are frozen and detached without freezing or mutating caller state', () => {
  const state = fixture(13, 17);
  const original = JSON.parse(JSON.stringify(state));
  const scene = createMazeScene(state);
  const view = createMazeViewModel(scene, {
    dateLabel: 'May 26, 2025', elapsedLabel: '0:01.234', showFireHint: true,
    showQuitModal: false, finished: true, closing: false, completionError: 'Retry', fogRadius: 4,
  });
  assertFrozen(view);
  expect(() => { scene.rows[1][2].tile = ' '; }).toThrow(TypeError);
  expect(() => { scene.player.column = 10; }).toThrow(TypeError);
  expect(() => { view.ui.completionError = null; }).toThrow(TypeError);
  expect(state).toEqual(original);
  expect(Object.isFrozen(state.grid[1])).toBe(false);
  state.grid[1][2] = ' ';
  state.position[0] = 5;
  state.inventory.push('extinguisher');
  expect(scene.rows[1][2].object).toBe('extinguisher');
  expect(scene.player.row).toBe(1);
  expect(view.hud).toEqual({ dateLabel: 'May 26, 2025', elapsedLabel: '0:01.234', equipment: null });
  expect(view.ui.completionError).toBe('Retry');
  const next = createMazeViewModel(scene, { elapsedLabel: '0:02.000' });
  expect(next.scene).toBe(scene);
  expect(view.hud.elapsedLabel).toBe('0:01.234');
});

test('accepts frozen inputs, is deterministic and handles the loading/recovery empty grid', () => {
  const state = Object.freeze({ grid: Object.freeze([]), position: Object.freeze([0, 0]), inventory: Object.freeze([]), completed: true });
  const scene = createMazeScene(state);
  expect(scene).toEqual(createMazeScene(state));
  expect(scene.rows).toEqual([]);
  expect(scene.camera.focusPercent).toEqual({ x: 0, y: 0 });
  expect(scene.camera.visibilityRadiusPercent).toBe(0);
  const game = fixture(13, 17);
  game.grid.forEach(Object.freeze);
  Object.freeze(game.grid);
  expect(createMazeScene(game, { visionRadius: 2 }).rows[1][3].visible).toBe(true);
});

test('viewport path exposes all objects without changing logical coordinates or input grid', () => {
  const grid = [['S', ' ', 'F', 'X', 'E', '#']];
  const state = { grid, position: [0,0], inventory: [], completed: false };
  const legacy = createMazeScene(state);
  const viewport = createMazeScene(state, { revealAll: true });
  expect(legacy.rows[0].filter(c => c.visible)).toHaveLength(2);
  expect(viewport.rows[0].every(c => c.visible)).toBe(true);
  expect(viewport.rows[0].map(({visible,...cell}) => cell)).toEqual(legacy.rows[0].map(({visible,...cell}) => cell));
  expect(grid[0].join('')).toBe('S FXE#');
});
