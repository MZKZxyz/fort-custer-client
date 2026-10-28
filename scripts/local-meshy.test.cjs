const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { assets, stage, validate, staging, root, clean } = require('./local-meshy.cjs');
after(clean);
test('fixed development destination only; invalid characters fail closed', () => {
  process.env.NODE_ENV = 'production';
  assert.throws(() => stage('boy'), /development/);
  process.env.NODE_ENV = 'development';
  for (const destination of ['public/meshy', '/tmp/meshy', staging + '/..']) assert.throws(() => stage('boy', destination));
  assert.throws(() => stage('other'));
});
test('both exact eight-layer sets match manifest, sizes, bytes and hashes', () => {
  for (const character of ['boy', 'girl']) {
    const report = stage(character);
    assert.equal(report.layers, 8);
    assert.equal(report.decodedBytes, 2490368);
    assert.equal(fs.readdirSync(staging).length, 8);
    for (const a of assets(character)) validate(path.join(staging, path.basename(a.file)), a);
  }
});
test('corrupt and symlinked frames rejected without following links', () => {
  stage('boy');
  const a = assets('boy')[0], file = path.join(staging, path.basename(a.file));
  fs.writeFileSync(file, 'corrupt');
  assert.throws(() => validate(file, a));
  fs.unlinkSync(file);
  fs.symlinkSync(path.join(root, 'docs/art/meshy-spike', a.file), file);
  assert.throws(() => validate(file, a), /Symlinks/);
  assert.throws(() => stage('girl'), /Symlinks/);
  fs.unlinkSync(file);
});
test('staging root symlinks and unresolved destinations rejected', () => {
  clean();
  fs.symlinkSync(path.join(root, 'docs'), staging);
  assert.throws(() => stage('boy'), /Symlinks/);
  fs.unlinkSync(staging);
  fs.symlinkSync(path.join(root, 'missing-symlink-target'), staging);
  assert.throws(() => stage('boy'), /Symlinks/);
  fs.unlinkSync(staging);
  assert.throws(() => stage('boy', staging + '/missing'));
});
