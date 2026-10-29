# Playable local Meshy comparison — issue #64

Baseline: `72e5f90786288f02371da18139e1e834d8d13f64`. This is local evaluation, awaiting independent Client QA and owner gameplay-scale review. Neither licenses nor public distribution rights are cleared. No Meshy image is added to shipping trees; existing research exports remain under `docs/art/meshy-spike`. No high-poly source is needed.

## Launch and switch

From the client repository root, run `npm ci` once. This run used Node 26.12.1 with the existing lockfile. Stop the development server before changing characters or gates, then restart it. Do not set `NODE_ENV` for `npm start`; CRA sets development itself.

Create the ignored `.env.local` for the boy:

```dotenv
REACT_APP_MAZE_VISUAL_INTEGRATION=true
REACT_APP_MAZE_CHARACTER_ART=meshy-local
REACT_APP_MAZE_CHARACTER_SOURCE=boy
```

```sh
NODE_ENV=development npm run art:stage -- boy
HOST=127.0.0.1 BROWSER=none npm start
```

Open the local URL printed by CRA, enter the maze through the normal application flow, and use arrow keys, drag steering or the optional direction buttons. No profile, session or server changes are made by the selector.

For the girl, stop CRA, change `REACT_APP_MAZE_CHARACTER_SOURCE=girl`, run `NODE_ENV=development npm run art:stage -- girl`, then repeat the start command. The boy is the default if the source variable is absent. Invalid values select pilot artwork. Only daylight is supported in this sprint; dusk is optional in the issue and is deferred to keep the comparison consistent with the existing daylight kit.

For the original pilot in the same integrated renderer, set `REACT_APP_MAZE_CHARACTER_ART=pilot`, leave visual integration true, and restart CRA. For the original classic game, set both gates to false and restart. Meshy enabled with visual integration false also retains classic rendering. These preferences cannot be read from URLs, localStorage or player profiles. The existing **Use classic view** button preserves the current attempt.

Cleanup: stop CRA and run `npm run art:clean`, then remove the three art variables from `.env.local`. `.local/meshy` is ignored and is outside `public`, so CRA cannot copy it into a build. The staging tool accepts exactly `boy`, `girl` or `clean`; there is no destination override. It validates the manifest's eight 1.15-cell daylight PNG layers and refuses symlinked paths. The development middleware validates bytes again before serving only the selected subset at `/__local-meshy/`; it refuses other modes, characters, paths and nondevelopment execution.

## Safe playable fixtures and reproduction

The browser tests open the actual `/maze` route and supply synthetic local API responses and synthetic local identity. No live backend, account or database is used. Run art tool tests while the development server is stopped: they deliberately replace and clean staging.

```sh
npm run test:art
CI=true npm test -- --watchAll=false --runInBand
node docs/visual-integration/source/geometry.test.mjs
node docs/art/batch-02/source/selection.test.mjs
NODE_ENV=development npm run art:stage -- boy
REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=boy FC_ART_EVIDENCE_DIR=/private/local-review-evidence npx playwright test --config=docs/playable-meshy/playwright.config.cjs
```

The evidence path above is a placeholder: choose a private local directory. Chrome is selected on macOS by the config; elsewhere set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chrome/Chromium executable. Stop CRA, stage girl, and repeat with source `girl`. Run pilot with character art `pilot` and visual integration true. To check the disabled visual gate, repeat with visual integration false and Meshy enabled. Do not publish screenshots without owner clearance.

For hands-on review without a backend, keep the selected character staged, stop other CRA instances, and run:

```sh
FC_ART_PLAYTEST=true REACT_APP_MAZE_VISUAL_INTEGRATION=true REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=boy npx playwright test --config=docs/playable-meshy/playwright.config.cjs --grep 'manual local explorer session' --headed --workers=1
```

The browser pauses on the actual playable maze with local synthetic identity/API fixtures. Interact with the page using keys, drag and direction buttons; Resume in Playwright Inspector ends the review. Change source to `girl` after staging girl, or art to `pilot` for the original integrated artwork. Completion deliberately returns a synthetic save interruption, preserving the completed scene for review; it never writes a real result. Automated completion/recovery suites exercise retry separately.

The matrix covers 320×568, 390×844, 844×390 and 1280×800, both 36/48px and DPR1/2, and all four facings. Its test-only `innerWidth` substitution isolates sprite scale from viewport shape; it does not change camera code. Natural sizing remains `max(36,min((innerWidth−36)/8,48))` (390px naturally gives 44.25px). The existing input/integration suites run with natural sizing:

```sh
REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=girl FC_ART_REGRESSION=true npx playwright test --config=docs/playable-meshy/playwright.config.cjs
```

The existing D-pad suite uses classic-cell selectors; D-pad parity in the integrated renderer is covered by the gameplay matrix and unified-input suite. This sprint's evidence lists exactly what was executed. Development gate changes require a server restart. Do not run two configs against a stale reused server with different flags.

## Production exclusion

`PalletMaze` requires the resolver only inside a compile-time development branch. Optimized bundles and source maps exclude the local resolver, regardless of `.env.local` preferences. The proxy is a CRA development-server hook and has no production endpoint. Default production rendering remains classic; an existing visual-integration production opt-in still uses only pilot sprites.

```sh
# Intentionally leave local sprites staged and set local preferences:
REACT_APP_API_URL=/api REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=girl npm run build
node scripts/audit-shipping-art.cjs
FC_BUILD_DIR=build npx playwright test --config=docs/playable-meshy/production-regression.config.cjs
```

`prebuild` checks source/public and rejects unsafe output destinations before CRA empties them. `postbuild` checks source/public plus the actual CRA output, including source maps. It loads CRA production dotenv settings and resolves `BUILD_PATH` from the project root (default `build/`, relative paths, or absolute paths including dedicated external outputs). Empty values, repository/source/metadata overlap, symlinked paths, missing output and missing/empty/nonregular `index.html` fail closed. Use canonical paths rather than symlink aliases. The npm-entry-point regression fixtures live in disposable projects and never remove an existing developer build. The audit compares file contents with all 96 research sprite hashes and both original source hashes, checks binary GLB/Blender signatures and model extensions, and rejects local asset URLs in shipping text. A test disguises forbidden sprites/models under unrelated filenames. No new binaries are committed. Do not bypass these checks, copy research assets into public/src, or use a development server as a public preview.

## Rendering and review boundary

Only asset URLs change. Up/right/down/left map to north/east/south/west. Body 256×352 at 224 pixels/cell with (128,208) anchor; shadow 256² at 112 pixels/cell with (128,150) anchor. The 58° projection, tile sizing, depth order, camera, logical occupancy and player cue are unchanged. Each failed facing switches both layers to pilot for that mount; it is not retried on each turn. Pilot failures retain the existing classic fallback. Asset readiness never gates movement, server readiness, timer or completion.

Each character has eight layers and **2,490,368 decoded RGBA bytes** if all directions are visited. The compressed unique set is **278,700 bytes boy**, **242,004 bytes girl**; a current body/shadow pair is **622,592 decoded bytes**. Network resource timing in local evidence distinguishes actual repeated transfers from unique-set size. No 96-image preload, walking animation, new runtime engine or high-poly request is introduced.

Review known scale tradeoffs: broad brims hide facial detail at 58°, the unchanged directional cue covers part of the lower body, foreground walls occlude the explorer, and terrain seams persist. Compare with the existing static spike and concept references, without treating those scenes as gameplay. Independent QA, owner stature/outfit/gameplay review, physical iOS/Safari/PWA input and device performance remain separate gates. Owner must establish Meshy plan/input-image redistribution clearance before any public activation or screenshot publication. Do not merge or deploy this draft as part of this sprint.

## Author validation and remaining findings

Chrome 156.0.8078.49, Playwright 1.62.1, Node 26.12.1. See [validation.json](validation.json) for counts and limits. Both explorer matrices, pilot comparison, natural sizing, integrated input/camera/completion regressions, v2 compatibility, native-timer steering and production exclusion checks passed. All 163 Jest tests, six staging/middleware/audit tests and both three-case geometry/asset suites passed.

The broad default-production suite reports **103 passed, 42 skipped, two failed** in existing classic calendar-responsive tests: 1280px Play button overlaps navigation (723.75px bottom vs 717px nav top), reproduced on an untouched baseline build; 320px outside-maze swipe can activate Controls or fail its scrolling assertion, with an isolated baseline pass and a current isolated timeout at a modal-blocked D-pad tap. All main-bundle source modules match baseline except the lazy-chunk filename runtime; main CSS is identical. These are recorded for independent QA rather than changing unrelated calendar/input code. No full green regression claim is made.

The local four-facing resource measurement transfers character PNG payloads of 306,147 bytes pilot, 278,700 boy and 242,004 girl (resource transferSize including browser-reported overhead: 308,547 / 281,100 / 244,404). All sets have the same calculated 2,490,368-byte decoded RGBA footprint. This is not a physical-device memory or frame-rate benchmark. Local comparison sheets and individual gameplay captures are retained outside Git; the PR contains neutral textual evidence only.

The [QA correction record](qa-correction.md) supersedes the output-selection claim above and adds a controlled macOS/Chrome baseline/head comparison. It retains the original failures and independent QA caveats; it does not claim a green broad responsive suite.
