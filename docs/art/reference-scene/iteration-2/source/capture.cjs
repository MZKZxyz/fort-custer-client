/* Actual browser evidence for a static art comparison, never production gameplay. */
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];
 for(const [device,width,height] of [['phone-320',320,568],['phone-390',390,844],['landscape',844,390],['desktop',1440,1000]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8031/iteration-2/');
  const treatments=device==='phone-320'?['original','refined-70.1','refined-58']:['refined-58'];
  for(const treatment of treatments){
   await page.getByLabel('Art and camera treatment').selectOption(treatment);
   for(const mood of ['daylight','dusk']){
    await page.getByRole('button',{name:mood==='daylight'?'Daylight':'Dusk',exact:true}).focus();await page.keyboard.press('Enter');
    await page.locator('#render').evaluate(i=>i.decode());
    for(const badges of treatment==='original'?[true]:[true,false]){
     if(treatment!=='original'){
      const box=page.getByRole('checkbox');if(await box.isChecked()!==badges){await box.focus();await page.keyboard.press('Space');}
     }
     const result=await page.evaluate(()=>({width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,imageWidth:document.querySelector('#render').naturalWidth,imageSource:document.querySelector('#render').getAttribute('src'),selectedTreatment:document.querySelector('#treatment').value,pressedMood:document.querySelector('button[aria-pressed=true]').id,visibleBadgeCount:[...document.querySelectorAll('.badge')].filter(e=>!e.hidden).length,motion:matchMedia('(prefers-reduced-motion: reduce)').matches,badges:document.querySelector('#badges').checked,...window.studyMetrics(),scene:document.querySelector('.scene').getBoundingClientRect().toJSON(),image:document.querySelector('#render').getBoundingClientRect().toJSON()}));
     const expectedSource=treatment==='original'?'../renders/'+mood+'.jpg':'renders/angle-'+(treatment==='refined-58'?'58':'70.1')+'-'+mood+'.jpg';
     if(result.selectedTreatment!==treatment||result.pressedMood!==mood||result.imageSource!==expectedSource||result.visibleBadgeCount!==(badges?4:0))throw Error('Treatment/mood/badge evidence mismatch: '+JSON.stringify(result));
     if(result.pageWidth>width||result.pageHeight>height||result.imageWidth!==1400||!result.motion||result.badges!==badges||errors.length)throw Error(JSON.stringify({device,result,errors}));
     await page.locator('header').click();
     const file=`${device}-${treatment}-${mood}-${badges?'on':'off'}.jpg`;
     await page.screenshot({path:path.join(root,'previews',file),type:'jpeg',quality:94});
     results.push({device,treatment,mood,file,...result,errors:[...errors]});
    }
   }
  }
  await page.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(root,'previews/browser-checks.json'),JSON.stringify({kind:'actual Chromium static-concept captures; DPR 1; not physical-device or gameplay QA',results},null,2)+'\n');
 console.log(JSON.stringify(results.map(({device,treatment,mood,badges,tilePitchX,tilePitchY,targets})=>({device,treatment,mood,badges,tilePitchX,tilePitchY,croppedMarkers:targets.filter(t=>t.cropped).map(t=>t.token)}))));
})();
