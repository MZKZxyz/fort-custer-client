# FC-VIS-03 camera contract and review evidence

Authority: [#32 kickoff](https://github.com/MZKZxyz/fort-custer-client/issues/32#issuecomment-6390387784), OD-02/03/21. Base: latest `main` fetched October 24, 2026, `3e25eacd82d10a40df2568c139629d313c9e665a` (merged VIS-02). Engineering + UX owns this change; Integrator reviews shared `MazePage`; independent QA must review the final PR SHA, Gameplay owns EG-09, Art owns proposed exports. This is author evidence, not independent signoff or release approval.

## Geometry and rendering

- `camera.js` is pure, DOM/React/asset independent, with half-open cell bounds. Existing rectangular grids and symbols remain authoritative. Scene `revealAll` exposes every object to the clipped renderer; default adapter behavior preserves radius-one fallback coverage. All cells remain mounted: no virtualization or hidden collision logic.
- Square CSS cell size `t = clamp(36px, (100vw − 36px) / N, 48px)`, configurable through `--camera-columns` (default N=8). Side allowance is 16px page gutters + 20px frame. Safe-area side padding reduces actual available width; physical notched-device evidence remains required.
- Content width = min(available inner width, columns × t, 960px). Height = min(rows × t, clamp(3t, 100svh − 380px, 560px)). The 380px reserve allows the banner/HUD/D-pad; wrapping and very short screens use ordinary page scrolling. HUD is outside the clipping frame. Navigation remains in the existing app shell. Small worlds shrink the frame instead of drawing fake floor/letterboxes.
- Measure actual `clientWidth/clientHeight` and cell bounding width after layout, including resize/ResizeObserver changes. Center `(column+.5,row+.5)` at viewport center, then clamp x/y to `[0, worldDimension − viewportDimension]`. Partially visible cells use floor/ceil with 1e−7px tolerance to suppress phantom boundary cells. Browser scrolling rounds fractional offsets; browser checks allow 1px rounding.
- Set internal `scrollLeft/scrollTop` in a layout effect before paint. Overflow clips only the finite world; no pointer/gesture interception, manual camera pan, new input repeat, or tween. Logical steps and camera updates are immediate under both motion preferences. No mist or perpetual animation exists on the new path. Successful saving opens results without the old fog-close delay; same-attempt recovery clearing still occurs immediately before navigation.
- Art coordination posted to [#30](https://github.com/MZKZxyz/fort-custer-client/issues/30#issuecomment-6390437584): logical centers and one-cell footprints agree with the proposed contract. No projection, sprite scale, anchors, candidate assets, or art-study files are adopted.

## Measurements and compact visual evidence

[Contact sheet](evidence/contact-sheet.png) contains the seven required initial viewports plus mid-grid and bottom-right edge. Actual Chromium output, synthetic fixture/current runtime textures, not approved new art. Border walls are also exercised by the trace fixture. Machine-readable measurements for [13×17](evidence/13x17.json) and [21×21](evidence/21x21.json) retain unrounded CSS measurements. Fractions below are viewport extent divided by cell size, not a count of fully visible cells; partial cells are intentionally visible.

| Viewport | Cell CSS px (w=h) | 13×17 content CSS px | Columns × rows | 21×21 columns × rows |
| --- | --- | --- | --- | --- |
| 320×568 | 36 | 284×188 | 7.8889 × 5.2222 | 7.8889 × 5.2222 |
| 375×667 | 42.375 | 339×287 | 8.0000 × 6.7729 | 8.0000 × 6.7729 |
| 390×844 | 44.25 | 354×464 | 8.0000 × 10.4859 | 8.0000 × 10.4859 |
| 412×915 | 47 | 376×535 | 8.0000 × 11.3830 | 8.0000 × 11.3830 |
| 844×390 | 48 | 808×144 | 16.8333 × 3.0000 | 16.8333 × 3.0000 |
| 1280×800 | 48 | 816×420 | 17.0000 × 8.7500 | 20.0000 × 8.7500 |
| 390×240 | 44.25 | 354×133 | 8.0000 × 3.0056 | 8.0000 × 3.0056 |

Portrait frames show 7.89–8 columns with 36–47px square cells and 24px object emoji. This passes the initial numerical target; physical-phone legibility is still an independent release check. The contact sheet uses scaled previews; inspect original-size browser output for final art evaluation. Landscape reveals more horizontal strategy while retaining three readable rows; 390×240 intentionally scrolls vertically to controls instead of compressing cells.

## Gameplay comparison / EG-09

[Actual before/after trace and rollback](evidence/trace-and-rollback.json), same 13×17 maze and inputs:

| Action | Position before and after | Equipment |
| --- | --- | --- |
| Start | [1,1] | empty |
| Up into wall | [1,1] | empty |
| Right onto X | [1,2] | extinguisher |
| Right into F | [1,2] | empty; fire removed |
| Right again | [1,3] | empty |
| Quit modal + Left | [1,3] | empty |

The camera reveals fire and goal at initial [1,1]; legacy radius-one conceals both. Legacy first reveals fire at [1,2] and goal at [1,3]. At 390×844 the initial camera reveals 88 intersecting cells versus 9 under radius-one. Interior, corner and screen-size differences expose different corridor branches, equipment locations and exit planning earlier. Larger screens may confer an information advantage; this PR does not invent a ranking correction. Gameplay must review representative real maze playtests/analyzer comparisons under **EG-09** before general enablement. Synthetic fixtures prove rendering/state behavior, not difficulty neutrality.

`movement.js`, API payloads, attempt generation, timer authority, result/reward code, immutable completion snapshots and recovery storage are unchanged. Existing tests retain keyboard/D-pad, single-slot pickup, stationary fire-clear, modal blocking, rapid mixed input, completion input freeze, failed save retry and refresh with the same attemptId. Only full-board/fog presentation assertions were replaced.

## Accessibility and performance limits

No camera animation under either preference, legacy fog animation disabled under reduced motion, native buttons retained, explicit focus-visible outlines, labeled equipment and fire hint, HUD text contrast improved to at least 4.93:1 against its darkest panel stop. Browser tests retain touch/mouse hit testing, page swipe scrolling, keyboard movement, focus retention and resize. Chromium CDP verifies page scale 1.5 is allowed; this is not a physical pinch test. No global touch prevention was added.

Known existing quit-dialog focus trap/restore defect is reserved for VIS-04; no dialog code changed. Nonvisual maze navigation, screen-reader announcements, actual device Safari/Firefox, notch/safe-area handling, manual text zoom and real-device performance/heat/battery are **not certified**. Independent EG-11 accessibility review and EG-08 device performance/owner art approval remain release gates. All mounted cells remain 221/441; this does not establish a need for another rendering engine.

Chromium 154.0.8037.57, shared cloud CPU, development React build, two browser workers (production build/other local checks also ran concurrently). Timing samples during edge traversal:

| Grid | rAF intervals | Median / worst interval ms | Key samples | Median / worst key-to-next-rAF ms |
| --- | --- | --- | --- | --- |
| 13x17 | 644 | 16.70 / 133.30 | 70 | 0.30 / 11.20 |
| 21x21 | 1059 | 33.40 / 333.30 | 100 | 0.30 / 35.10 |

These are observed rAF callbacks, not physical input-to-photon or GPU presentation measurements. The 21×21 run's 33.4ms median and 333.3ms worst interval are insufficient evidence for general release performance. No FPS/device signoff is claimed. Re-run production-build measurements on target hardware before closing EG-08; do not silently treat cloud contention or low key-to-rAF numbers as proof of acceptable responsiveness. No new animation or asset transfer is introduced; legacy textures remain in use.

## Local checks and reproduction

Original implementation local run (before the rollout correction below): **6 Jest suites / 39 tests passed**, production build compiled successfully, and **34/34 Playwright tests passed** in Chromium (including all 32 existing cases and 2 new camera cases). Both camera-enabled and flag-disabled unit runs pass 39 tests. Browser rollback/state comparison passed. Existing tests were not skipped. Original browser run and evidence use the original implementation runtime files; source/artifact hashes are recorded in [manifest](evidence/manifest.json).

```sh
# Ordinary build/test defaults to legacy.
CI=true npm test -- --watch=false --runInBand
npm run build
# Explicit camera preview/test opt-in (not authorization to enable production).
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true BROWSER=none HOST=127.0.0.1 PORT=3100 npm start
# Stop that preview server before using Playwright's managed server:
REACT_APP_MAZE_CAMERA=true CI=true PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
# Camera tests regenerate the single contact sheet and both measurement JSON files.
```

Browser APIs use synthetic local routes only; no production server or database access. Existing toolchain emits stale Browserslist and Node deprecation notices; dependencies and CI are unchanged.

## Reversible rollout and executed drill

The camera is enabled **only** by the exact build-time value `REACT_APP_MAZE_CAMERA=true`. Unset, `false`, empty, or malformed values retain VIS-02 whole-board DOM and radius-one mechanical fog in production and development. Ordinary `npm run build` therefore stays on legacy; camera previews require explicit opt-in. No deployment environment or CI configuration is changed by this PR. **Do not enable generally until pinned-SHA independent QA, EG-09 Gameplay/fairness and EG-08/11 device/accessibility evidence are accepted by Integrator/owner.** This is a build-time switch, so rebuild/restart is necessary; no storage/schema migration or new attempt is needed.

Executed fallback unit run: all 6 suites / 39 tests pass. Browser drill runs an explicitly opted-in camera on :3100 and an unset/false legacy build on :3101, then `node docs/viewport-camera/verify.cjs`. It verifies legacy fog exists, legacy board is exactly 374px wide at 390px viewport, and logical before/after traces match. Camera board is 752.25px wide inside a 354px content viewport. The legacy adapter and existing DOM gameplay/recovery tests remain. Reduced-motion disables legacy fog sweep as well.

The opt-in camera can be disabled by removing the flag (or setting `false`) and rebuilding. To remove this PR entirely, revert its rollout correction first, then its original implementation commit; do not deploy the intermediate default-on revision. Originally the cohesive implementation could be reverted with `git revert 0cc2b2c1553f1063dbbde3c49fc2c606bfa7e3fe` followed by the local checks above. No server change, data rollback, reward rewrite, recovery reset or asset rollback is involved. Revert removes camera/scene/presentation tests and evidence together while preserving merged VIS-02. No merge, deployment or GitHub CI polling is part of this handoff.


## Integrator rollout correction

Addresses [PR review](https://github.com/MZKZxyz/fort-custer-client/pull/39#pullrequestreview-5640486797) and [issue handoff](https://github.com/MZKZxyz/fort-custer-client/issues/32#issuecomment-6390660735). The sole runtime change is opt-in flag equality; camera geometry, gameplay and persistence are unchanged. Preview hosting must set `REACT_APP_MAZE_CAMERA=true` only in its explicitly approved preview environment; do not set a global/production flag before remaining gates are approved. Restart/rebuild after changing the flag; this is not a runtime URL or local-storage toggle.

Verification for this correction: full Jest suite passes **40/40** with flag unset, `true`, and `false`; the 12-test MazePage suite also passes with malformed `TRUE` selecting legacy. Both unset and explicit-true optimized production builds compile successfully. Chromium loads each compiled production bundle through local file-backed routes with synthetic API responses: unset has legacy fog/no viewport and 374px board; true has a viewport/no fog and 752.25px world; logical position/equipment traces match. See [production trace](evidence/rollout-production-trace.json) and [rollout manifest](evidence/rollout-manifest.json). No server or deployment configuration is changed.

The explicit-true preview browser regression run: **34/34 passed**, including geometry/resize/reduced-motion and all existing movement/recovery cases. The original contact sheet, geometry/timing JSON and manifest remain historical evidence at `0cc2b2c`; visual mechanics did not change in this correction. Independent QA, EG-09 and EG-08/11 remain open at the updated PR SHA.

Production-bundle verification can be reproduced without a running web server (the harness supplies compiled static files to Chromium and intercepts synthetic start responses):

```sh
env -u REACT_APP_MAZE_CAMERA BUILD_PATH=/tmp/vis03-optin-legacy npm run build
REACT_APP_MAZE_CAMERA=true BUILD_PATH=/tmp/vis03-optin-camera npm run build
node docs/viewport-camera/verify.cjs docs/viewport-camera/evidence/rollout-production-trace.json /tmp/vis03-optin-camera /tmp/vis03-optin-legacy
```

## Browser feature-mode correction

Addresses the [integrator follow-up](https://github.com/MZKZxyz/fort-custer-client/pull/39#issuecomment-6390794443). Browser expectations now use the same exact `REACT_APP_MAZE_CAMERA === 'true'` selection as the app. The production safeguard and all runtime files remain unchanged.

- Shared responsive cases assert legacy host/fog and absence of a camera viewport when disabled; opted-in cases assert viewport and absence of legacy host/fog. All route, touch scrolling, keyboard, D-pad, hit-target, modal and recovery assertions remain active in both modes.
- The board-sizing case retains the original legacy board formula `min(width − 16, 0.95 × width + 20)` and tile width `(board − 20) / 21`; when enabled it retains camera square-cell/world sizing expectations. All seven sizing/height cases run in both modes.
- Only the two camera geometry/evidence cases are explicitly skipped without opt-in. With exact `true`, both execute their complete existing geometry, visibility, resize and motion checks.
- The checked-in `.github/workflows/client-checks.yml` does **not** set the camera flag. Its default browser run therefore covers legacy mode, not opted-in camera geometry. No CI/workflow configuration was changed. Local camera coverage is recorded separately; this handoff makes no claim about the next GitHub CI result.

Local results: **unset: 32 browser cases passed, 2 camera-only cases skipped; true: 34 browser cases passed, 0 skipped**. All 32 shared functional/presentation cases execute in both modes. All **6 Jest suites / 40 tests passed in each mode**. The ordinary/unset production build compiled successfully. The full local browser runs each took 2.9 minutes. No runtime or CI files changed; the opt-in safeguard remains exact-true.

Exact local commands (run sequentially so each mode gets a fresh managed server; `CI=true` prevents reuse of a server from the other mode):

```sh
env -u REACT_APP_MAZE_CAMERA CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand
env -u REACT_APP_MAZE_CAMERA BUILD_PATH=/tmp/vis03-modes-legacy-build npm run build
env -u REACT_APP_MAZE_CAMERA CI=true PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
REACT_APP_MAZE_CAMERA=true CI=true PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
```

[Mode-check evidence](evidence/browser-mode-checks.json) records counts and source hashes. Existing contact sheet/measurement files remain historical visual evidence; this correction changes test selection/assertions only. Independent pinned-SHA QA, EG-09 and EG-08/11 gates remain open.
