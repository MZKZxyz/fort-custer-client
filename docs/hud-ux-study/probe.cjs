const{chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=require('./fixture.json'),out=path.join(__dirname,'evidence');
(async()=>{const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});const checks=[];
try{
 for(const[width,height]of[[320,568],[390,844],[844,390],[1280,800]]){
  const page=await browser.newPage({viewport:{width,height}});let starts=0,completions=[];page.on('request',r=>{if(r.url().endsWith('/start'))starts++;if(r.url().endsWith('/complete'))completions.push(r.postDataJSON());});
  await page.goto('http://127.0.0.1:8775/maze?hud=A&save=error&reset=1');await page.locator('.field-header').waitFor();for(const d of fixture.routes.saving)await page.keyboard.press('Arrow'+d[0].toUpperCase()+d.slice(1));await page.getByRole('dialog',{name:'Save result'}).waitFor();
  await page.reload();await page.getByRole('alert').filter({hasText:'may already be saved'}).waitFor();assert.equal(starts,1);await page.screenshot({path:path.join(out,`classic-${width}x${height}-recovery-page.png`),fullPage:true});
  await page.evaluate(()=>document.cookie='hudSave=success;path=/;SameSite=Strict');await page.getByRole('button',{name:'Retry saving',exact:true}).click();await page.waitForURL('**/results');await page.getByText('You finished in').waitFor();assert.equal(starts,1);assert.equal(completions.length,2);assert.deepEqual(completions[0],completions[1]);await page.screenshot({path:path.join(out,`classic-${width}x${height}-results-page.png`),fullPage:true});
  checks.push({name:`Actual save error → refresh/recovery → retry → results ${width}x${height}`,passed:true,starts,completionRequests:completions.length,sameAttempt:true});await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await page.goto('http://127.0.0.1:8775/study/');await page.locator('#game').waitFor();
 for(const mode of ['A','B','C','baseline']){await page.locator(`[data-mode=${mode}]`).click();await page.frameLocator('#game').locator('.maze-grid').waitFor();if(mode!=='baseline')await page.frameLocator('#game').locator('.field-header').waitFor();}
 await page.locator('[data-mode=A]').click();await page.locator('#scenario').selectOption('fire-cleared');await page.locator('#reset').click();await page.frameLocator('#game').locator('.pallet-status').filter({hasText:'Fire cleared'}).waitFor();checks.push({name:'Owner comparison controls switch all 4 designs and replay real stationary clear',passed:true});
 await page.screenshot({path:path.join(out,'review-interface.png'),fullPage:false});
 const frame=page.frames().find(f=>f.url().includes('/maze?'));const native=await frame.locator('.pallet-status').getAttribute('role');assert.equal(native,'status');assert.equal(await frame.locator('.field-status').getAttribute('aria-live'),'off');checks.push({name:'One existing polite live status retained; visual mirror does not duplicate announcements',passed:true});
 await page.close();
 fs.writeFileSync(path.join(out,'interaction-checks.json'),JSON.stringify({checks,limitations:'Browser automation with local synthetic API, not physical-device or screen-reader certification. Recovery/results are original compiled UI; HUD overlays do not replace recovery/results.'},null,2)+'\n');console.log(checks);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
