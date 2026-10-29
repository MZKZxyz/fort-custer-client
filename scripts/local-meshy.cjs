const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const staging = path.join(root, '.local/meshy');
const manifestPath = path.join(root, 'docs/art/meshy-spike/manifest.json');
safe(manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function safe(file) {
  if (!path.resolve(file).startsWith(root + path.sep)) throw Error('Path outside repository');
  let part = root;
  for (const name of path.relative(root, file).split(path.sep)) {
    part = path.join(part, name);
    if (fs.lstatSync(part, { throwIfNoEntry: false })?.isSymbolicLink()) throw Error('Symlinks are not allowed');
  }
}
function assets(character) {
  if (!['boy', 'girl'].includes(character)) throw Error('Choose boy or girl');
  const selected = manifest.assets.filter(a => a.id === (character === 'boy' ? 'source-1' : 'source-2') && a.heightCells === 1.15 && a.mood === 'daylight');
  const keys = new Set(selected.map(a => `${a.facing}-${a.layer}`));
  const valid = ['north', 'east', 'south', 'west'].every(facing => ['body', 'shadow'].every(layer => keys.has(`${facing}-${layer}`)));
  if (selected.length !== 8 || !valid || manifest.camera.elevation !== 58 || manifest.camera.yaw !== 0 ||
      selected.some(a => a.clipped || a.size[0] !== 256 || a.size[1] !== (a.layer === 'body' ? 352 : 256) ||
        a.anchor[0] !== 128 || a.anchor[1] !== (a.layer === 'body' ? 208 : 150) ||
        a.cellWidth !== (a.layer === 'body' ? 224 : 112))) throw Error('Invalid approved manifest');
  return selected;
}
function validate(file, a) {
  safe(file);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== a.bytes || digest(bytes) !== a.sha256 ||
      bytes.readUInt32BE(16) !== a.size[0] || bytes.readUInt32BE(20) !== a.size[1]) throw Error('Sprite manifest mismatch: ' + path.basename(file));
  return bytes;
}
function stage(character, destination = staging) {
  if (process.env.NODE_ENV !== 'development' || path.resolve(destination) !== staging) throw Error('Only the fixed development staging destination is allowed');
  safe(staging);
  const selected = assets(character).map(a => ({ a, bytes: validate(path.join(root, 'docs/art/meshy-spike', a.file), a) }));
  fs.mkdirSync(staging, { recursive: true });
  for (const name of fs.readdirSync(staging)) {
    const file = path.join(staging, name); safe(file);
    if (!fs.lstatSync(file).isFile()) throw Error('Unexpected staging entry');
    fs.unlinkSync(file);
  }
  for (const { a, bytes } of selected) fs.writeFileSync(path.join(staging, path.basename(a.file)), bytes);
  return { character, layers: selected.length, compressedBytes: selected.reduce((n, s) => n + s.bytes.length, 0), decodedBytes: selected.reduce((n, s) => n + s.a.decodedBytes, 0) };
}
function clean() {
  safe(staging);
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true });
}
if (require.main === module) {
  try {
    if (process.argv[2] === 'clean') clean();
    else {
      if (process.argv.length > 3) throw Error('No destination override allowed');
      console.log(JSON.stringify(stage(process.argv[2] || 'boy')));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { assets, validate, stage, clean, staging, root, digest, safe };
