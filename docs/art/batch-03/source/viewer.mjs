import {project,SIN58} from '../../../visual-integration/source/projection.mjs';
import {chooseVariant} from '../../batch-02/source/selection.mjs';
import {fixtures} from './fixtures.mjs';
const $=s=>document.querySelector(s);
const [manifest,walls]=await Promise.all([fetch('manifest.json').then(r=>r.json()),fetch('../batch-02/manifest.json').then(r=>r.json())]);
const people=Object.fromEntries(manifest.characters.map(c=>[c.characterId.includes('BOY')?'boy':'girl',c]));
const variants=Object.fromEntries(walls.variants.map(v=>[v.id,v]));
const directions=['south','east','north','west'];
function centerScenes() {
 const {anchor}=fixtures[$('#fixture').value],tile=+$('#tile').value,p=project(...anchor,tile);
 for(const v of document.querySelectorAll('.viewport')) {v.scrollLeft=Math.max(0,p.x-v.clientWidth/2);v.scrollTop=Math.max(0,p.y-v.clientHeight*.58);}
}
function render() {
 const fixture=fixtures[$('#fixture').value],grid=fixture.grid,tile=+$('#tile').value,facing=$('#facing').value;
 const terrain=$('#background').value==='terrain';document.body.classList.toggle('gray',$('#gray').checked);
 for(const viewport of document.querySelectorAll('.viewport')) {
  const character=viewport.dataset.character,mood=viewport.dataset.mood,world=viewport.firstElementChild;
  Object.assign(viewport.dataset,{tile,facing,fixture:$('#fixture').value,background:$('#background').value,pitch:tile*SIN58});
  world.replaceChildren();world.style.width=`${(grid[0].length+2)*tile}px`;world.style.height=`${grid.length*tile*SIN58+2*tile}px`;
  viewport.style.setProperty('--world-height',world.style.height);
  const sprites=[];
  function image(role,r,c,layer='body',variant='') {
   const p=project(r,c,tile),shadow=layer==='shadow',scale=tile/(shadow?112:224),img=document.createElement('img');
   img.alt='';img.draggable=false;img.className=`sprite ${layer}`;
   Object.assign(img.dataset,{role,row:r,column:c,variant,character:role==='character'?character:'',facing:role==='character'?facing:'',anchorX:p.x,anchorY:p.y});
   if(role==='tipi') {
    img.src='../../../public/images/teepee_01.png';Object.assign(img.style,{left:`${p.x-tile*.5}px`,top:`${p.y-tile*.94}px`,width:`${tile}px`,height:`${tile}px`});
   } else {
    img.src=role==='character'?people[character].assets.find(a=>a.facing===facing&&a.mood===mood&&a.layer===layer).file:
      role==='wall'?`../batch-02/${variants[variant].assets.find(a=>a.mood===mood&&a.layer===layer).file}`:
      role==='ground'?`../batch-01/assets/ground-${mood}-body.png`:`../../visual-integration/assets/${role}-${mood}-${layer}.png`;
    Object.assign(img.style,{left:`${p.x-128*scale}px`,top:`${p.y-(shadow?150:208)*scale}px`,width:`${256*scale}px`,height:`${(shadow?256:352)*scale}px`});
   }
   world.append(img);
  }
  for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++) {
   if(terrain)image('ground',r,c);
   const role={'#':'wall',P:'character',X:'extinguisher',F:'fire',E:'tipi'}[grid[r][c]];
   if(role)sprites.push({r,c,role,order:role==='character'?2:role==='wall'?0:1,
     variant:role==='wall'?($('#wall').value==='mixed'?chooseVariant('batch03-art',r,c):$('#wall').value):''});
  }
  if(fixture.extraActor)sprites.push({r:fixture.extraActor[0],c:fixture.extraActor[1],role:'character',order:2,variant:''});
  sprites.sort((a,b)=>a.r-b.r||a.c-b.c||a.order-b.order);
  if($('#shadows').checked)for(const s of sprites)if(s.role!=='tipi')image(s.role,s.r,s.c,'shadow',s.variant);
  if(terrain&&mood==='dusk'&&$('#pools').checked)for(const [r,c]of [[1,-.35],[grid.length-2,grid[0].length-.65]]) {
   const p=project(r,c,tile),pool=document.createElement('div');pool.className='pool';Object.assign(pool.style,{left:`${p.x-2*tile}px`,top:`${p.y-1.6*tile}px`,width:`${4*tile}px`,height:`${3.2*tile}px`});world.append(pool);
  }
  for(const s of sprites)image(s.role,s.r,s.c,'body',s.variant);
 }
 const gallery=$('.sprite-gallery');gallery.replaceChildren();
 for(const mood of ['daylight','dusk'])for(const character of ['boy','girl'])for(const direction of directions) {
  const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');
  img.src=people[character].assets.find(a=>a.facing===direction&&a.mood===mood&&a.layer==='body').file;
  img.alt=`${character} ${direction} ${mood}`;img.style.width=`${256*tile/224}px`;img.style.height=`${352*tile/224}px`;
  cap.textContent=`${character} · ${direction} · ${mood}`;f.append(img,cap);gallery.append(f);
 }
 $('.status').textContent=`Both proposed characters · ${tile}px cell / ${(tile*SIN58).toFixed(3)}px pitch · ${facing} · shared geometry per character across directions/moods`;
 centerScenes();
}
for(const id of ['fixture','facing','tile','wall','background','shadows','pools','gray'])$(`#${id}`).addEventListener('change',render);
$('#center').onclick=centerScenes;
let syncing=false;
for(const viewport of document.querySelectorAll('.viewport'))viewport.addEventListener('scroll',()=>{
 if(syncing)return;syncing=true;
 for(const other of document.querySelectorAll('.viewport'))if(other!==viewport){other.scrollLeft=viewport.scrollLeft;other.scrollTop=viewport.scrollTop;}
 requestAnimationFrame(()=>syncing=false);
});
const turnarounds=$('.turnarounds');
for(const character of ['boy','girl'])for(const direction of directions) {
 const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');
 img.src=`characters/${character}/evidence/turnaround-${direction}.png`;img.alt=`${character} neutral ${direction}`;
 cap.textContent=`${character} · neutral ${direction}`;f.append(img,cap);turnarounds.append(f);
}
render();window.batch03={fixtures,render,centerScenes};
