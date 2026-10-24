// Run default camera on :3100, REACT_APP_MAZE_CAMERA=false on :3101.
const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium'});
 const evidence=[];
 try {
  for(const [mode,port] of [['camera',3100],['legacy',3101]]) {
   const page=await browser.newPage({viewport:{width:390,height:844}});
   await page.addInitScript(()=>{
    localStorage.setItem('token','synthetic'); localStorage.setItem('activeSubProfile',JSON.stringify({_id:'fixture'}));
    localStorage.setItem('selectedMazeDate','2025-05-26');
   });
   await page.route('https://fonts.googleapis.com/**',r=>r.abort());
   await page.route('https://fonts.gstatic.com/**',r=>r.abort());
   const grid=Array.from({length:13},(_,r)=>Array.from({length:17},(_,c)=>r===0||c===0||r===12||c===16?'#':' '));
   ['S','X','F','E'].forEach((v,i)=>grid[1][i+1]=v);
   await page.route('**/api/**',r=>r.fulfill({json:{maze:{grid},seed:'trace',attemptId:'trace-attempt'}}));
   await page.goto(`http://127.0.0.1:${port}/maze`);
   await page.locator('.maze-grid').waitFor();
   const states=[];
   const record=async label=>states.push({label,...await page.evaluate(()=>{
     const cells=[...document.querySelectorAll('.maze-cell')];
     const p=cells.find(c=>c.textContent.includes('🧍'));
     const v=document.querySelector('.maze-viewport'); const b=v?.getBoundingClientRect();
     const revealedCells=v ? cells.filter(c=>{const t=c.getBoundingClientRect();return t.right>b.left+v.clientLeft && t.left<b.left+v.clientLeft+v.clientWidth && t.bottom>b.top+v.clientTop && t.top<b.top+v.clientTop+v.clientHeight;}).length : cells.filter(c=>Math.abs(Number(c.dataset.row)-Number(p.dataset.row))<=1 && Math.abs(Number(c.dataset.column)-Number(p.dataset.column))<=1).length;
     return {revealedCells,position:[Number(p.dataset.row),Number(p.dataset.column)],equipment:document.querySelector('.maze-slot').textContent,
       fireCount:cells.filter(c=>c.textContent.includes('🔥')).length,
       goalCount:document.querySelectorAll('img[alt="Goal"]').length};
   })});
   await record('initial');
   for(const [label,key] of [['wall','ArrowUp'],['pickup','ArrowRight'],['clear','ArrowRight'],['advance','ArrowRight']]) {
    await page.keyboard.press(key); await record(label);
   }
   await page.getByRole('button',{name:'Back',exact:true}).click();
   await page.keyboard.press('ArrowLeft'); await record('modal-blocked');
   const board=await page.locator('.maze-grid').boundingBox();
   if(mode==='legacy') {
    assert.equal(await page.locator('.maze-fog').count(),1);
    assert(Math.abs(board.width-Math.min(390-16,390*.95+20))<1);
   } else assert.equal(await page.locator('.maze-fog').count(),0);
   evidence.push({mode,boardWidth:board.width,states});
   await page.close();
  }
  const logical=entry=>entry.states.map(({label,position,equipment})=>({label,position,equipment}));
  assert.deepEqual(logical(evidence[0]),logical(evidence[1]));
  fs.writeFileSync('docs/viewport-camera/evidence/trace-and-rollback.json',JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS: before/after logical traces equal; fallback full-board width and fog verified');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
