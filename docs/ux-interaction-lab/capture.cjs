// Run with the repository root served at http://127.0.0.1:8765.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(__dirname, 'evidence');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const cases = [
  { file: 'desktop-hold-clear.png', width: 1280, height: 800, dpr: 1, scheme: 'hold', mood: 'day', fixture: 'rules', clear: true, fullPage: true },
  { file: 'portrait-320-hold.png', width: 320, height: 568, dpr: 1, scheme: 'hold', mood: 'day', fixture: 'rules' },
  { file: 'portrait-390-drag-dusk.png', width: 390, height: 844, dpr: 2, scheme: 'drag', mood: 'dusk', fixture: 'rules', clear: true },
  { file: 'landscape-garden.png', width: 844, height: 390, dpr: 1, scheme: 'hold', mood: 'day', fixture: 'garden' },
];
(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' });
  const report = { generatedAtUTC: new Date().toISOString(), base: '344b43159fbbe6276787ab45977cf9e40a3799e8',
    browser: browser.version(), host: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0].model },
    note: 'Author measurements in headless cloud Chromium. CDP touch and page scale are emulation, not physical-device or screen-reader certification. No performance benchmark.', captures: [], sourceSHA256: {} };
  const dependencies = ['src/game/movement.js','src/game/scene.js','src/game/camera.js',
    'docs/art/reference-scene/iteration-2/source/fixture.json'];
  const source = ['index.html','lab.css','lab.mjs','controller.mjs','fixtures.mjs','capture.cjs','playwright.config.cjs','tests/controller.test.mjs','tests/browser.spec.cjs'];
  for (const file of [...dependencies, ...source.map(file => `docs/ux-interaction-lab/${file}`)]) report.sourceSHA256[file] = sha256(file);
  try {
    for (const scenario of cases) {
      const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height },
        deviceScaleFactor: scenario.dpr, hasTouch: true, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], apiCalls = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('request', r => { if (/\/api\//.test(r.url())) apiCalls.push(r.url()); });
      await page.goto('http://127.0.0.1:8765/docs/ux-interaction-lab/');
      await page.locator('[data-ready=true]').waitFor();
      await page.locator('#fixture').selectOption(scenario.fixture);
      if (scenario.scheme === 'drag') await page.getByRole('radio', { name: /B Drag/ }).check();
      await page.locator('#mood').selectOption(scenario.mood);
      await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
      if (scenario.clear) {
        const target = scenario.scheme === 'drag' ? page.locator('#drag-pad') : page.getByRole('button', { name: 'Right', exact: true });
        await target.scrollIntoViewIfNeeded(); const b = await target.boundingBox();
        await page.mouse.move(b.x+b.width/2, b.y+b.height/2); await page.mouse.down();
        if (scenario.scheme === 'drag') await page.mouse.move(b.x+b.width/2+30, b.y+b.height/2);
        await page.clock.runFor(400); await page.clock.runFor(1800);
        assert.equal(await page.locator('#play-board').getAttribute('data-position'), '1,2');
        assert.equal(await page.locator('#command-count').textContent(), '2 commands');
      } else {
        await page.getByRole('button', { name: 'Right', exact: true }).scrollIntoViewIfNeeded();
      }
      if (scenario.fullPage) await page.evaluate(() => window.scrollTo(0, 0));
      // Allow compositor presentation after the deterministic input trace.
      await page.clock.runFor(32);
      const measurement = await page.evaluate(() => {
        const b = document.querySelector('#play-board'), p = document.querySelector('[data-player]');
        const rect = element => { const r = element.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0,3).map(v => { const s = Number(v)/255; return s <= .04045 ? s/12.92 : ((s+.055)/1.055)**2.4; });
          return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
        };
        const contrast = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
        const panelBackground = getComputedStyle(document.querySelector('.controls')).backgroundColor;
        const textContrast = {
          body: contrast(getComputedStyle(document.body).color, getComputedStyle(document.body).backgroundColor),
          headingVsPanel: contrast(getComputedStyle(document.querySelector('#controls-title')).color, panelBackground),
          instructionsVsPanel: contrast(getComputedStyle(document.querySelector('#scheme-help')).color, panelBackground),
        };
        return { textContrast, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          horizontalOverflow: document.documentElement.scrollWidth-innerWidth,
          position: b.dataset.position, completed: b.dataset.completed, equipment: document.querySelector('#equipment').textContent,
          board: rect(b), player: rect(p), cell: rect(p), mountedCells: document.querySelectorAll('.cell').length,
          camera: { x: b.scrollLeft, y: b.scrollTop },
          inputPhase: document.querySelector('#input-phase').textContent,
          inputReason: document.querySelector('#input-reason').textContent,
          commandLog: [...document.querySelectorAll('#event-log li')].map(e => e.textContent),
          dpad: [...document.querySelectorAll('.direction')].map(e => ({ name: e.getAttribute('aria-label'), ...rect(e) })),
          reducedMotion: matchMedia('(prefers-reduced-motion:reduce)').matches,
          runningAnimations: document.getAnimations().length,
          touchAction: { board: getComputedStyle(b).touchAction, dpad: getComputedStyle(document.querySelector('.direction')).touchAction,
            drag: getComputedStyle(document.querySelector('#drag-pad')).touchAction },
          storage: { local: localStorage.length, session: sessionStorage.length },
          feedback: document.querySelector('#feedback').textContent,
        };
      });
      assert(Object.values(measurement.textContrast).every(value => value >= 4.5));
      assert.equal(measurement.horizontalOverflow, 0); assert.equal(measurement.runningAnimations, 0);
      assert.equal(errors.length, 0); assert.equal(apiCalls.length, 0);
      await page.screenshot({ path: path.join(evidence, scenario.file), fullPage: Boolean(scenario.fullPage) });
      report.captures.push({ ...scenario, ...measurement, errors, apiCalls });
      await page.mouse.up(); await context.close();
    }
    report.isolation = { changedTrackedPathsOutsideLab: execFileSync('git', ['diff', report.base, '--name-only', '--', '.', ':!docs/ux-interaction-lab'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean) };
    assert.deepEqual(report.isolation.changedTrackedPathsOutsideLab, []);
    const build = process.argv[2];
    if (build) {
      const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
      const forbidden = ['ux-interaction-lab','Find your','createController','drag-preview'];
      report.isolation.productionFilesContainingLabMarkers = walk(build).filter(file => /\.(js|css|html|json)$/.test(file) && forbidden.some(marker => fs.readFileSync(file,'utf8').includes(marker))).map(file => path.relative(build, file));
      assert.deepEqual(report.isolation.productionFilesContainingLabMarkers, []);
    }
    fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2)+'\n');
    console.log(`PASS: ${cases.length} native captures; no overflow, animations, page errors, API calls, production markers or out-of-scope tracked changes`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
