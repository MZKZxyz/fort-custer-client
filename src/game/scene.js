const OBJECTS = { X: 'extinguisher', F: 'fire', E: 'exit' };

/**
 * Read-only projection of a move() state. Inputs remain caller-owned; every
 * output object is detached and frozen. Coordinates are logical cells, never
 * pixels. This adapter neither transitions gameplay nor owns assets or effects.
 * visionRadius preserves the current DOM visibility until FC-VIS-03.
 */
export function createMazeScene({ grid, position, inventory, completed }, { visionRadius = 1 } = {}) {
  const [playerRow, playerColumn] = position;
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const rows = Object.freeze(grid.map((row, r) => Object.freeze(row.map((tile, c) => Object.freeze({
    id: `${r}-${c}`,
    row: r,
    column: c,
    tile,
    terrain: tile === '#' ? 'wall' : 'floor',
    object: OBJECTS[tile] || null,
    isPlayer: playerRow === r && playerColumn === c,
    visible: Math.abs(playerRow - r) <= visionRadius && Math.abs(playerColumn - c) <= visionRadius,
  })))));

  return Object.freeze({
    rows,
    player: Object.freeze({ row: playerRow, column: playerColumn }),
    equipment: inventory.includes('extinguisher') ? 'extinguisher' : null,
    completed: Boolean(completed),
    camera: Object.freeze({
      bounds: Object.freeze({ rows: height, columns: width }),
      focus: Object.freeze({ row: playerRow + 0.5, column: playerColumn + 0.5 }),
      focusPercent: Object.freeze({
        x: width ? ((playerColumn + 0.5) / width) * 100 : 0,
        y: height ? ((playerRow + 0.5) / height) * 100 : 0,
      }),
      visionRadius,
      visibilityRadiusPercent: height && width ? ((visionRadius + 0.5) / Math.max(height, width)) * 100 : 0,
    }),
  });
}

/** UI values are display snapshots only; callbacks, clocks, IDs and save state
 * remain in the React shell. Reuse a memoized scene when only the timer changes.
 */
export function createMazeViewModel(scene, {
  dateLabel, elapsedLabel, showFireHint, showQuitModal, finished, closing, completionError, fogRadius,
}) {
  return Object.freeze({
    scene,
    hud: Object.freeze({ dateLabel, elapsedLabel, equipment: scene.equipment }),
    ui: Object.freeze({ showFireHint, showQuitModal, finished, closing, completionError }),
    effects: Object.freeze({ fogRadius }),
  });
}
