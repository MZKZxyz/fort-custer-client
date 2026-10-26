// Isolated real-timer acceptance/characterization. No virtual clock, timer
// wrapping, injected gameplay events, live APIs or production instrumentation.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
test.use({ trace: { mode: 'on', sources: false } });
const integrated = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const characterize = process.env.FC_EXPIRY_CHARACTERIZE === 'true';
const expected = [[6,4],[6,5],[6,6],[7,6],[8,6],[9,6],[10,6],[10,5]];

for (const [width,height] of [[390,844],[320,568],[844,390],[1280,800]]) {
  for (const input of width === 1280 ? ['mouse'] : ['mouse','touch']) {
    test(`${width}×${height} ${input}: repeated two-cell consecutive corners with native timers`, async ({ browser }, info) => {
      const trials = Number(process.env.FC_EXPIRY_TRIALS) || (width === 390 ? 10 : 2);
      const records = [];
      for (let trial = 0; trial < trials; trial++) {
        const context = await browser.newContext({ viewport: { width,height }, isMobile: width !== 1280, hasTouch: width !== 1280 });
        const capture = Boolean(process.env.FC_EXPIRY_EVIDENCE_DIR) && width === 390 && trial === 0;
        const page = await context.newPage();
        let completeRequests = 0;
        try {
          await page.addInitScript(() => {
            localStorage.setItem('token','synthetic-token');
            localStorage.setItem('activeSubProfile',JSON.stringify({_id:'synthetic-profile'}));
            localStorage.setItem('selectedMazeDate','2025-05-26');
          });
          await page.route('https://fonts.googleapis.com/**', r => r.abort());
          await page.route('https://fonts.gstatic.com/**', r => r.abort());
          await page.route('**/api/**', route => {
            if (!new URL(route.request().url()).pathname.endsWith('/start')) {
              completeRequests++; return route.fulfill({ status:503,json:{error:'Unexpected completion in non-goal fixture'} });
            }
            const grid = Array.from({length:21},()=>Array(21).fill('#'));
            for(let c=3;c<=9;c++) grid[6][c]=' ';
            for(let r=7;r<=10;r++) grid[r][6]=' ';
            grid[6][3]='S'; grid[10][5]=' '; // wall after the second corner prevents runner round-trip drift
            return route.fulfill({json:{maze:{grid},attemptId:'01234567-89ab-4cde-8fab-0123456789ab',seed:'synthetic'}});
          });
          await page.goto('/maze');
          await expect(page.locator('[data-maze-surface]')).toBeVisible();
          await expect(page.getByRole('combobox',{name:'Drag steering'})).toHaveValue('trailing');
          if(integrated) await expect.poll(()=>page.locator('.pallet-sprite').evaluateAll(a=>a.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
          await page.locator('[data-maze-surface]').scrollIntoViewIfNeeded();
          const origin = await page.locator('[data-maze-surface]').evaluate(el => {
            const r=el.getBoundingClientRect();
            return {x:(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y:(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2};
          });
          await page.evaluate(() => {
            const moves=[], requests=[];
            let signal, armed;
            const waiting = new Map();
            const read=()=>{
              const el=document.querySelector('.pallet-viewport, .maze-cell[data-player]');
              return el?[Number(el.dataset.row),Number(el.dataset.column)]:null;
            };
            let previous=JSON.stringify(read());
            const requested=()=>{
              if(!armed)return;
              requests.push({at:performance.now(),direction:armed,position:read()}); armed=null;
            };
            window.addEventListener('pointermove',requested,true);
            const observer=new MutationObserver(()=>{
              const position=read(),key=JSON.stringify(position);
              if(key===previous)return;
              previous=key; moves.push({at:performance.now(),position});
              for(const [target,resolve] of waiting) if(target===key){waiting.delete(target);resolve(true);}
              signal?.();
            });
            observer.observe(document.querySelector('.maze-page'),{subtree:true,attributes:true,attributeFilter:['data-row','data-column','data-player']});
            window.turnTrial={moves,requests,read,
              mark(direction){armed=direction;},
              until(position){const key=JSON.stringify(position);if(JSON.stringify(read())===key)return Promise.resolve(true);return new Promise(resolve=>waiting.set(key,resolve));},
              settled(){return new Promise(resolve=>{
                const check=()=>{
                  const status=document.querySelector('.pallet-status')?.textContent||'';
                  if(JSON.stringify(read())==='[10,5]'||status.includes('Turn unavailable')){signal=null;resolve(true);}
                };
                signal=check; check();
                // A read-only observer also checks status-only expiry mutations.
                const statusObserver=new MutationObserver(check);
                statusObserver.observe(document.querySelector('.pallet-status'),{subtree:true,childList:true,characterData:true});
                setTimeout(()=>{statusObserver.disconnect();resolve(false);},3500);
              });},
              finish(){observer.disconnect();window.removeEventListener('pointermove',requested,true);return {moves,requests,position:read(),status:document.querySelector('.pallet-status').textContent};}
            };
          });
          const cdp = input === 'touch' ? await context.newCDPSession(page) : null;
          const move = async (dx,dy) => {
            if(cdp) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:origin.x+dx,y:origin.y+dy,id:1}]});
            else await page.mouse.move(origin.x+dx,origin.y+dy);
          };
          if(cdp) await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...origin,id:1}]});
          else { await page.mouse.move(origin.x,origin.y); await page.mouse.down(); }
          await move(30,0);
          await page.evaluate(()=>window.turnTrial.mark('down'));
          await move(0,30);
          // Stop after either an expired first turn or arrival at the second
          // two-cell request position. No polling interval can miss that cell.
          const first = await page.evaluate(()=>Promise.race([
            window.turnTrial.until([8,6]).then(()=>true),
            window.turnTrial.settled().then(()=>false)
          ]));
          if(first) { await page.evaluate(()=>window.turnTrial.mark('left')); await move(-30,0); await page.evaluate(()=>window.turnTrial.settled()); }
          const statusBeforeRelease=await page.locator('.pallet-status').textContent();
          if(cdp) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          else await page.mouse.up();
          const record=await page.evaluate(()=>window.turnTrial.finish());
          record.trial=trial+1; record.completeRequests=completeRequests; record.statusBeforeRelease=statusBeforeRelease;
          record.firstTurn=record.moves.some(m=>JSON.stringify(m.position)==='[7,6]');
          record.secondTurn=JSON.stringify(record.position)==='[10,5]';
          record.firstRequestWasTwoCellsEarly=JSON.stringify(record.requests[0]?.position)==='[6,4]';
          record.secondRequestWasTwoCellsEarly=record.requests[1] ? JSON.stringify(record.requests[1].position)==='[8,6]' : null;
          record.requestsWereTwoCellsEarly=JSON.stringify(record.requests.map(r=>r.position))==='[[6,4],[8,6]]';
          record.sequenceMatches=JSON.stringify(record.moves.map(m=>m.position))===JSON.stringify(expected);
          records.push(record);
          if(capture) {
            fs.mkdirSync(process.env.FC_EXPIRY_EVIDENCE_DIR,{recursive:true});
            await page.screenshot({path:path.join(process.env.FC_EXPIRY_EVIDENCE_DIR,`${integrated?'integrated':'classic'}-${input}-390x844.png`),fullPage:false});
          }
        } finally { await context.close(); }
      }
      const summary={renderer:integrated?'integrated':'classic',viewport:{width,height},input,characterizationOnly:characterize,
        measurement:'Unmodified browser timers; DOM mutation timestamps approximate visible commits, not exact command deadlines',trials:records.length,
        firstTurns:records.filter(r=>r.firstTurn).length,secondTurns:records.filter(r=>r.secondTurn).length,records};
      const output=info.outputPath('timing.json');fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
      await info.attach('native timing results',{path:output,contentType:'application/json'});
      if(!characterize) for(const record of records) {
        expect(record.requestsWereTwoCellsEarly,JSON.stringify(record)).toBe(true);
        expect(record.sequenceMatches,JSON.stringify(record)).toBe(true);
        expect(record.completeRequests).toBe(0);
      }
    });
  }
}
