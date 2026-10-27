const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '../../e2e',
  testMatch: /(?:archive|responsive|completion-recovery|minimal-hud|unified-input|continuous-steering|production-integration|camera|dpad|maze-surface)\.spec\.js/,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:3101', browserName: 'chromium', isMobile: true, hasTouch: true,
    trace: { mode: 'retain-on-failure', sources: false },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' } },
  webServer: { command: 'FC_BUILD_DIR=build node docs/production-integration/serve.cjs',
    cwd: require('node:path').resolve(__dirname, '../..'), url: 'http://127.0.0.1:3101', reuseExistingServer: false, timeout: 30000 },
});
