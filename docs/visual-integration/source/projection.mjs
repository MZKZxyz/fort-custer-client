import { createCamera } from '../../../src/game/camera.js';

export const SIN58 = Math.sin(58 * Math.PI / 180);
export const COS58 = Math.cos(58 * Math.PI / 180);
export function project(row, column, tile, z = 0, padding = tile) {
  return { x: padding + (column + .5) * tile,
    y: padding + (row + .5) * tile * SIN58 - z * tile * COS58 };
}

// Wrap PR #39's square camera in projected units. Art padding is genuine world
// extent, filled with continuous terrain. It protects tall bodies at outer edges.
export function projectedCamera({ rows, columns, row, column, width, height, tile }) {
  const padding = tile;
  const worldWidth = columns * tile + 2 * padding;
  const worldHeight = rows * tile * SIN58 + 2 * padding;
  const camera = createCamera({ rows: worldHeight / (tile * SIN58), columns: worldWidth / tile,
    row: row + padding / (tile * SIN58), column: column + padding / tile,
    width, height: height / SIN58, tileSize: tile });
  return { x: camera.x, y: camera.y * SIN58, width: camera.width, height: camera.height * SIN58,
    worldWidth, worldHeight, padding };
}

export function makeFixture(name) {
  const dimensions = { challenge: [9,11], '13×17': [13,17], '21×21': [21,21], edges: [13,17] };
  const [rows, columns] = dimensions[name] || dimensions.challenge;
  const grid = Array.from({length: rows}, (_, r) => Array.from({length: columns}, (_, c) => {
    if (name === 'edges') return ' ';
    if (r === 0 || c === 0 || r === rows-1 || c === columns-1) return '#';
    // Deterministic runs, T junctions, corners, 2×2 blocks; open perimeter ring.
    if (r > 2 && r < rows-2 && c > 2 && c < columns-2 &&
        ((r % 4 === 0 && c % 5 !== 0) || (c % 4 === 0 && r % 5 !== 0))) return '#';
    return ' ';
  }));
  if (name === 'challenge') {
    for (const [r,c] of [[3,2],[3,3],[4,2],[4,3],[3,6],[4,6],[5,6],[4,5],[4,7]]) grid[r][c]='#';
  }
  const start = name === 'edges' ? [0,0] : [1,1];
  const [r,c] = start;
  grid[r][c]='S'; grid[r][c+1]='X'; grid[r][c+2]='F';
  grid[name === 'edges' ? rows-1 : 1][name === 'edges' ? columns-1 : columns-2]='E';
  return { grid, position: start, inventory: [], completed: false };
}
