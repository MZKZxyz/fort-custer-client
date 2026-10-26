const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testIgnore: '**/steering-realtime.spec.js',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: {
    command: 'BROWSER=none HOST=127.0.0.1 PORT=3100 npm start',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
