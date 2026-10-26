// Offline comparison against the actual frozen server replay module: no DB/app.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {findStart,move} from '../../src/game/movement.js';
const require=createRequire(import.meta.url),{grid,manifest}=require('../../e2e/session-v2-fixture.cjs');
const pinned='f33ce52a86ffccae5c28c661ce560ff783a9b836';
const server=resolve(process.env.FC_SERVER_ROOT||'../fort-custer-server');
const file='services/playable/transcript.js',hash=value=>createHash('sha256').update(value).digest('hex');
const source=readFileSync(resolve(server,file));
assert.equal(hash(source),'5dc0e0b0ea5fd6f2bebc9273d6afd855d90a3b90c14ebce17f3012a380541fb3','Server replay differs from frozen contract');
const {replayTranscript,normalizeTranscript}=await import(pathToFileURL(resolve(server,file)));
const initial=()=>({grid:structuredClone(grid),position:findStart(grid),inventory:[],completed:false});
const routes=[['up','down','right','right','up','left','up','right','right','right'],Array(4).fill('right')];
let seed=1515;const directions=['up','down','left','right'];
for(let i=0;i<100;i++){
 let state=initial();const commands=[];
 const dispatch=dir=>{if(!state.completed){commands.push(dir);state=move(state,dir).state;}};
 for(let j=0;j<100&&!state.completed;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;dispatch(directions[seed>>>30]);}
 if(!state.completed){dispatch('down');while(state.position[1]>1)dispatch('left');dispatch('up');for(let j=0;j<6&&!state.completed;j++)dispatch('right');}
 assert.equal(state.completed,true);routes.push(commands);
}
routes.push([...Array(65532).fill('up'),...Array(4).fill('right')]);
routes.push(['down','right','right',...Array(60).fill('up'),'left','up','right','right','right']);
let commandsChecked=0,maxBytes=0;
for(const route of routes){
 const commands=route.map((dir,index)=>({seq:index+1,dir})),transcript={version:'route-transcript-v1',commands};
 let client=initial();for(const dir of route)client=move(client,dir).state;
 const replay=replayTranscript(grid,manifest,transcript);
 assert.deepEqual(replay.grid,client.grid);assert.deepEqual(replay.position,client.position);assert.equal(replay.equipment,client.inventory.includes('extinguisher'));assert.equal(replay.completed,client.completed);
 assert.equal(replay.transcriptHash,normalizeTranscript(transcript).hash);commandsChecked+=commands.length;maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(transcript)));
}
process.stdout.write(JSON.stringify({kind:'offline-actual-server-replay-differential',serverBaseline:pinned,serverReplaySha256:hash(source),cases:routes.length,passed:routes.length,commandsChecked,maxCommands:Math.max(...routes.map(r=>r.length)),maxTranscriptBytes:maxBytes,databaseOrHttpAssertions:false},null,2)+'\n');
