import { memo, useLayoutEffect, useRef, useState } from 'react';
import { project, projectedCamera, SIN58 } from '../game/palletProjection';
import '../css/PalletMaze.css';

import asset0body from '../assets/pallet-garden/ground-daylight-body.png';
import asset1body from '../assets/pallet-garden/wall-daylight-body.png';
import asset1shadow from '../assets/pallet-garden/wall-daylight-shadow.png';
import asset2body from '../assets/pallet-garden/extinguisher-daylight-body.png';
import asset2shadow from '../assets/pallet-garden/extinguisher-daylight-shadow.png';
import asset3body from '../assets/pallet-garden/fire-daylight-body.png';
import asset3shadow from '../assets/pallet-garden/fire-daylight-shadow.png';
import asset4body from '../assets/pallet-garden/explorer-up-daylight-body.png';
import asset4shadow from '../assets/pallet-garden/explorer-up-daylight-shadow.png';
import asset5body from '../assets/pallet-garden/explorer-right-daylight-body.png';
import asset5shadow from '../assets/pallet-garden/explorer-right-daylight-shadow.png';
import asset6body from '../assets/pallet-garden/explorer-down-daylight-body.png';
import asset6shadow from '../assets/pallet-garden/explorer-down-daylight-shadow.png';
import asset7body from '../assets/pallet-garden/explorer-left-daylight-body.png';
import asset7shadow from '../assets/pallet-garden/explorer-left-daylight-shadow.png';

// Bundled, hashed copies of the reviewed pilot exports. No runtime docs URLs.
const kit = {
  'ground-body': asset0body,
  'wall-body': asset1body,
  'wall-shadow': asset1shadow,
  'extinguisher-body': asset2body,
  'extinguisher-shadow': asset2shadow,
  'fire-body': asset3body,
  'fire-shadow': asset3shadow,
  'explorer-up-body': asset4body,
  'explorer-up-shadow': asset4shadow,
  'explorer-right-body': asset5body,
  'explorer-right-shadow': asset5shadow,
  'explorer-down-body': asset6body,
  'explorer-down-shadow': asset6shadow,
  'explorer-left-body': asset7body,
  'explorer-left-shadow': asset7shadow,
};
const asset = (role, layer) => kit[`${role}-${layer}`];
const arrows = { up: '↑', right: '→', down: '↓', left: '←' };
const symbols = { '#': 'wall', ' ': 'open path', S: 'start', X: 'extinguisher', F: 'fire', E: 'tipi goal' };

function PalletMaze({ scene, facing, inputPhase, onFallback }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 284, height: 260, tile: 36 });
  const [assetError, setAssetError] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight,
      tile: Math.max(36, Math.min((window.innerWidth - 36) / 8, 48)) });
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el); window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const { rows, columns } = scene.camera.bounds;
  const geometry = projectedCamera({ ...size, rows, columns, ...scene.player });
  const { tile } = size;
  const cells = scene.rows.flat();
  const sprites = [];
  for (const cell of cells) {
    if (cell.terrain === 'wall') sprites.push({ cell, role: 'wall', order: 0 });
    if (cell.object) sprites.push({ cell, role: cell.object, order: 1 });
    // At arrival the goal remains visible; the small directional cue marks
    // the explorer's logical cell without covering the tipi artwork.
    if (cell.isPlayer && cell.object !== 'exit') sprites.push({ cell, role: `explorer-${facing}`, order: 2 });
  }
  sprites.sort((a, b) => a.cell.row - b.cell.row || a.cell.column - b.cell.column || a.order - b.order);
  const img = (role, cell, layer = 'body') => {
    const p = project(cell.row, cell.column, tile);
    if (role === 'exit') {
      if (layer === 'shadow') return null; // Original tipi already includes its contact shadow.
      return <img key={`${cell.id}-tipi`} className="pallet-sprite" data-role="tipi" alt="" draggable="false"
        src={`${process.env.PUBLIC_URL}/images/teepee_01.png`} onError={() => setAssetError(true)}
        style={{ left: p.x - tile * .5, top: p.y - tile * .94, width: tile, height: tile }} />;
    }
    const scale = tile / (layer === 'shadow' ? 112 : 224);
    const anchor = layer === 'shadow' ? [128, 150] : [128, 208];
    return <img key={`${cell.id}-${role}-${layer}`} className="pallet-sprite" data-role={role}
      src={asset(role, layer)} alt="" draggable="false" onError={() => setAssetError(true)}
      style={{ left: p.x - anchor[0] * scale, top: p.y - anchor[1] * scale,
        width: 256 * scale, height: (layer === 'shadow' ? 256 : 352) * scale }} />;
  };
  const player = project(scene.player.row, scene.player.column, tile);
  const neighbors = [[-1, 0, 'Up'], [0, 1, 'Right'], [1, 0, 'Down'], [0, -1, 'Left']]
    .map(([r, c, direction]) => `${direction}: ${symbols[scene.rows[scene.player.row + r]?.[scene.player.column + c]?.tile] || 'maze edge'}`).join('. ');
  return <section className="pallet-maze" aria-label="Daily maze">
    <p className="pallet-instructions">Reach the tipi · X: extinguisher · F: fire</p>
    <div ref={ref} className="pallet-viewport" role="region" tabIndex="0" aria-label="Maze viewport" aria-describedby="maze-input-help maze-position-help"
      data-maze-surface data-input-phase={inputPhase}
      data-row={scene.player.row} data-column={scene.player.column} data-completed={scene.completed}
      data-camera-x={geometry.x} data-camera-y={geometry.y} data-tile={tile} data-pitch={tile * SIN58}
      style={{ '--pallet-world-width': `${geometry.worldWidth}px`, '--pallet-world-height': `${geometry.worldHeight}px` }}>
      <div className="pallet-world" aria-hidden="true" style={{ width: geometry.worldWidth, height: geometry.worldHeight,
        transform: `translate(${-geometry.x}px, ${-geometry.y}px)` }}>
        {cells.map(cell => img('ground', cell))}
        {sprites.map(({ cell, role }) => img(role, cell, 'shadow'))}
        {sprites.map(({ cell, role }) => img(role, cell))}
        {cells.filter(cell => ['S', 'X', 'F'].includes(cell.tile)).map(cell => {
          const p = project(cell.row, cell.column, tile);
          return <span key={cell.id} className="pallet-badge" style={{ left: p.x + tile * .26, top: p.y + tile * .18 }}>{cell.tile}</span>;
        })}
        <span className="pallet-player-cue" style={{ left: player.x - tile * .32, top: player.y + tile * (scene.completed ? .20 : -.30) }}>{arrows[facing]}</span>
      </div>
    </div>
    <p className="pallet-position maze-assistive-position" id="maze-position-help">Row {scene.player.row + 1}, column {scene.player.column + 1}. {neighbors}</p>
    {assetError && <p role="alert">Maze artwork could not load. Use the classic view to continue this attempt.</p>}
    <button className="pallet-fallback" onClick={onFallback}>Use classic view</button>
  </section>;
}
export default memo(PalletMaze);
