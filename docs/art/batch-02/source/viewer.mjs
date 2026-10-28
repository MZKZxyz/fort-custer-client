import {project,SIN58} from '../../../visual-integration/source/projection.mjs';
import {fixtures} from './fixtures.mjs';
import {chooseVariant,VARIANTS} from './selection.mjs';
const $=s=>document.querySelector(s);
const manifest=await fetch('manifest.json').then(r=>r.json());
const variants=Object.fromEntries(manifest.variants.map(v=>[v.id,v]));
const base='../../visual-integration/assets/';
function render() {
  const name=$('#fixture').value,grid=fixtures[name],tile=+$('#tile').value,mode=$('#treatment').value,seed=$('#seed').value;
  const bg=$('#background').value,terrain=bg==='terrain';
  document.body.classList.toggle('gray',$('#gray').checked);
  function choice(r,c) {return mode==='mixed'?chooseVariant(seed,r,c):mode;}
  for(const viewport of document.querySelectorAll('.viewport')) {
    const mood=viewport.dataset.mood,world=viewport.firstElementChild;
    Object.assign(viewport.dataset,{tile,background:bg,fixture:name,treatment:mode,pitch:tile*SIN58});
    world.replaceChildren();world.style.width=`${(grid[0].length+2)*tile}px`;
    world.style.height=`${grid.length*tile*SIN58+2*tile}px`;
    const sprites=[];
    function image(role,r,c,layer='body',variant='') {
      const p=project(r,c,tile),shadow=layer==='shadow',scale=tile/(shadow?112:224),img=document.createElement('img');
      img.alt='';img.draggable=false;img.className=`sprite ${layer}`;
      Object.assign(img.dataset,{role,row:r,column:c,variant,anchorX:p.x,anchorY:p.y});
      if(role==='tipi') {
        img.src='../../../public/images/teepee_01.png';
        Object.assign(img.style,{left:`${p.x-tile*.5}px`,top:`${p.y-tile*.94}px`,width:`${tile}px`,height:`${tile}px`});
      } else {
        img.src=role==='wall'?variants[variant].assets.find(a=>a.mood===mood&&a.layer===layer).file:
          role==='ground'?`../batch-01/assets/ground-${mood}-body.png`:`${base}${role}-${mood}-${layer}.png`;
        Object.assign(img.style,{left:`${p.x-128*scale}px`,top:`${p.y-(shadow?150:208)*scale}px`,width:`${256*scale}px`,height:`${(shadow?256:352)*scale}px`});
      }
      world.append(img);
    }
    for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++) {
      if(terrain)image('ground',r,c);
      const role={'#':'wall',P:'explorer-down',X:'extinguisher',F:'fire',E:'tipi'}[grid[r][c]];
      if(role)sprites.push({r,c,role,variant:role==='wall'?choice(r,c):''});
    }
    if($('#shadows').checked)for(const s of sprites)if(s.role!=='tipi')image(s.role,s.r,s.c,'shadow',s.variant);
    if(terrain&&mood==='dusk'&&$('#pools').checked)for(const [r,c]of [[1,-.35],[grid.length-2,grid[0].length-.65]]) {
      const p=project(r,c,tile),pool=document.createElement('div');pool.className='pool';
      Object.assign(pool.style,{left:`${p.x-2*tile}px`,top:`${p.y-1.6*tile}px`,width:`${4*tile}px`,height:`${3.2*tile}px`});world.append(pool);
    }
    for(const s of sprites)image(s.role,s.r,s.c,'body',s.variant);
  }
  const swatches=$('.swatches');swatches.replaceChildren();
  for(const mood of ['daylight','dusk'])for(const id of VARIANTS) {
    const f=document.createElement('figure');f.className='swatch';const img=document.createElement('img'),label=document.createElement('figcaption');
    img.src=variants[id].assets.find(a=>a.mood===mood&&a.layer==='body').file;img.alt=`${id} ${mood}`;
    img.style.width=`${256*tile/224}px`;img.style.height=`${352*tile/224}px`;
    label.textContent=`${id} · ${['Honey','Aged','Dark','Bleached'][VARIANTS.indexOf(id)]} · ${mood}`;f.append(img,label);swatches.append(f);
  }
  $('.status').textContent=`${grid.length}×${grid[0].length} · ${tile}px cell / ${(tile*SIN58).toFixed(3)}px pitch · ${mode==='mixed'?'seeded mixed finishes':variants[mode].name}`;
}
for(const id of ['fixture','tile','treatment','seed','background','shadows','pools','gray'])$(`#${id}`).addEventListener('change',render);
$('#reset').onclick=()=>document.querySelectorAll('.viewport').forEach(v=>v.scrollTo(0,0));
let syncing=false;
for(const v of document.querySelectorAll('.viewport'))v.addEventListener('scroll',()=>{
  if(syncing)return;syncing=true;
  for(const other of document.querySelectorAll('.viewport'))if(other!==v){other.scrollLeft=v.scrollLeft;other.scrollTop=v.scrollTop;}
  requestAnimationFrame(()=>syncing=false);
});
render();window.batch02={fixtures,chooseVariant,render};
