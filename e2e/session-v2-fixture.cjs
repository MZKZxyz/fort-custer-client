// Exact merged server serializer/policy shapes. Synthetic in-memory HTTP fixture,
// not evidence of server transactions, durability, rewards or authentication.
const {createHash}=require('node:crypto');
const {archiveFixture}=require('./archive-fixture.cjs');
const id='01234567-89ab-4cde-8fab-0123456789ab',profile='000000000000000000000002',date='2025-05-26';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const grid=['######','#SXFE#','#    #','######'].map(row=>[...row]);
const gridHash=hash(grid),seed='synthetic-sprint-1-5';
const manifest={rulesVersion:'cardinal-fire-v1',integrityTier:'server-timed-legal-route-v1',validationPolicyVersion:'route-replay-v1',
 publicLabel:'Server-timed · route validated',date,gridHash,mazeVersion:hash({date,gridHash,seed}),abilityIds:[],runClass:'standard',
 competitionVersion:'cardinal-fire-standard-v1',scoringMethod:'playable-receipt-v2',protocol:'session-v2'};
const prepared=()=>({protocol:'session-v2',attemptId:id,date,state:'PREPARED',revision:1,expiresAt:Date.now()+300000,startedAt:null,manifest,gridHash,grid,nonce:id});
const receipt=()=>({protocol:'session-v2',attemptId:id,date,status:'accepted',routeValidated:true,progress:{completed:true},
 timing:{status:'untimed',elapsedMs:null,reason:'TIMING_REVIEW_REQUIRED'},collectible:{version:'date-grant-v1',status:'awarded',
 opportunityId:'synthetic',reward:{name:'Synthetic keepsake',description:'Isolated test collectible.',emoji:'🧭',category:'fixture',rarity:'common'},
 collectionComplete:false,message:'This date’s collectible is saved.'},integrity:{tier:manifest.integrityTier,validator:manifest.validationPolicyVersion,label:'Route validated · untimed'}});
async function fixture(context,options={}){
 const state={session:prepared(),calls:[],creates:[],completes:[],ready:[],saved:null,legacy:0,admission:true,...options};
 state.releaseReady=()=>{};state.releaseComplete=()=>{};
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.route('**/api/**',async route=>{
  if(new URL(route.request().url()).pathname==='/api/maze/archive') { state.archiveReads=(state.archiveReads||0)+1; return archiveFixture(route); }
  const req=route.request(),url=new URL(req.url()),path=url.pathname,body=req.postDataJSON();state.calls.push({path,body,method:req.method()});
  const ok=json=>route.fulfill({json});const error=(code,status=503)=>route.fulfill({status,json:{error:code,outcome:'unresolved',retrySameOperation:true}});
  if(path==='/api/v2/capabilities')return ok({protocol:'session-v2',capabilities:['route-transcript-v1'],admission:state.admission,timing:'continuous-server-receipt',publicRanking:false});
  if(path==='/api/v2/sessions'){
   if(req.headers()['x-fort-custer-protocol']!=='session-v2'||req.headers()['x-fort-custer-capabilities']!=='route-transcript-v1')return error('CAPABILITY_REQUIRED',426);
   if(state.creates.length && state.creates[state.creates.length-1].createKey!==body.createKey && ['ABANDONED','EXPIRED','COMPLETED'].includes(state.session.state)){state.session=prepared();state.saved=null;}
   state.creates.push(body);if(state.loseCreate){state.loseCreate=false;return route.abort('failed');}return ok(state.session);
  }
  if(path.endsWith('/ready')){
   state.ready.push(body);if(req.headers()['if-match']!=='1')return error('SESSION_CHANGED',409);
   state.session={...state.session,state:'STARTED',revision:2,startedAt:Date.now(),expiresAt:Date.now()+7200000};delete state.session.nonce;
   if(state.holdReady)await new Promise(resolve=>{state.releaseReady=resolve;});
   if(state.loseReady){state.loseReady=false;return route.abort('failed');}return ok(state.session);
  }
  if(path.endsWith('/status'))return ok(state.session);
  if(path.endsWith('/result'))return state.saved?ok(state.saved):error('COMMIT_UNKNOWN');
  if(path.endsWith('/recover')){
   if(state.recoverFails)return error('COMMIT_UNKNOWN');
   if(state.saved)return ok(state.saved);
   return ok({outcome:'no-pending',session:state.session});
  }
  if(path.endsWith('/complete')){
   if(!req.headers()['if-match'])return error('IF_MATCH_REQUIRED',428);
   state.completes.push(body);
   if(state.holdComplete)await new Promise(resolve=>{state.releaseComplete=resolve;});
   if(state.failComplete){state.failComplete=false;return error('COMMIT_UNKNOWN');}
   state.saved=receipt();state.session={...state.session,state:'COMPLETED',revision:4};
   if(state.loseComplete){state.loseComplete=false;return route.abort('failed');}return ok(state.saved);
  }
  if(path.endsWith('/abandon')){state.session={...state.session,state:'ABANDONED',revision:state.session.revision+1};return ok(state.session);}
  if(path==='/api/maze/start'){state.legacy++;return ok({attemptId:id,seed,maze:{grid}});}
  if(path==='/api/maze/complete')return ok({time:'8.000',reward:null});
  return error('NOT_FOUND',404);
 });
 return state;
}
async function identity(context){await context.addInitScript(({profile,date})=>{
 if(!localStorage.getItem('token'))localStorage.setItem('token','synthetic-token');
 if(!localStorage.getItem('activeSubProfile'))localStorage.setItem('activeSubProfile',JSON.stringify({_id:profile}));
 if(!localStorage.getItem('selectedMazeDate'))localStorage.setItem('selectedMazeDate',date);
},{profile,date});}
module.exports={fixture,identity,prepared,receipt,grid,manifest,id,profile,date};
