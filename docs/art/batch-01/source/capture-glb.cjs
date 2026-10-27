// Static evidence capture only; serve repository root on :8052 first.
const {chromium}=require('@playwright/test');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1180,height:610},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('http://127.0.0.1:8052/docs/art/batch-01/evidence/glb-comparison.html');
    await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth===256));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.resolve(__dirname,'../evidence/glb-comparison.png'),fullPage:true});
    console.log('PASS: native-size source/GLB comparison capture');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
