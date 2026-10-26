// Local research host: serves an unchanged compiled app plus optional DOM overlays.
// Never contacts a real API or publishes/deploys anything.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const build=path.resolve(process.env.HUD_BUILD||path.join(__dirname,'runtime'));
const fixture=require('./fixture.json');
const cornerGrid=Array.from({length:21},()=>Array(21).fill('#'));
for(let c=3;c<=12;c++)cornerGrid[6][c]=' ';
for(let r=7;r<=10;r++)cornerGrid[r][6]=' ';
for(let c=3;c<=6;c++)cornerGrid[10][c]=' ';
cornerGrid[5][6]=' ';cornerGrid[6][3]='S';cornerGrid[6][5]='X';cornerGrid[10][3]='E';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon','.zip':'application/zip'};
function send(res,file){res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}
http.createServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'");const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){let body='';req.on('data',c=>body+=c);req.on('end',()=>{
  res.setHeader('Content-Type','application/json');
  if(url.pathname.endsWith('/start'))return res.end(JSON.stringify({maze:{grid:(req.headers.cookie||'').includes('hudGrid=corners')?cornerGrid:fixture.grid},seed:fixture.seed,attemptId:'01234567-89ab-4cde-8fab-0123456789ab'}));
  if(url.pathname.endsWith('/complete')){
   if((req.headers.cookie||'').includes('hudSave=error')){res.statusCode=503;return res.end(JSON.stringify({error:'Connection unavailable. Retry saving your result.'}));}
   if((req.headers.cookie||'').includes('hudSave=success'))return res.end(JSON.stringify({time:'12.345',reward:null,attemptId:'01234567-89ab-4cde-8fab-0123456789ab'}));
   // Keep arrival visible for inspection. The app's unchanged 15s timeout applies.
   return;
  }
  res.statusCode=404;res.end('{}');
 });return;}
 if(url.pathname.startsWith('/study/')){const name=path.resolve(__dirname,url.pathname==='/study/'?'index.html':'.'+url.pathname.slice(6));if(!name.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}if(fs.existsSync(name)&&fs.statSync(name).isFile())return send(res,name);res.writeHead(404);return res.end('Missing study file');}
 const file=path.resolve(build,'.'+url.pathname);if(!file.startsWith(build+path.sep)){res.writeHead(403);return res.end();}
 if(fs.existsSync(file)&&fs.statSync(file).isFile())return send(res,file);
 const html=fs.readFileSync(path.join(build,'index.html'),'utf8').replace('<head>','<head><script src="/study/session.js"></script><script defer src="/study/overlay.js"></script>');res.writeHead(200,{'Content-Type':'text/html'});res.end(html);
}).listen(Number(process.env.HUD_PORT||8775),'127.0.0.1',()=>console.log('Local HUD comparison ready on port '+(process.env.HUD_PORT||8775)));
