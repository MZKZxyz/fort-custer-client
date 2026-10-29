const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { stage, clean } = require('./local-meshy.cjs');
const install = require('../src/setupProxy');
after(clean);
test('dev endpoint refuses missing gates, unknown paths, corrupt payload and production', () => {
  let handler;
  install({ use: (_path, callback) => { handler = callback; } });
  const response = () => ({ status: 200, headers: {}, sendStatus(code) { this.status = code; }, set(k,v) { this.headers[k]=v; return this; }, type(t) { this.mime=t; return this; }, send(bytes) { this.bytes=bytes; } });
  const request = { path: '/source-1-1.15-south-daylight-body.png', method: 'GET' };
  process.env.NODE_ENV = 'development';
  process.env.REACT_APP_MAZE_VISUAL_INTEGRATION = 'true';
  process.env.REACT_APP_MAZE_CHARACTER_ART = 'meshy-local';
  process.env.REACT_APP_MAZE_CHARACTER_SOURCE = 'boy';
  clean(); let res = response(); handler(request,res); assert.equal(res.status,404);
  stage('boy'); res = response(); handler(request,res); assert.ok(res.bytes.length > 1000); assert.equal(res.headers['Cache-Control'],'no-store');
  for (const path of ['/../manifest.json','/source-2-1.15-south-daylight-body.png','/source-1-0.95-south-daylight-body.png']) {
    res=response(); handler({...request,path},res); assert.equal(res.status,404);
  }
  for (const [key,value] of [['NODE_ENV','production'],['REACT_APP_MAZE_VISUAL_INTEGRATION','false'],['REACT_APP_MAZE_CHARACTER_ART','off'],['REACT_APP_MAZE_CHARACTER_SOURCE','invalid']]) {
    const prior=process.env[key]; process.env[key]=value;
    res=response(); handler(request,res); assert.equal(res.status,404); process.env[key]=prior;
  }
});
