import { createCamera } from './camera';

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
