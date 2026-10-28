const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, assets } = require('./local-meshy.cjs');
const { audit } = require('./audit-shipping-art.cjs');
test('byte audit catches renamed PNG and binary model signatures', () => {
  const relative = '.local/audit-test', dir = path.join(root, relative);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const file = path.join(dir, 'renamed.bin');
    fs.copyFileSync(path.join(root, 'docs/art/meshy-spike', assets('boy')[0].file), file);
    assert.throws(() => audit([relative]), /Forbidden/);
    fs.writeFileSync(file, 'glTFbinary');
    assert.throws(() => audit([relative]), /Forbidden/);
    fs.writeFileSync(file, 'BLENDERbinary');
    assert.throws(() => audit([relative]), /Forbidden/);
    fs.writeFileSync(file, 'approved unrelated bytes');
    assert.equal(audit([relative]).files, 1);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
