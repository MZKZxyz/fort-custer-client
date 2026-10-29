const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, assets } = require('./local-meshy.cjs');

// Run the real package entry points in disposable projects, never rename, empty
// or remove the developer's build/ or configured output (even on assertion failure).
function fixture(t) {
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'shipping-audit-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const project = path.join(workspace, 'project');
  const png = path.join('docs/art/meshy-spike', assets('boy')[0].file);
  for (const name of ['package.json', 'scripts/audit-shipping-art.cjs', 'scripts/local-meshy.cjs',
    'docs/art/meshy-spike/manifest.json', 'docs/art/meshy-spike/evidence/source-audit.json', png]) {
    const destination = path.join(project, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, name), destination);
  }
  for (const name of ['src', 'public']) fs.mkdirSync(path.join(project, name));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(project, 'node_modules'), 'dir');
  const env = { ...process.env };
  delete env.BUILD_PATH;
  const run = (buildPath, script = 'postbuild') => {
    const selectedEnv = { ...env };
    if (buildPath !== undefined) selectedEnv.BUILD_PATH = buildPath;
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['--prefix', project, 'run', script], { cwd: workspace, env: selectedEnv, encoding: 'utf8' });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  };
  const clean = dir => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="root"></div>');
  };
  return { project, workspace, png: fs.readFileSync(path.join(project, png)), run, clean };
}

for (const mode of ['default', 'relative', 'absolute']) {
  test(`npm postbuild audits ${mode} output, including disguised payloads and source maps`, t => {
    const f = fixture(t);
    // Absolute output deliberately lies outside the project, as CRA supports.
    const selected = mode === 'default' ? undefined : mode === 'relative' ? '.local/custom-output' : path.join(f.workspace, 'absolute-output');
    const output = path.resolve(f.project, selected || 'build');
    f.clean(output);
    const stale = path.join(f.project, 'build');
    f.clean(stale);
    fs.writeFileSync(path.join(stale, 'keep.txt'), 'existing default build sentinel');
    assert.equal(f.run(selected).status, 0);
    const payloads = [
      ['renamed.dat', f.png],
      ['geometry.dat', Buffer.from('glTF\x02\0\0\0\x0c\0\0\0')],
      ['scene.dat', Buffer.from('BLENDER-v300')],
      ['main.js.map', JSON.stringify({ version: 3, sources: ['art.js'], names: [], mappings: '',
        sourcesContent: ['const sprite = "/__local-meshy/source-1-1.15-south-daylight-body.png";'] })],
    ];
    for (const [name, bytes] of payloads) {
      const file = path.join(output, name);
      fs.writeFileSync(file, bytes);
      const result = f.run(selected);
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Forbidden local\/research payload/);
      assert.ok(result.output.includes(name), result.output);
      console.log(`${mode} ${name}: postbuild exit ${result.status} (Forbidden)`);
      fs.unlinkSync(file);
    }
    assert.equal(f.run(selected).status, 0);
    assert.equal(fs.readFileSync(path.join(stale, 'keep.txt'), 'utf8'), 'existing default build sentinel');
    // A clean stale default output must never stand in for the selected output.
    fs.renameSync(output, output + '-saved');
    const missing = f.run(selected);
    assert.equal(missing.status, 1, missing.output);
    assert.match(missing.output, /Missing/);
  });
}

test('production dotenv BUILD_PATH, expansion and shell precedence match CRA', t => {
  const f = fixture(t);
  f.clean(path.join(f.project, '.local/from-env'));
  fs.writeFileSync(path.join(f.project, '.env.production.local'), 'OUTPUT_NAME=from-env\nBUILD_PATH=.local/${OUTPUT_NAME}\n');
  fs.writeFileSync(path.join(f.project, '.env'), 'BUILD_PATH=.local/wrong-output\n');
  assert.equal(f.run().status, 0);
  fs.writeFileSync(path.join(f.project, '.local/from-env/hidden.dat'), f.png);
  assert.equal(f.run().status, 1);
  f.clean(path.join(f.project, '.local/shell-output'));
  assert.equal(f.run('.local/shell-output').status, 0);
});

test('npm entry points retain src/public preflight and postbuild audits', t => {
  const f = fixture(t);
  const selected = '.local/custom-output';
  f.clean(path.join(f.project, selected));
  assert.equal(f.run('nonexistent', 'prebuild').status, 0);
  for (const source of ['src', 'public']) {
    const file = path.join(f.project, source, 'harmless.dat');
    fs.writeFileSync(file, f.png);
    for (const script of ['prebuild', 'postbuild']) {
      const result = f.run(selected, script);
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /Forbidden/);
    }
    fs.unlinkSync(file);
  }
});

test('npm postbuild fails closed for empty, overlapping, metadata-only and symlinked output', t => {
  const f = fixture(t);
  for (const selected of ['', '   ', '.', '..', '/', 'src', 'public/nested', 'docs', 'scripts', 'e2e', 'node_modules', '.git', '.local', '.local/meshy']) {
    for (const script of ['prebuild', 'postbuild']) {
      const result = f.run(selected, script);
      assert.equal(result.status, 1, `${script} unsafe BUILD_PATH ${JSON.stringify(selected)}`);
      assert.match(result.output, /Empty BUILD_PATH|Unsafe BUILD_PATH/);
    }
  }
  const target = path.join(f.project, '.local/target');
  f.clean(target);
  fs.symlinkSync(target, path.join(f.project, '.local/link'), 'dir');
  assert.equal(f.run('.local/link').status, 1);
  assert.equal(f.run('.local/link', 'prebuild').status, 1);
  assert.equal(f.run('.local/link/nested').status, 1);
  const file = path.join(target, 'linked.dat');
  fs.symlinkSync(path.join(f.project, 'package.json'), file);
  assert.equal(f.run('.local/target').status, 1);
  fs.unlinkSync(file);
  fs.unlinkSync(path.join(target, 'index.html'));
  assert.equal(f.run('.local/target').status, 1);
  fs.writeFileSync(path.join(target, 'index.html'), '');
  assert.equal(f.run('.local/target').status, 1);
  fs.unlinkSync(path.join(target, 'index.html'));
  fs.symlinkSync(path.join(f.project, 'package.json'), path.join(target, 'index.html'));
  assert.equal(f.run('.local/target').status, 1);
});
