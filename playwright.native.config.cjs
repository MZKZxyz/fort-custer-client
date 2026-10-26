// Separate serial native-timer smoke; increase trials in the optimized-build
// characterization config, rather than competing with deterministic CI jobs.
const { defineConfig } = require('@playwright/test');
const base = require('./playwright.config');
if (process.env.FC_EXPIRY_CHARACTERIZE === 'true') throw new Error('Native CI smoke requires acceptance assertions');
process.env.FC_EXPIRY_TRIALS ||= '1';
process.env.FC_BUILD_DIR ||= require('node:path').resolve(__dirname, 'build');
module.exports = defineConfig({
  ...base,
  testIgnore: [],
  testMatch: 'steering-realtime.spec.js',
  grep: /390×844/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3101', trace: { mode: 'retain-on-failure', sources: false } },
  webServer: {
    command: 'node docs/production-integration/serve.cjs',
    url: 'http://127.0.0.1:3101/maze',
    reuseExistingServer: false,
  },
});
