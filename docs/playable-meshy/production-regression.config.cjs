if (process.env.REACT_APP_EXPERIMENTAL_SESSION_V2 !== 'true') process.env.FC_V2_EXPECT_OFF = 'true';
const base = require('../unified-input/playwright.config.cjs');
module.exports = { ...base, testMatch: '**/*.spec.js', testIgnore: ['**/steering-realtime.spec.js', '**/session-v2-actual.spec.js', '**/local-character-art.spec.js'], workers: 2 };
