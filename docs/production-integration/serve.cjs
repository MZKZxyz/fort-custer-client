// Local optimized-build host only. No external network or application backend.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.FC_BUILD_DIR);
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
http.createServer((request, response) => {
  const name = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!name.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
  const file = fs.existsSync(name) && fs.statSync(name).isFile() ? name : path.join(root, 'index.html');
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
}).listen(3101, '127.0.0.1');
