const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '../../e2e', testMatch: 'archive-integration.spec.js', workers: 1,
  use: { baseURL: 'http://127.0.0.1:3102', browserName: 'chromium', viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' } },
  webServer: { command: 'node docs/archive-client/integration-server.mjs', cwd: require('node:path').resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:3102/__counts', reuseExistingServer: false, timeout: 30000 },
});
