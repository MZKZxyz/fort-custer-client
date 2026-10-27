const base=require('../unified-input/playwright.config.cjs');
module.exports={...base,testMatch:'session-v2.spec.js',workers:1,fullyParallel:false,retries:0,timeout:60000};
