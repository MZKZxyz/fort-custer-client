const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'session-v2-results.spec.js',use:{...base.use,viewport:{width:390,height:844},trace:'off'}};
