// Disposable local browser → merged server routes → MongoDB verification only.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join, extname } from 'node:path';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import net from 'node:net';
for (const key of ['MONGO_URI', 'MONGODB_URI', 'MONGO_URL', 'DATABASE_URL']) {
  if (process.env[key]) throw new Error('External database selectors must be unset.');
}
const reference = process.env.FC_ARCHIVE_SERVER_REFERENCE;
const binary = process.env.MONGOD_BINARY;
if (!reference || !binary) throw new Error('Explicit server checkout and disposable mongod binary required.');
const expected = '1f668d23477aa62557bd531e501ce5f6771bdd0c';
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: reference, encoding: 'utf8' }).trim() !== expected) throw new Error('Wrong server reference SHA.');
const require = createRequire(join(reference, 'package.json'));
const express = require('express'), mongoose = require('mongoose'), jwt = require('jsonwebtoken');
const moduleAt = path => import(pathToFileURL(join(reference, path)).href);
process.env.JWT_SECRET = 'disposable-archive-browser-key';
const { default: User } = await moduleAt('models/User.js');
const { default: Maze } = await moduleAt('models/Maze.js');
const { fixturePublications } = await moduleAt('tools/test-support/legacy-publications.mjs');
const { createMazeRouter } = await moduleAt('routes/mazeRoutes.js');
const { createLeaderboardRouter } = await moduleAt('routes/leaderboardRoutes.js');
const { completeAttempt } = await moduleAt('services/completions.js');
const dir = await mkdtemp(join(tmpdir(), 'fc-client-archive-'));
const probe = net.createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const db = spawn(binary, ['--dbpath', dir, '--bind_ip', '127.0.0.1', '--port', String(port), '--logpath', join(dir, 'mongo.log')], { stdio: 'ignore' });
let server;
async function cleanup() {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (db.exitCode === null) { db.kill('SIGTERM'); await new Promise(resolve => db.once('exit', resolve)); }
  await rm(dir, { recursive: true, force: true });
}
process.once('SIGTERM', () => cleanup().then(() => process.exit(0)));
process.once('SIGINT', () => cleanup().then(() => process.exit(0)));
try {
  let failure;
  db.on('error', error => { failure = error; });
  const deadline = Date.now() + 15000;
  while (true) {
    if (failure) throw failure;
    try {
      // One reusable client; short selection/connect limits apply only to this local startup probe.
      // The 5s socket budget exceeds the merged route's 2s query budget on this disposable DB.
      await mongoose.connect(`mongodb://127.0.0.1:${port}/fc_client_archive_synthetic`, {
        serverSelectionTimeoutMS: 250, connectTimeoutMS: 1000, socketTimeoutMS: 5000,
      });
      break;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  await Promise.all([User.init(), Maze.init()]);
  const grid = [['S', 'X', 'F', 'E']];
  const dates = ['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02'];
  await Maze.create(dates.map(date => ({ date, grid, seed: 'synthetic', width: 4, height: 1 })));
  const user = await User.create({ email: 'synthetic@example.invalid', password: 'unusable-fixture', subProfiles: [{ name: 'Player' }] });
  const profileId = String(user.subProfiles[0]._id);
  const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET);
  const legacy = fixturePublications(dates.map(date => [date, grid]));
  const epoch = performance.now();
  const now = () => new Date(Date.parse('2028-03-01T12:00:00Z') + performance.now() - epoch);
  const app = express(); app.use(express.json());
  app.get('/__fixture', (_req, res) => res.json({ token, profileId }));
  app.get('/__counts', async (_req, res) => {
    const saved = await User.findById(user._id);
    const attempts = saved.subProfiles[0].attempts;
    res.json({ mazeCount: await Maze.countDocuments(), attemptCount: [...attempts.values()].flat().length,
      completed: [...saved.subProfiles[0].progress.keys()] });
  });
  app.use('/api/maze', createMazeRouter({ now, legacy, complete: (owner, body) => completeAttempt(owner, body, now()) }));
  app.use('/api/leaderboard', createLeaderboardRouter({ now, legacy }));
  const root = resolve('build'); app.use(express.static(root));
  app.use(async (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.type(extname(req.path) || 'html').send(await readFile(join(root, 'index.html')));
  });
  server = app.listen(3102, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  console.log('Disposable archive integration ready; merged server reference verified.');
} catch (error) { console.error(error.message); await cleanup(); process.exit(1); }
