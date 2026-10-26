let mode='A';let generation=0;
const frame=document.querySelector('#game');
const names={A:'A / Field strip',B:'B / Travel card',C:'C / Guided start',baseline:'Current production UI'};
async function start(){const ticket=++generation;const[w,h]=document.querySelector('#viewport').value.split(',').map(Number);frame.width=w;frame.height=h;const scenario=document.querySelector('#scenario').value;
 document.querySelector('#review-label').textContent=`${names[mode]} · ${mode==='baseline'?'Untouched presentation':'Design overlay'} · classic build · camera / integration / input preview UNSET`;
 frame.src=`/maze?reset=1&hud=${mode}&save=${scenario==='error'?'error':'pending'}`;
 document.querySelector('#open-game').href=`/maze?reset=1&hud=${mode}`;
 const fixture=await(await fetch('fixture.json')).json();
 frame.onload=async()=>{for(let i=0;i<250&&!frame.contentDocument.querySelector('.maze-grid');i++)await new Promise(r=>setTimeout(r,20));if(ticket!==generation)return;
  for(const direction of fixture.routes[scenario]){if(ticket!==generation)return;const key='Arrow'+direction[0].toUpperCase()+direction.slice(1);frame.contentWindow.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));frame.contentWindow.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,25));}
 };
}
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(e=>e.setAttribute('aria-pressed',e===button));start();};
document.querySelector('#restore').onclick=()=>{frame.contentDocument.cookie='hudSave=success;path=/;SameSite=Strict';document.querySelector('#restore').textContent='Connection restored — Retry saving in the game';};
document.querySelector('#viewport').onchange=start;document.querySelector('#reset').onclick=start;
const states=['initial','movement','obstacle','equipment','fire-blocked','fire-cleared','saving','error'];
document.querySelector('#gallery-state').innerHTML=states.map(s=>`<option>${s}</option>`).join('');
function gallery(){const state=document.querySelector('#gallery-state').value,size=document.querySelector('#gallery-size').value;
 document.querySelector('#gallery').innerHTML=['baseline','A','B','C'].map(m=>`<figure><figcaption><strong>${names[m]}</strong><br>${state} · ${size} · complete page</figcaption><a href="evidence/${m}-${size}-${state}-page.png"><img loading="lazy" src="evidence/${m}-${size}-${state}-page.png" alt="${names[m]}, ${state}, full page at ${size}"></a>${state==='initial'?`<a class="viewport-link" href="evidence/${m}-${size}-initial-viewport.png">Exact viewport capture ↗</a>`:''}</figure>`).join('');
}
document.querySelector('#gallery-state').onchange=gallery;document.querySelector('#gallery-size').onchange=gallery;gallery();start();
