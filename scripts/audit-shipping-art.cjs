// Inspect bytes, not just filenames: detect Meshy sprites renamed in shipping trees.
const fs = require('node:fs');
const path = require('node:path');
const { root, digest } = require('./local-meshy.cjs');
const hashes = new Set(require('../docs/art/meshy-spike/manifest.json').assets.map(a => a.sha256));
const sourceAudit = require('../docs/art/meshy-spike/evidence/source-audit.json');
for (const source of sourceAudit.sources) hashes.add(source.sha256);
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw Error('Symlink in shipping tree: ' + path.relative(root, file));
    return e.isDirectory() ? walk(file) : [file];
  });
}
function audit(dirs = ['src', 'public', 'build']) {
  let files = 0;
  for (const dir of dirs) for (const file of walk(path.join(root, dir))) {
    const bytes = fs.readFileSync(file); files++;
    const relative = path.relative(root, file);
    if (hashes.has(digest(bytes)) || /\.(glb|gltf|blend\d*)$/i.test(file) ||
        bytes.subarray(0, 4).toString() === 'glTF' || bytes.subarray(0, 7).toString() === 'BLENDER' ||
        /(?:^|\/)__local-meshy|source-[12]-1\.15-/.test(relative) ||
        (!relative.startsWith('src' + path.sep) && /\.(js|map|html|json|css)$/.test(file) && /__local-meshy|source-[12]-1\.15-/.test(bytes.toString()))) {
      throw Error('Forbidden local/research payload in shipping tree: ' + relative);
    }
  }
  return { files, forbiddenSpriteAndSourceHashesChecked: hashes.size };
}
if (require.main === module) {
  try { console.log(JSON.stringify(audit(process.argv.includes('--source') ? ['src', 'public'] : undefined))); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { audit };
