import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
test('read-only art layouts remain rectangular and keep actor centers on legal ground',()=>{
 for(const [name,f]of Object.entries(fixtures)) {
  assert(f.grid.every(row=>row.length===f.grid[0].length),name);
  assert(f.grid.every(row=>/^[ #PXFE]+$/.test(row)),name);
  const [r,c]=f.anchor;assert.notEqual(f.grid[r][c],'#',name);
 }
});
test('corridor tests one-cell walls, near equipment/fire and one painted goal',()=>{
 const g=fixtures.corridor.grid;assert.equal(g[4][4],'P');assert.equal(g[4][3],'#');assert.equal(g[4][5],'#');
 assert.equal(g[3][4],'X');assert.equal(g[5][4],'F');assert.equal(g.join('').split('E').length-1,1);
 assert.equal(fixtures.arrival.grid[4][4],'E');assert.deepEqual(fixtures.arrival.extraActor,[4,4]);
});
test('full corpus includes fixed dense maze, corner and rear/front probes without a game generator',()=>{
 assert.equal(fixtures.maze.grid.length,13);assert.equal(fixtures.maze.grid[0].length,17);
 assert.equal(fixtures.beforeBehind.grid.join('').split('P').length-1,2);
 const before=JSON.stringify(fixtures);for(let i=0;i<20;i++)Object.values(fixtures).forEach(f=>f.grid.join(''));
 assert.equal(JSON.stringify(fixtures),before);
});
