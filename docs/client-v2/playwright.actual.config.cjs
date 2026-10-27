const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'session-v2-actual.spec.js',timeout:90000,use:{...base.use,trace:'off'}};
