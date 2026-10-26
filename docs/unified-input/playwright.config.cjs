const { defineConfig } = require('@playwright/test');
const realtime = process.env.FC_REALTIME_STEERING === 'true';
module.exports = defineConfig({
  testDir: '../../e2e',
  testMatch: realtime ? 'steering-realtime.spec.js' : process.env.FC_ALL_REGRESSIONS === 'true' ? '**/*.spec.js' : ['continuous-steering.spec.js', 'maze-surface.spec.js', 'unified-input.spec.js', 'production-integration.spec.js', 'completion-recovery.spec.js'],
  testIgnore: realtime ? [] : ['**/steering-realtime.spec.js'],
  fullyParallel: true,
  ...(realtime ? { fullyParallel: false, workers: 1, retries: 0, timeout: 120000 } : {}),
  use: { baseURL: 'http://127.0.0.1:3101', browserName: 'chromium', isMobile: true, hasTouch: true,
    trace: { mode: process.env.FC_TRACE_ALL === 'true' ? 'on' : 'retain-on-failure', sources: false }, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' } },
  webServer: { command: 'node docs/production-integration/serve.cjs', cwd: require('node:path').resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:3101/maze', reuseExistingServer: false },
});
