import { createCamera } from './camera';

test.each([[13,17], [21,21]])('%i×%i clamps every player cell at portrait, landscape and resized sizes', (rows, columns) => {
  for (const [width,height,tileSize] of [[284,108,36],[354,464,44.25],[808,144,48],[944,420,48],[1,1,36]]) {
    for (let row=0; row<rows; row++) for(let column=0; column<columns; column++) {
      const c = createCamera({rows,columns,row,column,width,height,tileSize});
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x+c.width).toBeLessThanOrEqual(columns*tileSize);
      expect(c.y+c.height).toBeLessThanOrEqual(rows*tileSize);
      expect((column+.5)*tileSize).toBeGreaterThanOrEqual(c.x);
      expect((column+.5)*tileSize).toBeLessThanOrEqual(c.x+c.width);
      expect((row+.5)*tileSize).toBeGreaterThanOrEqual(c.y);
      expect((row+.5)*tileSize).toBeLessThanOrEqual(c.y+c.height);
      expect(c.firstColumn).toBeLessThanOrEqual(column);
      expect(c.endColumn).toBeGreaterThan(column);
    }
  }
});
test('small grid is finite; empty/loading geometry creates no cells', () => {
  expect(createCamera({rows:2,columns:3,row:1,column:2,width:900,height:800,tileSize:40})).toEqual({width:120,height:80,x:0,y:0,firstRow:0,endRow:2,firstColumn:0,endColumn:3});
  for(const rows of [0,NaN]) expect(createCamera({rows,columns:0,width:300,height:100,tileSize:36}).endRow).toBe(0);
});
test('fractional boundaries conservatively include partial cells without phantom edges', () => {
  const base={rows:21,columns:21,row:0,column:0,width:360,height:108,tileSize:36};
  expect(createCamera(base).endColumn).toBe(10);
  expect(createCamera({...base,width:360.01}).endColumn).toBe(11);
});
