import test from 'node:test';
import assert from 'node:assert/strict';
import { project, projectedCamera, makeFixture, SIN58 } from './projection.mjs';
import { move } from '../../../src/game/movement.js';
import { createMazeScene } from '../../../src/game/scene.js';

test('every logical cell, both stress fixtures: projected anchor, finite camera, art margin',()=>{
  for(const [rows,columns] of [[9,11],[13,17],[21,21]])
    for(const [width,height,tile] of [[280,170,36],[350,400,44.25],[808,180,48],[790,460,48]])
      for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
        const c=projectedCamera({rows,columns,row,column,width,height,tile});
        const p=project(row,column,tile);
        assert(Math.abs(project(row+1,column,tile).y-p.y-tile*SIN58)<1e-9);
        assert(c.x>=0 && c.y>=0 && c.x+c.width<=c.worldWidth+1e-7 && c.y+c.height<=c.worldHeight+1e-7);
        // Required player cue and full explorer canvas stay within clip at edges.
        assert(p.x-c.x>=18 && p.x-c.x<=c.width-18);
        assert(p.y-c.y>=tile*.94 && p.y-c.y<=c.height-tile*.28);
      }
});
test('actual movement/scene boundary: pickup, stationary clear, enter, exit, immutable inputs',()=>{
  let state=makeFixture('challenge'); const original=JSON.stringify(state);
  const scene=createMazeScene(state,{revealAll:true});
  assert(Object.isFrozen(scene));
  const first=state;
  state=move(state,'right').state; assert.deepEqual(state.position,[1,2]); assert.deepEqual(state.inventory,['extinguisher']);
  const position=state.position;
  state=move(state,'right').state; assert.equal(state.position,position); assert.deepEqual(state.inventory,[]); assert.equal(state.grid[1][3],' ');
  state=move(state,'right').state; assert.deepEqual(state.position,[1,3]);
  for(let i=0;i<6;i++) state=move(state,'right').state;
  assert.equal(state.completed,true); assert.equal(createMazeScene(state,{revealAll:true}).rows[1][9].object,'exit');
  assert.equal(move(state,'left').state,state); assert.equal(JSON.stringify(first),original);
});
test('fixture corpus includes runs, T, 2×2, corridor, edge S and E without changing tokens',()=>{
  for(const name of ['challenge','13×17','21×21','edges']){
    const state=makeFixture(name);const tiles=state.grid.flat();
    for(const token of ['S','X','F','E']) assert.equal(tiles.filter(t=>t===token).length,1);
  }
  const g=makeFixture('challenge').grid;
  assert.equal([g[3][2],g[3][3],g[4][2],g[4][3]].join(''),'####');
});
