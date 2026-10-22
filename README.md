# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Gameplay development checks

Use Node.js 24 and install the locked dependencies with `npm ci`.

```sh
CI=true npm test -- --watchAll=false --runInBand
REACT_APP_API_URL=/api npm run build
```

The gameplay tests use synthetic grids, mocked API responses, and a controlled monotonic clock. They need no backend, MongoDB, credentials, or production integration. The pull request workflow runs these checks without deploying. Jest maps the locked React Router and Axios versions to their CommonJS entry points because Create React App's older Jest resolver does not support their package exports; jsdom also needs a TextEncoder polyfill.

Keyboard arrows and D-pad buttons share a pure transition in `src/game/movement.js`. Fire consumes the extinguisher and clears the tile without moving the player; the next input enters the cleared tile. Inventory holds at most one extinguisher, matching the single visible inventory slot. Walls, fog, grid assets, API request bodies, and the results animation are preserved. The client timer starts when the maze becomes playable and stops at the exit; the server's response remains the authoritative saved completion time.

Completion failures keep the player on the maze with explicit retry/back controls. A retry cannot distinguish a request rejected by the server from a successful write whose response was lost. Recovering that case requires an idempotent completion API or attempt status lookup; no API contract is changed here. Physical touchscreen behavior and full browser/backend integration have not been verified by jsdom tests.

### Recommended next sprint

1. Introduce stable attempt identifiers and idempotent completion/status recovery with the server; reconcile server and display timing after delayed or lost responses.
2. Add browser-level keyboard and touch tests with local synthetic API fixtures, including background/resume, slow networks, and visual regression checks.
3. Add recoverable maze-loading errors, validate stored profile/date and server grid data, and replace the hardcoded 2025 season with an explicit season configuration.

## Mobile D-pad browser regressions

```sh
npx playwright install --with-deps chromium
npm run test:e2e -- --workers=2
```

Playwright starts the client on port 3100 and mocks all API traffic with an open synthetic maze. No backend, database, or credentials are needed. Tests use native Chromium touch taps and mouse clicks at viewport coordinates for all four arrows across seven viewport sizes, including portrait, landscape, desktop-width, and extremely short screens. They check button bounds, `elementFromPoint` hit targets, real click delivery, and actual player movement. They do not force clicks or dispatch synthetic DOM events. They explicitly scroll each button into view before pointer testing: these are input-delivery checks, not a claim that all controls fit in the original fixed-screen layout. Font requests are blocked for offline determinism.

If using an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium`. Failure traces are written to the ignored `test-results/` directory. CI installs Playwright's matching Chromium automatically.

The reported directional-input issue was traced to Chrome DevTools focus, not the D-pad. A separate short-screen clipping issue was reproduced, but the proposed height-based maze cap was reverted: at 844×390 it shrank a 21×21 board from approximately 822px to 58px (about 1.8px per tile), and at 390×240 it could collapse the board. It also substantially reduced desktop board sizes. Original `max-width: 95vw` sizing is restored. A browser layout regression test checks original board and tile widths across seven mobile/desktop/short-screen sizes.

Historical layout limitation (addressed by Sprint 2 below): controls could remain below the viewport in the original non-scrolling layout. Playwright explicitly scrolls them into view to verify pointer behavior; this does not establish that a user can naturally reach them on a short screen. There is no defined minimum playable tile size yet. A separate responsive-layout change should establish that minimum and choose a scrolling or landscape layout rather than shrinking the maze toward zero.

## Responsive layout (Sprint 2)

Pages use document scrolling rather than a global overflow lock. Maze dimensions
remain width-based (`95vw`); viewport height never reduces the board. The HUD wraps,
emoji no longer widen individual flex cells, and native touch scrolling/pinch zoom
are restored by removing the page-wide event cancellation. The D-pad retains its
60px buttons, and the existing movement engine, fog masks, inventory and assets
are unchanged. Quit/save dialogs have viewport gutters and scrollable content.

The calendar is centered at a maximum 400px width, with shorter weekday headers
and full document scrolling. Play and the last row clear the fixed navigation.
Shared navigation includes safe-area padding; collection, profiles, results and
leaderboard pages reserve bottom clearance. Account forms have narrow-screen
gutters, the title artwork uses the small viewport height, and wide leaderboard
tables scroll within their card. `viewport-fit=cover` enables safe-area insets.

Run the existing checks above plus `npm run test:e2e -- --workers=2`. The responsive
suite covers 320×568, 375×667, 390×844, 412×915, 844×390, 1280×800 and 1440×900.
It checks document overflow, calendar-to-maze navigation, Play clearance, real
Chromium touch swipes on overflowing pages, unforced taps, keyboard movement, fog,
inventory and quit/cancel controls. It also visits collection, weekly leaderboard,
profiles and results, and checks title/account navigation and form bounds. The
existing real-touch/mouse D-pad suite and height-invariant tile sizing test remain.
The 21-column fixture retains at least 13 CSS pixels per tile at 320px; generated
mazes currently default to 13 columns. No artificial height cap or minimum board
width introduces horizontal scrolling. Tests use intercepted synthetic responses
and never need a backend or database.

Remaining limitations: a short screen can require vertical scrolling between the
board and D-pad; the controls are not a sticky overlay. Very wide custom grids may
have smaller tiles because this change preserves width-based sizing. Chromium
emulation does not verify physical iOS browser chrome, virtual keyboards or notch
hardware; safe-area behavior still needs device testing. Long leaderboard content
may require intentional horizontal scrolling inside its table card. Calendar date
rules and the existing 2025 season remain unchanged.

Coordination: based on main after gameplay PR #24. No open client pull requests
were visible during the sprint audit. Concurrent work on MazePage, navigation,
calendar CSS or account forms should reconcile these layout changes; there is no
backend/API dependency. No production resources, deployments or data changes.
