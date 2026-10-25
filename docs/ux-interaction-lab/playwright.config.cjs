const { defineConfig } = require('@playwright/test');
const path = require('node:path');
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', fullyParallel: true,
  outputDir: '/tmp/fort-custer-ux-results',
  use: { baseURL: 'http://127.0.0.1:8765/docs/ux-interaction-lab/', browserName: 'chromium',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' },
    trace: 'retain-on-failure', viewport: { width: 1280, height: 900 } },
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    cwd: path.resolve(__dirname, '../..'), url: 'http://127.0.0.1:8765/docs/ux-interaction-lab/', reuseExistingServer: !process.env.CI },
});
