/** Renderer-independent camera in CSS pixels. No gameplay state is changed. */
export function createCamera({ rows, columns, row, column, width, height, tileSize }) {
  const valid = [rows, columns, width, height, tileSize].every(Number.isFinite)
    && rows > 0 && columns > 0 && width > 0 && height > 0 && tileSize > 0;
  if (!valid) return Object.freeze({ width: 0, height: 0, x: 0, y: 0, firstRow: 0, endRow: 0, firstColumn: 0, endColumn: 0 });
  const w = Math.min(width, columns * tileSize);
  const h = Math.min(height, rows * tileSize);
  const clamp = (value, max) => Math.max(0, Math.min(value, max));
  const x = clamp(((Number.isFinite(column) ? column : 0) + .5) * tileSize - w / 2, columns * tileSize - w);
  const y = clamp(((Number.isFinite(row) ? row : 0) + .5) * tileSize - h / 2, rows * tileSize - h);
  // Include partially visible cells; epsilon avoids phantom cells at exact edges.
  return Object.freeze({ width: w, height: h, x, y,
    firstRow: Math.max(0, Math.floor((y + 1e-7) / tileSize)),
    endRow: Math.min(rows, Math.ceil((y + h - 1e-7) / tileSize)),
    firstColumn: Math.max(0, Math.floor((x + 1e-7) / tileSize)),
    endColumn: Math.min(columns, Math.ceil((x + w - 1e-7) / tileSize)),
  });
}
