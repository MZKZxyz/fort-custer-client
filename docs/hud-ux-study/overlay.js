/* Research presentation overlay. Does not replace React components, movement,
   fog, game state, input ownership or persistence. Never imported by the app. */
(() => {
 const mode=new URLSearchParams(location.search).get('hud')||'baseline';
 if(!['A','B','C'].includes(mode))return;
 const ready=new MutationObserver(()=>{const root=document.querySelector('.maze-page'),hud=root?.querySelector('.maze-hud');if(!hud||root.dataset.hudStudy)return;
 root.dataset.hudStudy=mode;
 const link=document.createElement('link');link.rel='stylesheet';link.href='/study/overlay.css';document.head.append(link);
 const nativeHelp=root.querySelector('#maze-input-help'),nativeStatus=root.querySelector('.pallet-status');
 nativeHelp.classList.add('study-nonvisual');nativeStatus.classList.add('study-nonvisual');nativeStatus.setAttribute('aria-live','polite');hud.setAttribute('aria-hidden','true');
 const top=document.createElement('header');top.className='field-header';
 top.innerHTML='<div class="field-brand">FORT CUSTER <span>DAILY MAZE</span></div><div class="field-meta"><span class="field-date"></span><span class="field-time" role="timer" aria-live="off"></span></div><div class="field-title"><h1>Reach the tipi</h1><button class="field-help" type="button" aria-label="Movement and fire help" aria-haspopup="dialog">? <span>Help</span></button></div><div class="field-kit"><button type="button" aria-label="Equipment help"><span aria-hidden="true">◇</span> <span class="field-equipment">Kit empty</span></button><span class="field-input-hint">Drag · arrows · D-pad</span></div>';
 root.prepend(top);
 const status=document.createElement('p');status.className='field-status';status.setAttribute('aria-live','off');status.setAttribute('aria-atomic','true');
 const board=root.querySelector('.maze-container');board.after(status);
 if(mode==='B'){
  const kit=document.createElement('section');kit.className='travel-card';kit.setAttribute('aria-label','Travel kit and movement controls');
  kit.innerHTML='<div class="travel-label">TRAVEL KIT <span>One slot. Pack lightly.</span></div>';
  status.before(kit);kit.append(top.querySelector('.field-kit'),status,root.querySelector('.dpad'));
 }
 const nudge=document.createElement('div');nudge.className='start-nudge';nudge.innerHTML='<span>Drag the maze to explore.<br>Release to stop. Arrows and D-pad work too.</span><button type="button">Got it</button>';
 if(mode==='C')board.before(nudge);
 nudge.querySelector('button').onclick=()=>{nudge.remove();root.querySelector('[data-maze-surface]')?.focus();};
 const notes=document.createElement('dialog');notes.className='field-notes';notes.tabIndex=-1;notes.setAttribute('aria-labelledby','field-notes-title');
 notes.innerHTML='<p class="notes-label">FIELD NOTES</p><h2 id="field-notes-title">A few useful bearings.</h2><p><strong>Your objective</strong><br>Reach the tipi.</p><p><strong>Movement</strong><br>Drag anywhere on the maze, hold an arrow key, or use the direction buttons. Release to stop. At a wall, keep holding and steer another way. An early side turn can wait briefly for an opening.</p><p><strong>Fire and your kit</strong><br>Find an extinguisher before tackling fire. Clearing it uses one charge and leaves you standing beside it. Lift, then begin a new drag—or release and press again—to enter.</p><p><strong>Taking a break</strong><br>Help stops held input. Closing it never resumes a direction. Scroll outside the maze; pinch zoom remains available.</p><form method="dialog"><button>Back to the maze</button></form>';
 document.body.append(notes);let returnFocus;
 function openNotes(event){returnFocus=event.currentTarget;window.dispatchEvent(new Event('blur'));notes.showModal();notes.focus({preventScroll:true});notes.scrollTop=0;}
 top.querySelector('.field-help').onclick=openNotes;top.querySelector('.field-kit button')?.addEventListener('click',openNotes);
 // B reparented the same kit node, so its button retains this handler.
 if(mode==='B')root.querySelector('.travel-card .field-kit button').onclick=openNotes;
 notes.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();notes.querySelector('button').focus();}});
 notes.addEventListener('close',()=>returnFocus?.focus());
 let previous='',hasMoved=false;
 function sync(){
  root.querySelector('.field-date').textContent=(root.querySelector('.maze-date')?.textContent||'').replace('October','Oct');
  root.querySelector('.field-time').textContent=root.querySelector('.maze-timer')?.textContent||'';
  const equipped=(root.querySelector('.maze-slot')?.getAttribute('aria-label')||'').includes('extinguisher');
  root.querySelector('.field-equipment').textContent=equipped?'Extinguisher · 1 charge':'Kit empty';
  root.querySelector('.field-equipment').closest('button').setAttribute('aria-label',equipped?'Equipment: extinguisher, one charge. Open equipment help.':'Equipment: empty. Open equipment help.');
  const raw=nativeStatus.textContent.trim();let kind='initial',message='Drag to steer. Release to stop.';
  if(raw.includes('Moved one cell')){kind='movement';hasMoved=true;message='';}
  if(raw.includes('Turn queued')){kind='queued';message='Turn queued '+(raw.match(/Turn queued: (\w+)/)?.[1]||'')+'. Keep holding.';}
  else if(raw.includes('Turn unavailable')){kind='expired';message='Turn unavailable. Steer again.';}
  else if(raw.includes('Fire blocks queued')){kind='hazard';message='Fire ahead. Steer again to interact.';}
  else if(raw.includes('wall or maze edge')){kind='obstacle';message='Path blocked. Keep holding and steer away.';}
  else if(raw.includes('Find an extinguisher')){kind='fire-blocked';message='Fire ahead. Find an extinguisher first.';}
  else if(raw.includes('picked up')){kind='equipment';message='Extinguisher ready. One charge equipped.';hasMoved=true;}
  else if(raw.includes('Fire cleared')){kind='fire-cleared';message='Fire cleared. Lift, then move in.';}
  else if(raw.includes('Tipi reached')){kind='saving';message='Tipi reached. Saving your result…';}
  root.dataset.hudState=kind;
  const key=kind==='movement'?'':message;
  if(previous!==key){status.textContent=message;previous=key;}
  status.dataset.kind=kind;
  if(hasMoved&&nudge.isConnected)nudge.remove();
  // Retain the visual fire bubble and original saving/error UI, but use one
  // meaningful-event announcer rather than announcing the same fire twice.
  root.querySelectorAll('.thought-bubble').forEach(e=>{e.removeAttribute('role');e.setAttribute('aria-hidden','true');});
  root.querySelectorAll(':scope > p[role=status]').forEach(e=>{if(e!==nativeStatus&&e!==status)e.classList.add('study-nonvisual');});
 }
 // Observe only React-owned nodes; mutating overlay text cannot retrigger sync.
 new MutationObserver(sync).observe(hud,{subtree:true,childList:true,characterData:true,attributes:true});
 new MutationObserver(sync).observe(nativeStatus,{subtree:true,childList:true,characterData:true});
 new MutationObserver(()=>{root.querySelectorAll('.thought-bubble').forEach(e=>{e.removeAttribute('role');e.setAttribute('aria-hidden','true');});}).observe(board,{subtree:true,childList:true});
 sync();window.__HUD_STUDY__={mode,openNotes:()=>top.querySelector('.field-help').click()};
 });ready.observe(document.documentElement,{subtree:true,childList:true});
})();
