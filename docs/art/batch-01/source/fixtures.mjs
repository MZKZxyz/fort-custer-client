// Deliberately authored art fixtures. These never enter the gameplay model.
const grid = (rows, columns, walls, props = []) => {
  const result = Array.from({length: rows}, () => Array(columns).fill(' '));
  for (const [r,c] of walls) result[r][c] = '#';
  for (const [r,c,token] of props) result[r][c] = token;
  return result.map(row => row.join(''));
};
const fixtures = {
  single: grid(5,7,[[2,3]],[[1,3,'P'],[3,3,'P']]),
  run: grid(7,9,[[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[3,1],[4,1],[5,1]],[[3,4,'P'],[4,4,'X'],[4,6,'F'],[5,7,'E']]),
  corner: grid(7,7,[[2,2],[3,2],[4,2],[4,3],[4,4]],[[3,3,'P']]),
  T: grid(7,7,[[2,1],[2,2],[2,3],[2,4],[2,5],[3,3],[4,3],[5,3]],[[3,2,'P']]),
  cross: grid(7,7,[[1,3],[2,3],[3,3],[4,3],[5,3],[3,1],[3,2],[3,4],[3,5]],[[2,2,'P']]),
  block: grid(6,7,[[2,2],[2,3],[3,2],[3,3]],[[4,3,'P']]),
  edges: grid(7,9,[[0,0],[0,1],[0,8],[1,8],[6,0],[5,0],[6,7],[6,8]],[[0,3,'P'],[6,5,'E'],[3,0,'X'],[3,8,'F']]),
  overlap: grid(7,7,[[2,2],[2,4],[4,2],[4,4]],[[1,2,'P'],[3,4,'P'],[3,2,'X'],[5,4,'F'],[5,5,'E']]),
};
// Same dense deterministic topology as the prior visual integration stress bench.
const maze = Array.from({length:13},(_,r)=>Array.from({length:17},(_,c)=>
  r===0||c===0||r===12||c===16||
  (r>2&&r<11&&c>2&&c<15&&((r%4===0&&c%5!==0)||(c%4===0&&r%5!==0))) ? '#' : ' '));
for(const [r,c,t] of [[1,1,'P'],[1,2,'X'],[1,3,'F'],[1,15,'E'],[5,5,'P']]) maze[r][c]=t;
fixtures.maze=maze.map(r=>r.join(''));
export {fixtures};
