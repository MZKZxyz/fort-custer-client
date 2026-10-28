// Disposable browser → exact merged default server → owned MongoDB only.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFile, mkdtemp, rm, cp, symlink, writeFile } from 'node:fs/promises';
import { fork, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
for (const key of ['MONGO_URI', 'MONGODB_URI', 'MONGO_URL', 'DATABASE_URL']) {
  if (Object.hasOwn(process.env, key)) throw new Error('External database selectors must be unset.');
}
const reference = process.env.FC_ARCHIVE_SERVER_REFERENCE;
if (!reference || !process.env.MONGOD_BINARY) throw new Error('Explicit server checkout and disposable mongod binary required.');
const expected = 'daf455a61aed7d83eb3f0bfc115044db1e46d992';
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: reference, encoding: 'utf8' }).trim() !== expected) throw new Error('Wrong server reference SHA.');
const require = createRequire(join(reference, 'package.json'));
const express = require('express');
const moduleAt = path => import(pathToFileURL(join(reference, path)).href);
// Existing server fixture owns its Mongo process, path, URI and reusable clients.
// No ambient URI, production startup connection or new pool tuning is used.
const { replicaSet } = await moduleAt('tools/transaction-feasibility/replica-set.mjs');
const { freshFixture } = await moduleAt('tools/test-support/fresh-fixtures.mjs');
const { releaseDecisionHash } = await moduleAt('services/publication/fresh-release.js');
const { generateDaily } = await moduleAt('lib/maze/engine.js');
const { publicationDocument } = await moduleAt('services/publication/policy.js');
let rs, root, child, server;
const message = value => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Error('DISPOSABLE_APP_TIMEOUT')), 12000);
  child.once('message', response => { clearTimeout(timer); resolve(response); }); child.send(value);
});
async function cleanup() {
  server?.closeAllConnections();
  if (server) await new Promise(resolve => server.close(resolve));
  if (child && child.exitCode === null && child.signalCode === null) {
    const exit = new Promise(resolve => child.once('exit', resolve)); child.disconnect(); await exit;
  }
  if (root) await rm(root, { recursive: true, force: true });
  await rs?.close();
}
process.once('SIGTERM', () => cleanup().then(() => process.exit(0)));
process.once('SIGINT', () => cleanup().then(() => process.exit(0)));
try {
  rs = await replicaSet();
  for (const name of ['mazes', 'users', 'rewarditems']) await rs.db.createCollection(name);
  await rs.db.collection('mazes').createIndex({ date: 1 }, { unique: true });
  await rs.db.collection('mazes').createIndex({ publicationEra: 1, date: 1, publishedAt: 1 });
  await rs.db.collection('users').createIndex({ email: 1 }, { unique: true });
  await rs.db.collection('rewarditems').createIndex({ id: 1 }, { unique: true });
  const release = freshFixture();
  Object.assign(release, { startDate: '2028-02-28', startsAt: '2028-02-28T00:00:00.000Z' });
  release.approval.decisionHash = releaseDecisionHash(release);
  const dates = ['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02'];
  const generated = dates.map(date => generateDaily({ date }));
  const candidates = generated.map(result => {
    const doc = publicationDocument(result, new Date(`${result.maze.date}T01:00:00.000Z`));
    Object.assign(doc.provenance, { releaseId: release.releaseId, releaseDecisionHash: release.approval.decisionHash });
    return doc;
  });
  // Excluded historical fixture; retained unchanged for original UUID recovery.
  await rs.db.collection('mazes').insertOne({ date: '2025-05-26', grid: [['S', 'E']], seed: 'synthetic-old', width: 2, height: 1 });
  root = await mkdtemp(join(tmpdir(), 'fc-client-fresh-'));
  for (const file of ['app.js', 'index.js', 'package.json', 'models', 'routes', 'services', 'lib', 'middleware', 'config']) {
    await cp(join(reference, file), join(root, file), { recursive: true });
  }
  await symlink(join(reference, 'node_modules'), join(root, 'node_modules'), 'dir');
  // Synthetic approval in a disposable copy only. Checked-in artifact stays pending.
  await writeFile(join(root, 'config/fresh-release.json'), JSON.stringify(release));
  child = fork(join(reference, 'tools/test-support/release-app.mjs'), [], {
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'], env: { PATH: process.env.PATH, TZ: 'UTC' },
  });
  const startup = await message({ root, uri: rs.uri, at: '2028-03-01T12:00:00.000Z' });
  if (!startup.port || startup.connectCalls !== 1 || startup.ddl.length || startup.writes.length) throw Error(`DISPOSABLE_STARTUP_FAILED ${JSON.stringify(startup)}`);
  const apiBase = `http://127.0.0.1:${startup.port}`;
  const api = async (path, body, token) => {
    const response = await fetch(apiBase + '/api/' + path, { method: body ? 'POST' : 'GET', headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw Error(`DISPOSABLE_SETUP_HTTP_${response.status}`);
    return response.json();
  };
  const email = 'synthetic-client@example.invalid', password = 'synthetic-password';
  await api('users/register', { email, password });
  const token = (await api('users/login', { email, password })).token;
  const profileId = (await api('users/subprofile', { name: 'Player' }, token))[0]._id;
  const oldDate = '2025-05-26', oldAttemptId = '12345678-1234-1234-1234-123456789abc';
  const oldReceipt = { message: 'Maze complete', time: '12.345', reward: null, today: oldDate, attemptId: oldAttemptId };
  await rs.db.collection('users').updateOne({ email }, { $set: {
    [`subProfiles.0.progress.${oldDate}`]: { completed: true, time: '12.345' },
    [`subProfiles.0.attempts.${oldDate}`]: [{ attemptId: oldAttemptId, completed: true,
      started: new Date(`${oldDate}T00:00:00Z`), result: oldReceipt }],
  } });
  let published = false, oldSnapshot;
  const app = express(); app.use(express.json());
  app.get('/__fixture', (_req, res) => res.json({ token, profileId, solution: generated[1].analysis.solution.actions, oldDate, oldAttemptId, oldReceipt }));
  app.post('/__publish', async (_req, res) => {
    if (!published) { await rs.db.collection('mazes').insertMany(candidates); published = true; }
    res.json({ published });
  });
  app.post('/__advance', async (_req, res) => res.json(await message({ op: 'clock', at: '2028-03-01T12:00:10.000Z' })));
  app.post('/__snapshot', async (_req, res) => {
    oldSnapshot = JSON.stringify(await rs.db.collection('users').findOne({ email })); res.json({ saved: true });
  });
  app.get('/__counts', async (_req, res) => {
    const user = await rs.db.collection('users').findOne({ email });
    const stats = await message({ op: 'stats' });
    const attempts = user.subProfiles[0].attempts;
    res.json({ mazeCount: await rs.db.collection('mazes').countDocuments(),
      attemptCount: Object.values(attempts).flat().length,
      byDate: Object.fromEntries(Object.entries(attempts).map(([date, values]) => [date, values.length])),
      completed: Object.keys(user.subProfiles[0].progress).sort(),
      snapshotUnchanged: oldSnapshot ? JSON.stringify(user) === oldSnapshot : null, ddl: stats.ddl });
  });
  // Proxy to the exact default route composition. No mocked API substitutes.
  app.use('/api', async (req, res) => {
    const response = await fetch(apiBase + req.originalUrl, { method: req.method, headers: {
      ...(req.get('Authorization') ? { Authorization: req.get('Authorization') } : {}),
      ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    }, ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}) });
    res.status(response.status).type('json').send(await response.text());
  });
  const buildRoot = resolve('build'); app.use(express.static(buildRoot));
  app.use(async (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.type('html').send(await readFile(join(buildRoot, 'index.html')));
  });
  server = app.listen(3102, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  console.log('Disposable default fresh server integration ready; merged SHA verified.');
} catch (error) { console.error(error.message); await cleanup(); process.exit(1); }
