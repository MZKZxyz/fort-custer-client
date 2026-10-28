import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseVariant,VARIANTS} from './selection.mjs';
import {fixtures} from './fixtures.mjs';
test('fixed UTF-8/32-bit selector vectors match the independently calculated contract',()=>{
 for(const [seed,r,c,id] of [['batch02-owner-review',0,0,'v04'],['batch02-owner-review',1,1,'v04'],
   ['other',4,8,'v02'],['prairie 🌾',-1,20,'v04'],['abc',0,1,'v01']]) assert.equal(chooseVariant(seed,r,c),id);
 assert.throws(()=>chooseVariant('seed',.5,1),TypeError);
 assert.throws(()=>chooseVariant('seed',Infinity,1),TypeError);
});
test('choices survive traversal order and seed round trips without mutating topology',()=>{
 const before=JSON.stringify(fixtures),points=[];
 fixtures.maze.forEach((row,r)=>[...row].forEach((t,c)=>{if(t==='#')points.push([r,c]);}));
 const a=points.map(([r,c])=>chooseVariant('batch02-owner-review',r,c));
 const reverse=[...points].reverse().map(([r,c])=>chooseVariant('batch02-owner-review',r,c)).reverse();
 assert.deepEqual(a,reverse);assert.equal(new Set(a).size,4);
 assert.notDeepEqual(a,points.map(([r,c])=>chooseVariant('other-seed',r,c)));
 assert.deepEqual(a,points.map(([r,c])=>chooseVariant('batch02-owner-review',r,c)));
 assert.equal(JSON.stringify(fixtures),before);
});
test('preview corpus preserves one-cell wall tokens, narrow corridors and required assemblies',()=>{
 assert.deepEqual(VARIANTS,['v01','v02','v03','v04']);
 for(const name of ['single','run','corner','T','cross','block','edges','overlap','maze']) {
   const grid=fixtures[name];assert(grid.every(r=>r.length===grid[0].length));
   assert(grid.every(row=>/^[ #PXFE]+$/.test(row)));
 }
 assert.equal(fixtures.maze.length,13);assert.equal(fixtures.maze[0].length,17);
 assert(fixtures.maze.join('').split('#').length-1>100);
 assert.equal(fixtures.maze.join('').split('E').length-1,1);
});
