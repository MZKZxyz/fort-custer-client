// Uses installed Chrome; no production app/server/data. Serve repository root.
const {chromium}=require('@playwright/test');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[],requests=[];
 for(const viewport of [{width:320,height:568},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure().errorText));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});page.on('request',r=>requests.push(r.url()));
  await page.goto('http://127.0.0.1:8059/docs/art/meshy-spike/');await page.waitForFunction(()=>window.meshySpike);
  for(const tile of ['36','48'])for(const height of ['0.95','1.15','1.34'])for(const fixture of ['corridor','occlusion','maze'])for(const facing of ['south','east','north','west']){
   for(const [id,v] of Object.entries({tile,height,fixture,facing}))await page.selectOption('#'+id,v);
   await page.evaluate(async()=>{await Promise.all([...document.images].map(im=>im.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   const evidence=await page.evaluate(()=>{
    let maxAnchorError=0;const roles=new Set(),variants=new Set();
    for(const viewport of document.querySelectorAll('.viewport')){
     const world=viewport.firstElementChild;
     const bodies=[...world.querySelectorAll('.body')].filter(im=>im.dataset.role!=='ground');
     let last=-Infinity;
     for(const im of bodies){const key=+im.dataset.row*1000+(+im.dataset.column);if(key<last)throw Error('Body order');last=key;roles.add(im.dataset.role);if(im.dataset.variant)variants.add(im.dataset.variant);}
     for(const im of world.querySelectorAll('.sprite'))if(im.dataset.role!=='tipi'){
      const shadow=im.classList.contains('shadow'),scale=parseFloat(im.style.width)/256;
      maxAnchorError=Math.max(maxAnchorError,Math.abs(parseFloat(im.style.left)+128*scale-(+im.dataset.anchorX)),Math.abs(parseFloat(im.style.top)+(shadow?150:208)*scale-(+im.dataset.anchorY)));
     }
     if(world.querySelectorAll('.body[data-role=character]').length<2)throw Error('Missing explorer pair');
     for(const im of world.querySelectorAll('.body[data-role=character]')){
      const grid=window.meshySpike.layouts[document.querySelector('#fixture').value].grid;
      if(!['P',' '].includes(grid[Math.round(+im.dataset.row)]?.[Math.round(+im.dataset.column)]))throw Error('Explorer outside clear corridor');
     }
    }
    let occludedPixels=null;
    if(document.querySelector('#fixture').value==='occlusion'){
     const world=document.querySelector('.viewport[data-kind=meshy] .world');
     const actor=world.querySelector('.body[data-role=character][data-row="3.35"]');
     const wall=world.querySelector('.body[data-role=wall][data-row="4"][data-column="3"]');
     const masks=[actor,wall].map(im=>{const canvas=document.createElement('canvas');canvas.width=parseFloat(world.style.width)*4;canvas.height=parseFloat(world.style.height)*4;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,parseFloat(im.style.left)*4,parseFloat(im.style.top)*4,parseFloat(im.style.width)*4,parseFloat(im.style.height)*4);return ctx.getImageData(0,0,canvas.width,canvas.height).data;});
     occludedPixels=0;for(let i=3;i<masks[0].length;i+=4)if(masks[0][i]>16&&masks[1][i]>16)occludedPixels++;
     if(occludedPixels===0)throw Error('Foreground wall does not overlap character alpha');
     if(!(actor.compareDocumentPosition(wall)&Node.DOCUMENT_POSITION_FOLLOWING))throw Error('Foreground wall order');
    }
    return {maxAnchorError,occludedPixels,roles:[...roles],variants:[...variants],pageOverflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(evidence.maxAnchorError<.015);assert(!evidence.pageOverflow);assert(evidence.roles.includes('fire')&&evidence.roles.includes('extinguisher')&&evidence.roles.includes('tipi'));
   if(facing==='south'&&fixture==='corridor'){
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,`evidence/phone-${viewport.width}-${tile}-${height}-day.png`)});
    await page.locator('.mood').nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,`evidence/phone-${viewport.width}-${tile}-${height}-evening.png`)});
   }
   if(viewport.width===390&&height==='1.15'&&fixture==='occlusion'&&facing==='south')await page.locator('#scenes').screenshot({path:path.join(root,`evidence/occlusion-${tile}.png`)});
   results.push({viewport,tile,height,fixture,facing,...evidence});
  }
  await page.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));assert(!requests.some(u=>/\.glb|\.blend|\/api\//.test(u)));
 fs.writeFileSync(path.join(root,'evidence/browser.json'),JSON.stringify({browser:await browser.version(),cases:results.length,errors,loadsHighPoly:false,results},null,2)+'\n');await browser.close();console.log(`${results.length} browser cases passed`);
})().catch(e=>{console.error(e);process.exit(1)});
