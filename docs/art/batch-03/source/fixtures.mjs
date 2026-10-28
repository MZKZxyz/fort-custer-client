import {fixtures as walls} from '../../batch-02/source/fixtures.mjs';
const corridor=[
 '#########','#       #','# ### # #','# # X # #','# ##P## #','# # F # #','# # ### #','#    E  #','#########'
];
const maze=walls.maze.map((row,r)=>[...row].map((t,c)=>t==='P'?' ':r===5&&c===5?'P':t).join(''));
// Fixed art-only fixtures; no game generator, input or stored state.
export const fixtures={
 corridor:{grid:corridor,anchor:[4,4]},
 beforeBehind:{grid:walls.single,anchor:[3,3]},
 corner:{grid:walls.corner,anchor:[3,3]},
 overlap:{grid:walls.overlap,anchor:[3,4]},
 maze:{grid:maze,anchor:[5,5]},
 arrival:{grid:corridor.map((row,r)=>[...row].map((t,c)=>t==='P'?'E':t==='E'?' ':t).join('')),
          anchor:[4,4],extraActor:[4,4]},
};
