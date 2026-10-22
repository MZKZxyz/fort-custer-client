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

Playwright starts the client on port 3100 and mocks all API traffic with an open synthetic maze. No backend, database, or credentials are needed. Tests use native Chromium touch taps and mouse clicks at viewport coordinates for all four arrows across five portrait/landscape sizes. They check button bounds, `elementFromPoint` hit targets, real click delivery, and actual player movement. They do not force clicks, dispatch synthetic DOM events, or scroll clipped buttons into view. Font requests are blocked for offline determinism.

If using an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium`. Failure traces are written to the ignored `test-results/` directory. CI installs Playwright's matching Chromium automatically.

A confirmed layout bug placed the D-pad below the viewport on shorter screens: the square maze was constrained by screen width alone while page scrolling was disabled. The maze now also reserves screen height for the banner/HUD and both control rows, retaining the existing buttons and movement rules. Before the fix, six of ten viewport/pointer cases failed visibility checks; afterward all ten passed. The separate report of LEFT/RIGHT alone failing while DOWN worked was not reproduced with open adjacent tiles; browser hit testing did not reveal an intercepting overlay. Exact device/maze reproduction details remain useful if that symptom persists.
