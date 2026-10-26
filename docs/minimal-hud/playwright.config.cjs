const base=require('../unified-input/playwright.config.cjs');
module.exports={...base,testMatch:'minimal-hud.spec.js',workers:1,retries:0,timeout:90000};
