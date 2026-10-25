/* Real Chromium captures of a static concept review; no gameplay is exercised. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];
 for (const [label,width,height] of [['mobile',320,568],['desktop',1440,1000]]) {
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8030/index.html');
  for(const mood of ['daylight','dusk']) {
   await page.getByRole('button',{name:mood==='daylight'?'01 · Daylight':'02 · Lantern dusk',exact:true}).focus();
   await page.keyboard.press('Enter');
   await page.locator('#render').evaluate(img=>img.decode());
   const geometry=await page.evaluate(()=>{const bounds=document.querySelector('.scene').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,pageHeight:document.documentElement.scrollHeight,imageLoaded:document.querySelector('#render').naturalWidth,active:document.activeElement.id,pressed:document.activeElement.getAttribute('aria-pressed'),labelsInsideScene:[...document.querySelectorAll('.object-label')].every(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right&&r.top>=bounds.top&&r.bottom<=bounds.bottom})}});
   if(geometry.overflow||geometry.pageHeight>height||!geometry.labelsInsideScene||geometry.imageLoaded!==1400||geometry.pressed!=='true'||errors.length)throw Error(JSON.stringify({geometry,errors}));
   await page.locator('header').click(); // remove focus ring only for presentation capture
   await page.screenshot({path:path.join(root,'previews',`${label}-${mood}.jpg`),type:'jpeg',quality:94,fullPage:false});
   results.push({label,mood,width,height,...geometry,errors});
  }
  await page.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(root,'previews','browser-checks.json'),JSON.stringify({kind:'actual Chromium screenshots of offline-render concept page; not production',reducedMotion:'reduce; page has no animation or transitions',results},null,2)+'\n');
 console.log(JSON.stringify(results));
})();
