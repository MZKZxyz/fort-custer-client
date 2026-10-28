import {project,SIN58} from '../../../visual-integration/source/projection.mjs';
import {chooseVariant} from '../../batch-02/source/selection.mjs';
import {fixtures} from '../../batch-02/source/fixtures.mjs';
const $=s=>document.querySelector(s);
const [manifest,walls]=await Promise.all([fetch('manifest.json').then(r=>r.json()),fetch('../batch-02/manifest.json').then(r=>r.json())]);
const identities=[['source-1','boy'],['source-2','girl']]; // Confirmed by neutral inspection; see identity.json.
const variants=Object.fromEntries(walls.variants.map(v=>[v.id,v]));
const corridor=['#########','#       #','# ### # #','# # X # #','# ##P## #','# # F # #','# # ### #','#    E  #','#########'];
const occlusion=['#########','#       #','# X F E #','#  P P  #','#  #    #','#  P    #','#       #','#########'];
const layouts={corridor:{grid:corridor,anchor:[4,4]},occlusion:{grid:occlusion,anchor:[4,4]},maze:{grid:fixtures.maze,anchor:[1,2]}};
function render(){
 const tile=+$('#tile').value,height=+$('#height').value,facing=$('#facing').value,{grid,anchor}=layouts[$('#fixture').value];
 const scenes=$('#scenes');scenes.replaceChildren();
 for(const mood of ['daylight','dusk']){
  const wrap=document.createElement('section');wrap.className='mood';const heading=document.createElement('h2');heading.textContent=mood==='daylight'?'Daylight':'Lantern evening · cool rig + ground pools';wrap.append(heading);
  const pair=document.createElement('div');pair.className='pair';wrap.append(pair);scenes.append(wrap);
  for(const kind of ['meshy','procedural']){
   const section=document.createElement('section'),title=document.createElement('h2');title.textContent=kind==='meshy'?`Meshy · ${height.toFixed(2)} cells`:'PR #58 · 1.342 cells';section.append(title);
   const viewport=document.createElement('div');viewport.className='viewport';viewport.dataset.mood=mood;viewport.dataset.kind=kind;viewport.tabIndex=0;viewport.setAttribute('aria-label',`${title.textContent} ${mood} maze`);
   const world=document.createElement('div');world.className='world';viewport.append(world);section.append(viewport);pair.append(section);
   world.style.width=`${(grid[0].length+2)*tile}px`;world.style.height=`${grid.length*tile*SIN58+2*tile}px`;
   function image(role,r,c,layer='body',index=0){
    const shadow=layer==='shadow',scale=tile/(shadow?112:224),p=project(r,c,tile),img=document.createElement('img');img.className=`sprite ${layer}`;img.alt='';img.draggable=false;
    Object.assign(img.dataset,{role,row:r,column:c,anchorX:p.x,anchorY:p.y,identity:role==='character'?identities[index][0]:''});
    if(role==='tipi'){
     img.src='../../../public/images/teepee_01.png';Object.assign(img.style,{left:`${p.x-tile*.5}px`,top:`${p.y-tile*.94}px`,width:`${tile}px`,height:`${tile}px`});
    }else{
     if(role==='character'){
      const [id,who]=identities[index];img.src=kind==='meshy'?manifest.assets.find(a=>a.id===id&&a.heightCells===height&&a.facing===facing&&a.mood===mood&&a.layer===layer).file:`comparison/pr58/characters/${who}/assets/${who}-${facing}-${mood}-${layer}.png`;
     }else if(role==='wall'){
      const variant=chooseVariant('batch03-art',r,c);img.dataset.variant=variant;img.src=`../batch-02/${variants[variant].assets.find(a=>a.mood===mood&&a.layer===layer).file}`;
     }else img.src=role==='ground'?`../batch-01/assets/ground-${mood}-body.png`:`../../visual-integration/assets/${role}-${mood}-${layer}.png`;
     Object.assign(img.style,{left:`${p.x-128*scale}px`,top:`${p.y-(shadow?150:208)*scale}px`,width:`${256*scale}px`,height:`${(shadow?256:352)*scale}px`});
    }
    world.append(img);
   }
   const sprites=[];let person=0;
   for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
    image('ground',r,c);const role={'#':'wall',P:'character',X:'extinguisher',F:'fire',E:'tipi'}[grid[r][c]];
    if(role)sprites.push({role,r:role==='character'&&$('#fixture').value==='occlusion'&&r===3&&c===3?r+.35:r,c,index:role==='character'?person++%2:0});
   }
   // A second art probe occupies a genuinely empty corridor cell.
   // Coordinates are shared by both comparisons and never alter game state.
   if(person===1){const p=sprites.find(s=>s.role==='character');
    const candidates=[[p.r+1,p.c],[p.r+1,p.c-1],[p.r,p.c+1],[p.r-1,p.c]];
    const spot=candidates.find(([r,c])=>grid[r]?.[c]===' ');
    if(!spot)throw Error('Fixture has no empty second-explorer cell');
    sprites.push({role:'character',r:spot[0],c:spot[1],index:1});
   }
   sprites.sort((a,b)=>a.r-b.r||a.c-b.c);
   for(const s of sprites)if(s.role!=='tipi')image(s.role,s.r,s.c,'shadow',s.index);
   if(mood==='dusk')for(const [r,c]of [[1,0],[grid.length-2,grid[0].length-1]]){const p=project(r,c,tile),pool=document.createElement('div');pool.className='pool';Object.assign(pool.style,{left:`${p.x-2*tile}px`,top:`${p.y-1.6*tile}px`,width:`${4*tile}px`,height:`${3.2*tile}px`});world.append(pool);}
   for(const s of sprites)image(s.role,s.r,s.c,'body',s.index);
   const p=project(...anchor,tile);requestAnimationFrame(()=>{viewport.scrollLeft=Math.max(0,p.x-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,p.y-viewport.clientHeight*.45);});
  }
 }
 $('.status').textContent=`${tile}px cells · height / .595 wall = ${(height/.595).toFixed(2)}× · ${facing} · both explorers in every comparison`;
}
for(const id of ['tile','height','facing','fixture'])$('#'+id).addEventListener('change',render);
for(const [id,who] of identities)for(const facing of ['south','east','north','west']){const f=document.createElement('figure'),im=document.createElement('img'),cap=document.createElement('figcaption');im.src=`evidence/${id}-neutral-${facing}.png`;im.alt=`${who} original GLB ${facing}`;cap.textContent=`${id} · ${who} · ${facing}`;f.append(im,cap);$('#neutral').append(f);}
window.meshySpike={render,layouts};render();
