if (process.env.REACT_APP_EXPERIMENTAL_SESSION_V2 !== 'true') process.env.FC_V2_EXPECT_OFF = 'true';
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '../../e2e',
  testMatch: process.env.FC_ART_REGRESSION === 'true'
    ? ['production-integration.spec.js', 'maze-surface.spec.js', 'unified-input.spec.js', 'continuous-steering.spec.js', 'completion-recovery.spec.js', 'session-v2.spec.js', 'session-v2-results.spec.js']
    : 'local-character-art.spec.js',
  workers: 2, fullyParallel: true, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3100', browserName: 'chromium', isMobile: true, hasTouch: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } },
  webServer: { command: 'BROWSER=none HOST=127.0.0.1 PORT=3100 npm start', url: 'http://127.0.0.1:3100', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
