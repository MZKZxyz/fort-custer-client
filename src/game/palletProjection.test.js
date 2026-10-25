import { projectedCamera, project, SIN58 } from './palletProjection';

test.each([[13, 17], [21, 21]])('projected camera follows every cell and clamps finite bounds for %i×%i', (rows, columns) => {
  for (const [width, height] of [[284, 132], [354, 464], [812, 132], [960, 420]]) {
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const camera = projectedCamera({ rows, columns, row, column, width, height, tile: 40 });
      const anchor = project(row, column, 40);
      expect(camera.x).toBeGreaterThanOrEqual(0);
      expect(camera.y).toBeGreaterThanOrEqual(0);
      expect(camera.x + camera.width).toBeLessThanOrEqual(camera.worldWidth + .001);
      expect(camera.y + camera.height).toBeLessThanOrEqual(camera.worldHeight + .001);
      expect(anchor.x).toBeGreaterThanOrEqual(camera.x);
      expect(anchor.x).toBeLessThanOrEqual(camera.x + camera.width);
      expect(anchor.y).toBeGreaterThanOrEqual(camera.y);
      expect(anchor.y).toBeLessThanOrEqual(camera.y + camera.height);
    }
  }
  expect(project(1, 0, 40).y - project(0, 0, 40).y).toBeCloseTo(40 * SIN58);
});
