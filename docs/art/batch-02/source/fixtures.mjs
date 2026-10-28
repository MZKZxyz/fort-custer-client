import {fixtures as approved} from '../../batch-01/source/fixtures.mjs';
// Fixed art-only dense fixture; never a gameplay generator or stored game grid.
const dense=[
  '#################',
  '#PXF    #      E#',
  '# ##### # ##### #',
  '# #   # # #   # #',
  '# # # # # # # # #',
  '#   #   #   #   #',
  '### ######### ###',
  '#   #       #   #',
  '# ### ##### ### #',
  '# #   #   #   # #',
  '# # ### # ### # #',
  '#       #       #',
  '#################',
];
export const fixtures=Object.freeze({...approved,stress:approved.maze,maze:dense});
