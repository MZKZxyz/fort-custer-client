// Run against `BROWSER=none HOST=127.0.0.1 PORT=3100 npm start`.
// Baseline: node docs/scene-boundary/capture.cjs before
// Compare:  node docs/scene-boundary/capture.cjs after (or rollback)
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const stage = process.argv[2];
assert(['before', 'after', 'rollback'].includes(stage));
const root = path.join(__dirname, 'evidence');
const directory = path.join(root, stage);
fs.mkdirSync(directory, { recursive: true });
const sha256 = data => createHash('sha256').update(data).digest('hex');
const sourceMazePageSha256 = sha256(fs.readFileSync(path.join(__dirname, '../../src/pages/MazePage.js')));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' });
  const results = [];
  try {
    for (const [rows, columns] of [[13, 17], [21, 21]]) {
      for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
        const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 1000, hasTouch: true });
        const page = await context.newPage();
        await page.addInitScript(() => {
          localStorage.setItem('token', 'synthetic-token');
          localStorage.setItem('activeSubProfile', JSON.stringify({ _id: 'synthetic-profile' }));
          localStorage.setItem('selectedMazeDate', '2025-05-26');
          Math.random = () => 0;
          performance.now = () => 100;
        });
        await page.route('https://fonts.googleapis.com/**', route => route.abort());
        await page.route('https://fonts.gstatic.com/**', route => route.abort());
        const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) =>
          r === 0 || c === 0 || r === rows - 1 || c === columns - 1 || (r % 3 === 0 && c % 4 === 0) ? '#' : ' '));
        ['S', 'X', 'F', 'E'].forEach((tile, i) => { grid[1][i + 1] = tile; });
        await page.route('**/api/**', route => {
          assert.equal(new URL(route.request().url()).pathname, '/api/maze/start');
          return route.fulfill({ json: { maze: { grid }, seed: 'scene-boundary-fixture', attemptId: '01234567-89ab-4cde-8fab-0123456789ab' } });
        });
        await page.goto('http://127.0.0.1:3100/maze');
        await page.locator('.maze-grid').waitFor();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
        });
        const name = `${rows}x${columns}-${width}x${height}`;
        const states = [];
        const capture = async (label, screenshot = false) => {
          // Pause decorative animation for reproducible pixels, preserving its CSS.
          await page.evaluate(() => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 0; }));
          states.push({ label, domSha256: sha256(await page.locator('.maze-page').evaluate(el => el.outerHTML)) });
          if (screenshot) {
            const filename = `${name}-${label}.png`;
            const data = await page.screenshot({ fullPage: true });
            if (stage === 'before') fs.writeFileSync(path.join(directory, filename), data);
            else assert(data.equals(fs.readFileSync(path.join(root, 'before', filename))), `${filename}: pixels differ`);
            results.push({ file: filename, sha256: sha256(data) });
          }
        };
        await capture('initial', true);
        await page.keyboard.press('ArrowUp'); // wall
        await capture('wall');
        await page.getByRole('button', { name: 'Right', exact: true }).click(); // X
        await capture('pickup');
        await page.keyboard.press('ArrowRight'); // clear F without moving
        await capture('cleared', true);
        await page.keyboard.press('ArrowRight'); // step onto cleared tile
        await capture('advanced');
        await page.getByRole('button', { name: 'Back', exact: true }).click();
        await page.keyboard.press('ArrowLeft'); // blocked by modal
        await capture('modal');
        const filename = `${name}.json`;
        const data = JSON.stringify(states, null, 2) + '\n';
        fs.writeFileSync(path.join(directory, filename), data);
        if (stage !== 'before') assert.equal(data, fs.readFileSync(path.join(root, 'before', filename), 'utf8'), `${name}: DOM differs`);
        results.push({ file: filename, sha256: sha256(data) });
        await context.close();
      }
    }
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ browser: browser.version(), sourceMazePageSha256, comparison: stage === 'before' ? 'baseline' : 'passed: all PNG bytes and DOM hashes equal baseline', screenshots: stage === 'before' ? './' : '../before/', fixtures: '13 rows × 17 columns; 21 rows × 21 columns', results }, null, 2) + '\n');
    console.log(`${stage}: ${results.length} artifacts; ${stage === 'before' ? 'baseline captured' : 'all screenshots byte-identical and all DOM states identical to before'}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
