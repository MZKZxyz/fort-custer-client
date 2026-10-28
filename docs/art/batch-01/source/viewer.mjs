import {project, SIN58} from '../../../visual-integration/source/projection.mjs';
import {fixtures} from './fixtures.mjs';
const $ = s => document.querySelector(s);
const inputs = ['fixture','tile','background','shadows','pools','gray'];
const base = '../../visual-integration/assets/';
const manifest = await fetch('assets/manifest.json').then(r=>r.json());
const records = Object.fromEntries(manifest.assets.map(a=>[`${a.role}-${a.mood}-${a.layer}`,a]));
function render() {
  const name=$('#fixture').value, grid=fixtures[name], tile=+$('#tile').value;
  const background=$('#background').value, terrain=background==='terrain';
  document.body.classList.toggle('gray',$('#gray').checked);
  for(const viewport of document.querySelectorAll('.viewport')) {
    const mood=viewport.dataset.mood, world=viewport.firstElementChild;
    viewport.dataset.tile=tile; viewport.dataset.background=background;
    viewport.dataset.fixture=name; viewport.dataset.pitch=tile*SIN58;
    world.replaceChildren();
    world.style.width=`${(grid[0].length+2)*tile}px`;
    world.style.height=`${grid.length*tile*SIN58+2*tile}px`;
    const sprites=[];
    function image(role,row,column,layer='body') {
      const point=project(row,column,tile);
      const native=records[`${role}-${mood}-${layer}`];
      const shadow=layer==='shadow', scale=tile/(shadow?112:224);
      const img=document.createElement('img');
      img.alt='';img.draggable=false;img.className=`sprite ${layer}`;
      img.dataset.role=role;img.dataset.row=row;img.dataset.column=column;
      img.dataset.anchorX=point.x;img.dataset.anchorY=point.y;
      if(role==='tipi') {
        img.src='../../../public/images/teepee_01.png';
        Object.assign(img.style,{left:`${point.x-tile*.5}px`,top:`${point.y-tile*.94}px`,width:`${tile}px`,height:`${tile}px`});
      } else {
        img.src=native?`assets/${native.file}`:`${base}${role}-${mood}-${layer}.png`;
        const anchor=shadow?[128,150]:[128,208];
        Object.assign(img.style,{left:`${point.x-anchor[0]*scale}px`,top:`${point.y-anchor[1]*scale}px`,width:`${256*scale}px`,height:`${(shadow?256:352)*scale}px`});
      }
      world.append(img);
    }
    for(let r=0;r<grid.length;r++) for(let c=0;c<grid[r].length;c++) {
      if(terrain) image('ground',r,c);
      const role={'#':'wall',P:'explorer-down',X:'extinguisher',F:'fire',E:'tipi'}[grid[r][c]];
      if(role) sprites.push({r,c,role});
    }
    // All cast/contact shadows beneath all bodies, matching PalletMaze's order.
    if($('#shadows').checked) for(const {r,c,role} of sprites) if(role!=='tipi') image(role,r,c,'shadow');
    // Fixed world pools, never in the wall texture. No path center decoration.
    if(terrain && mood==='dusk' && $('#pools').checked) {
      for(const [r,c] of [[1,-.35],[grid.length-2,grid[0].length-.65]]) {
        const p=project(r,c,tile),pool=document.createElement('div');pool.className='pool';
        Object.assign(pool.style,{left:`${p.x-2*tile}px`,top:`${p.y-1.6*tile}px`,width:`${4*tile}px`,height:`${3.2*tile}px`});world.append(pool);
      }
    }
    for(const {r,c,role} of sprites) image(role,r,c);
    if(terrain) for(let r=0;r<grid.length;r+=2) for(const c of [-.8,grid[0].length-.2]) {
      const p=project(r,c,tile),grass=document.createElement('div');grass.className='prairie';
      Object.assign(grass.style,{left:`${p.x}px`,top:`${p.y}px`});world.append(grass);
    }
  }
  $('.status').textContent=`${name} · ${grid.length} rows × ${grid[0].length} columns · ${tile}px cell / ${(tile*SIN58).toFixed(3)}px pitch · same layout in both moods`;
}
for(const id of inputs) $(`#${id}`).addEventListener('change',render);
$('#reset').onclick=()=>{for(const el of document.querySelectorAll('.viewport'))el.scrollTo(0,0);};
let syncing=false;
for(const viewport of document.querySelectorAll('.viewport')) viewport.addEventListener('scroll',()=>{
  if(syncing)return;
  syncing=true;
  for(const other of document.querySelectorAll('.viewport')) if(other!==viewport) {other.scrollLeft=viewport.scrollLeft;other.scrollTop=viewport.scrollTop;}
  requestAnimationFrame(()=>syncing=false);
});
render();
window.batch01={fixtures,render};
