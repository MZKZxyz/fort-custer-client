// Inspect bytes, not just filenames: detect Meshy sprites renamed in shipping trees.
const fs = require('node:fs');
const path = require('node:path');
const { root, digest } = require('./local-meshy.cjs');
const hashes = new Set(require('../docs/art/meshy-spike/manifest.json').assets.map(a => a.sha256));
const sourceAudit = require('../docs/art/meshy-spike/evidence/source-audit.json');
for (const source of sourceAudit.sources) hashes.add(source.sha256);
function walk(dir) {
  if (!fs.existsSync(dir)) throw Error('Missing shipping directory: ' + dir);
  if (!fs.lstatSync(dir).isDirectory()) throw Error('Not a shipping directory: ' + dir);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = path.join(dir, e.name);
    if (!e.isDirectory() && !e.isFile()) throw Error('Symlink or special file in shipping tree: ' + path.relative(root, file));
    return e.isDirectory() ? walk(file) : [file];
  });
}
// Resolve against the project, as CRA does, never the caller's working directory.
function buildOutput(requireOutput = true) {
  const configured = process.env.BUILD_PATH;
  if (configured !== undefined && !configured.trim()) throw Error('Empty BUILD_PATH');
  const output = path.resolve(root, configured === undefined ? 'build' : configured);
  const contains = (parent, child) => {
    const relative = path.relative(parent, child);
    return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
  };
  if (contains(output, root) || ['src', 'public', 'docs', 'scripts', 'e2e', 'node_modules', '.git', '.local/meshy']
    .some(name => contains(path.join(root, name), output) || contains(output, path.join(root, name))) ||
    path.relative(root, output).split(path.sep).some(name => name === '.git' || name === 'node_modules')) {
    throw Error('Unsafe BUILD_PATH: ' + output);
  }
  // Check every component, including an external absolute output's parents.
  let part = path.parse(output).root;
  for (const name of output.slice(part.length).split(path.sep)) {
    part = path.join(part, name);
    const stat = fs.lstatSync(part, { throwIfNoEntry: false });
    if ((!stat && requireOutput) || (stat && (!stat.isDirectory() || stat.isSymbolicLink()))) {
      throw Error('Missing, symlinked or unsafe build output: ' + part);
    }
  }
  if (requireOutput) {
    const entry = fs.lstatSync(path.join(output, 'index.html'), { throwIfNoEntry: false });
    if (!entry?.isFile() || entry.size === 0) throw Error('Build output requires a regular nonempty index.html: ' + output);
  }
  return output;
}
function audit(dirs = ['src', 'public', buildOutput()]) {
  let files = 0;
  for (const dir of dirs) for (const file of walk(path.resolve(root, dir))) {
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
  try {
    const sourceOnly = process.argv.includes('--source');
    // Use CRA's production dotenv precedence in both lifecycle processes.
    process.chdir(root);
    process.env.NODE_ENV = 'production';
    require('react-scripts/config/env');
    // Reject unsafe destinations before CRA can empty them. Prebuild permits
    // a not-yet-created output; postbuild requires a real CRA entry point.
    const output = buildOutput(!sourceOnly);
    const dirs = sourceOnly ? ['src', 'public'] : ['src', 'public', output];
    console.log(JSON.stringify({ ...audit(dirs), directories: dirs }));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { audit };
