const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '../../e2e',
  testMatch: process.env.FC_ALL_REGRESSIONS === 'true' ? '**/*.spec.js' : ['maze-surface.spec.js', 'unified-input.spec.js', 'production-integration.spec.js', 'completion-recovery.spec.js'],
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:3101', browserName: 'chromium', isMobile: true, hasTouch: true,
    trace: { mode: 'on', sources: false }, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' } },
  webServer: { command: 'node docs/production-integration/serve.cjs', cwd: require('node:path').resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:3101/maze', reuseExistingServer: false },
});
