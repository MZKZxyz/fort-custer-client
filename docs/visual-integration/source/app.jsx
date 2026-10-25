import React, { useState, useMemo, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { move } from '../../../src/game/movement';
import { createMazeScene } from '../../../src/game/scene';
import { createCamera } from '../../../src/game/camera';
import { project, projectedCamera, makeFixture, SIN58 } from './projection.mjs';

const DIRECTIONS = { ArrowUp:'up', ArrowRight:'right', ArrowDown:'down', ArrowLeft:'left' };
const DELTAS = {up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]};
const SYMBOLS = { '#':'wall', ' ':'open path', S:'start', X:'extinguisher', F:'fire', E:'provisional exit' };
const arrow = {up:'↑',right:'→',down:'↓',left:'←'};
const assets = (role,mood,layer='body') => `assets/${role}-${mood}-${layer}.png`;

function Scene({scene, mood, facing, mode, badges, shadows, surface}) {
  const ref=useRef(null);
  const [size,setSize]=useState({width:284,height:260,tile:36});
  useLayoutEffect(()=>{
    const el=ref.current;
    const measure=()=>setSize({width:el.clientWidth,height:el.clientHeight,
      tile:Math.max(36,Math.min((window.innerWidth-36)/8,48))});
    measure(); const observer=new ResizeObserver(measure); observer.observe(el);
    window.addEventListener('resize',measure);
    return ()=>{observer.disconnect();window.removeEventListener('resize',measure);};
  },[]);
  const {rows,columns}=scene.camera.bounds;
  const projected=mode==='projected';
  const geometry=projected ? projectedCamera({...size,rows,columns,...scene.player}) : (()=>{
    const c=createCamera({rows,columns,...scene.player,...size,tileSize:size.tile});
    return {...c,worldWidth:columns*size.tile,worldHeight:rows*size.tile,padding:0};
  })();
  const {tile}=size;
  const cells=scene.rows.flat();
  const sprites=[];
  const img=(role,cell,layer='body')=>{
    const p=project(cell.row,cell.column,tile);
    const scale=tile/(layer==='shadow'?112:224);
    const anchor=layer==='shadow'?[128,150]:[128,208];
    const canvas=layer==='shadow'?[256,256]:[256,352];
    return <img key={`${cell.id}-${role}-${layer}`} className={`sprite ${layer}`} src={assets(role,mood,layer)} alt="" draggable="false"
      data-role={role} data-row={cell.row} data-column={cell.column} data-anchor-x={p.x} data-anchor-y={p.y}
      style={{left:p.x-anchor[0]*scale,top:p.y-anchor[1]*scale,width:canvas[0]*scale,height:canvas[1]*scale}}/>;
  };
  // All bodies are direct siblings in one world context, with stable ground-row
  // sorting. At equal ground depth the explorer is drawn after E, never instead.
  for(const cell of cells) {
    if(cell.terrain==='wall') sprites.push({cell,role:'wall',order:0});
    if(cell.object) sprites.push({cell,role:cell.object,order:1});
    if(cell.isPlayer) sprites.push({cell,role:`explorer-${facing}`,order:2});
  }
  sprites.sort((a,b)=>a.cell.row-b.cell.row || a.cell.column-b.cell.column || a.order-b.order);
  useLayoutEffect(()=>{
    // Numeric scroll positions are only evidence. Rendering uses a single world
    // translation so fractional CSS pixels are preserved at DPR 1 as well as 2.
    ref.current.dataset.cameraX=geometry.x; ref.current.dataset.cameraY=geometry.y;
  },[geometry.x,geometry.y]);
  return <div ref={ref} className={`viewport ${mood} ${surface}`} tabIndex="0" role="region" aria-label="Playable maze. Use arrow keys or the direction buttons." data-mode={mode}
    data-tile={tile} data-pitch={projected?tile*SIN58:tile}
    style={{maxWidth:geometry.worldWidth,maxHeight:geometry.worldHeight,margin:'auto'}}>
    <div className="world" aria-hidden="true" style={{width:geometry.worldWidth,height:geometry.worldHeight,
      transform:`translate(${-geometry.x}px,${-geometry.y}px)`}}>
      {projected ? <>
        {cells.map(cell=>img('ground',cell))}
        {shadows && sprites.map(({cell,role})=>img(role,cell,'shadow'))}
        {sprites.map(({cell,role})=>img(role,cell))}
        {badges && cells.filter(c=>'SXFE'.includes(c.tile) && c.tile!==' ').map(cell=>{
          const p=project(cell.row,cell.column,tile);
          return <span className={`badge badge-${cell.tile}`} key={`badge-${cell.id}`} data-cue={cell.tile}
            style={{left:p.x+tile*.26,top:p.y+tile*.18}}>{cell.tile}</span>;
        })}
        <span className="player-cue" data-cue="player" style={{left:project(scene.player.row,scene.player.column,tile).x-tile*.32,
          top:project(scene.player.row,scene.player.column,tile).y-tile*.30}}>{arrow[facing]}</span>
      </> : cells.map(cell=><div key={cell.id} className={`legacy-cell ${cell.terrain}`} data-row={cell.row} data-column={cell.column}
        style={{left:cell.column*tile,top:cell.row*tile,width:tile,height:tile}}>
        {cell.isPlayer ? '🧍' : cell.object==='extinguisher'?'🧯':cell.object==='fire'?'🔥':cell.object==='exit'?'⛺':''}
        {badges && 'SXFE'.includes(cell.tile) && cell.tile!==' ' && <span className="legacy-cue" data-cue={cell.tile}>{cell.tile}</span>}
        {cell.isPlayer && <span className="legacy-player" data-cue="player">{arrow[facing]}</span>}
      </div>)}
    </div>
  </div>;
}

function App() {
  const [fixture,setFixture]=useState('challenge');
  const [game,setGame]=useState(()=>makeFixture('challenge'));
  const [mood,setMood]=useState('daylight');
  const [mode,setMode]=useState('projected');
  const [facing,setFacing]=useState('down');
  const [badges,setBadges]=useState(true);
  const [shadows,setShadows]=useState(true);
  const [surface,setSurface]=useState('earth');
  const [grayscale,setGrayscale]=useState(false);
  const [feedback,setFeedback]=useState('Begin at S. Pick up X, clear F, then find E.');
  const [steps,setSteps]=useState(0);
  const [reference,setReference]=useState('58');
  const [assetError,setAssetError]=useState(false);
  const scene=useMemo(()=>createMazeScene(game,{revealAll:true}),[game]);
  const stateRef=useRef(game); stateRef.current=game;
  const command=useCallback(direction=>{
    const before=stateRef.current;
    const result=move(before,direction);
    const after=result.state;
    if(after===before) { setFeedback(before.completed?'Exit reached. Reset to play again.':result.blockedByFire?'Fire blocks the path. Find X first.':'A wall or the world edge blocks this direction.'); return; }
    // Heading is presentation only: blocked commands do not turn the explorer.
    if(after.position!==before.position) setFacing(direction);
    stateRef.current=after; setGame(after); setSteps(n=>n+1);
    setFeedback(after.completed?'Exit reached. Local study complete.':after.position===before.position?
      'Fire cleared. Extinguisher consumed. You stayed in place; press again to advance.':
      after.inventory.length>before.inventory.length?'Extinguisher picked up. One charge equipped.':'Moved one cell.');
  },[]);
  useEffect(()=>{
    const key=e=>{
      if(!DIRECTIONS[e.key] || e.repeat || e.altKey || e.ctrlKey || e.metaKey ||
        /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.closest('details')) return;
      e.preventDefault(); command(DIRECTIONS[e.key]);
    };
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[command]);
  useEffect(()=>{
    const failed=e=>{if(e.target instanceof HTMLImageElement && e.target.classList.contains('sprite')) setAssetError(true);};
    window.addEventListener('error',failed,true); return ()=>window.removeEventListener('error',failed,true);
  },[]);
  const reset=(name=fixture)=>{
    const next=makeFixture(name); stateRef.current=next; setGame(next); setFixture(name); setSteps(0); setFacing('down');
    setFeedback('Fresh local fixture. Begin at S.');
  };
  const neighbors=Object.entries(DELTAS).map(([d,[dr,dc]])=>`${d}: ${SYMBOLS[game.grid[game.position[0]+dr]?.[game.position[1]+dc]] || 'world edge'}`).join('; ');
  return <div className="review" data-grayscale={grayscale}>
    <header><a className="wordmark" href="../art/reference-scene/iteration-2/index.html">FORT CUSTER <span>VISUAL FIELD STUDY / 04A</span></a>
      <div className="edition">EXPERIMENTAL FIXTURE <span>Local play · no saved runs</span></div></header>
    <main>
      <div className="title"><p className="eyebrow">THE REFINED 58° STUDY</p><h1>The Pallet Garden</h1><p>A small world, built one cell at a time.</p></div>
      <div className="workspace">
        <section className="play-area" aria-label="Playable visual prototype" data-row={game.position[0]} data-column={game.position[1]}
          data-completed={game.completed} data-equipment={scene.equipment || ''} data-actions={steps}>
          <div className="scene-caption"><strong>{mode==='projected'?'58° sprite composition':'Square camera · PR #39 geometry'}</strong><span>{mood==='daylight'?'01 / DAYLIGHT':'02 / LANTERN DUSK'}</span></div>
          <div className={`scene-frame ${grayscale?'grayscale':''}`}><Scene {...{scene,mood,facing,mode,badges,shadows,surface}}/></div>
          <div className="hud"><span><strong>{game.completed?'EXIT REACHED':`ROW ${game.position[0]+1} / COL ${game.position[1]+1}`}</strong><small>{steps} successful actions</small></span>
            <span role="img" aria-label={`Equipment: ${scene.equipment || 'empty'}`} className="equipment"><b>{scene.equipment?'X':'—'}</b><span>ONE EQUIPMENT SLOT<small>{scene.equipment?'Extinguisher · one charge':'Empty'}</small></span></span></div>
          <p className="feedback" role="status" aria-live="polite">{feedback} <span className="sr-only">Row {game.position[0]+1}, column {game.position[1]+1}. {neighbors}</span></p>
          {assetError && <p role="alert">Sprite could not load. Select Square camera below to continue reviewing the movement fixture.</p>}
          <div className="navigation"><div className="instructions"><strong>Explore the garden</strong><p>Arrow keys or direction buttons.<br/>Each press is one action. No hold repeat.</p><button onClick={()=>reset()}>Reset fixture</button></div>
            <div className="dpad" aria-label="Movement controls">{['up','left','down','right'].map(d=><button key={d} className={`direction ${d}`} aria-label={d[0].toUpperCase()+d.slice(1)} aria-disabled={game.completed} onClick={()=>command(d)}>{arrow[d]}</button>)}</div></div>
        </section>
        <aside aria-label="Presentation controls">
          <p className="eyebrow">COMPOSE YOUR COMPARISON</p>
          <fieldset><legend>Light</legend><div className="segmented">{['daylight','dusk'].map(m=><button key={m} aria-pressed={mood===m} onClick={()=>setMood(m)}>{m==='daylight'?'Daylight':'Lantern dusk'}</button>)}</div></fieldset>
          <label className="select-label">Presentation<select aria-label="Presentation" value={mode} onChange={e=>setMode(e.target.value)}><option value="projected">58° · real RGBA sprites</option><option value="legacy">Square camera · fallback</option></select></label>
          <label className="select-label">Playable fixture<select aria-label="Playable fixture" value={fixture} onChange={e=>reset(e.target.value)}><option value="challenge">Garden · small challenge</option><option>13×17</option><option>21×21</option><option value="edges">Open perimeter · edge probe</option></select></label>
          <div className="switches"><label><input type="checkbox" checked={badges} onChange={e=>setBadges(e.target.checked)}/> Semantic badges</label>
            <label><input type="checkbox" checked={shadows} onChange={e=>setShadows(e.target.checked)}/> Separate shadows</label>
            <label><input type="checkbox" checked={grayscale} onChange={e=>setGrayscale(e.target.checked)}/> Grayscale comparison</label></div>
          <div className="legend" aria-label="Maze legend"><span><b>S</b> Start</span><span><b>X</b> Pickup</span><span><b>F</b> Fire</span><span><b>E</b> Exit*</span></div>
          <p className="note">X equips one extinguisher. Facing F with equipment clears the fire while you stay in place. The next press enters that tile. Reach E to finish.</p>
          <details><summary>Alpha & composition bench</summary><label className="select-label">Ground behind sprites<select aria-label="Ground behind sprites" value={surface} onChange={e=>setSurface(e.target.value)}><option value="earth">Continuous earth</option><option value="light">Light</option><option value="dark">Dark</option><option value="checker">Checker</option></select></label>
            <p>Light/dark/checker replaces terrain only, to expose alpha edges. Use the 2×2 blocks, T junction and one-cell corridors in Garden. Turn shadows off to inspect body edges.</p>
            <div className="swatches">{['wall','extinguisher','fire','exit','explorer-down','explorer-left','explorer-up','explorer-right'].map(role=><figure key={role}><img src={assets(role,mood)} alt={role.replaceAll('-',' ')}/><figcaption>{role.replace('explorer-','')}</figcaption></figure>)}</div>
          </details>
          <p className="note">* E is a provisional canvas shelter with an explicit exit cue. Narrative review is pending. This fixture has no timer, API or persistence.</p>
        </aside>
      </div>
      <section className="reference"><div><p className="eyebrow">THE APPROVED DIRECTION</p><h2>Reference, beside the real thing</h2><p>This image is an offline Blender composition. The scene above is the playable DOM prototype. Changing the reference does not change the playable projection.</p>
        <fieldset><legend>Static reference angle</legend><div className="segmented">{['58','70.1'].map(a=><button key={a} aria-pressed={reference===a} onClick={()=>setReference(a)}>{a}°</button>)}</div></fieldset>
        <p className="note">The square fallback uses the unchanged camera helper with the same fixture and inputs; its simple DOM cells are a comparator, not production art. Responsive reveal differs between projections; ranked fairness remains EG-09.</p></div>
        <img src={`../art/reference-scene/iteration-2/renders/angle-${reference}-${mood}.jpg`} alt={`Static ${reference} degree ${mood} Pallet Garden art reference; not playable`}/></section>
      <footer><span>REVIEW PROTOTYPE · NOT A PRODUCTION ROUTE</span><nav aria-label="Evidence"><a href="README.md">Reproduce & rollback</a><a href="assets/manifest.json">Asset provenance</a><a href="evidence/report.json">Browser measurements</a><a href="https://github.com/MZKZxyz/fort-custer-client/issues/33#issuecomment-6391330653">VIS-04A contract</a></nav></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
