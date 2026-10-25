> Sprint 1.2 continuation: the current runtime flag is `REACT_APP_MAZE_VISUAL_INTEGRATION` (exact `true`, default off). The former `REACT_APP_MAZE_VISUALS` spelling no longer activates sprites. See [unified input integration](../unified-input/README.md) for current controls, arrival treatment, tests and rollback. Evidence below records the earlier renderer-only baseline.

# FC-VIS-04 · Daily-maze production-route integration

Sprint 1.1 engineering implementation for client issue #33. Base: `9d48caf` (merged 58° pilot #40, camera #39 and owner reference library #42). This is a default-off review candidate. Independent QA, integrator review and owner activation approval are required. The broader VIS-04 issue remains open.

## Play the actual route

Use the existing local API/account setup and normal React app, with one explicit build-time opt-in:

```sh
REACT_APP_MAZE_VISUALS=true BROWSER=none npm start
```

Choose a daily maze and open `/maze` through the normal app. This starts a real attempt against the configured backend and saves through the existing completion API. Use a local/test backend for review. No fixture route, demo account, storage override or synthetic network hook is included in runtime code.

Only the exact string `true` enables the integration. Unset, `false`, `TRUE` and `1` retain classic rendering. The separate `REACT_APP_MAZE_CAMERA=true` foundation flag keeps its existing square-camera behavior when sprite integration is off. If both are true, the sprite renderer takes precedence; “Use classic view” returns to the square-camera foundation. Otherwise it returns to the original full-grid/fog view. The fallback preserves the same current grid, position, equipment, timer and attempt, including a cleared fire; it does not reload or POST start.

## Boundaries and reference inventory

- `MazePage` retains all API calls, attempt IDs, timer display, completion intent, retries, result persistence and navigation. `movement.js`, `scene.js`, `camera.js`, results code and server files are unchanged. Rendering receives only the immutable scene, heading and a presentation fallback callback.
- `PalletMaze` is a memoized React/CSS renderer loaded on demand. It uses the pilot's native 58° ground/foot anchors, projected pitch `sin(58°)`, separate shadows and shared row-depth body ordering. Fractional world translation follows/clamps to the player. Square logical collision cells are untouched. Required S/X/F cues sit above bodies; no visible E/finish badge or provisional exit sprite is rendered.
- The 15 daylight PNGs in `src/assets/pallet-garden/` are byte-identical copies from the merged pilot, tested against its original `docs/visual-integration/assets/manifest.json`. Ground, wall, extinguisher, fire and four explorer facings reuse the original procedural-source provenance and contribution terms. Runtime uses hashed app assets, never a `/docs` dependency. The default route does not request the sprite kit; build artifacts may retain an unused lazy chunk.
- The single tipi directly reuses original `public/images/teepee_01.png` (300×300 RGBA), centered with its base at the projected goal cell. The file and the other eight tipi images are unchanged. Its baked contact shadow is retained without an added pilot exit shadow. No art was generated or redesigned. Its existing camera/lighting differ from the pilot; final stylistic matching remains Art review work.
- Inspected actual references: merged pilot exports/source/README, refined 58° scene, owner reference library contact sheet and current art-reference-pack guidance, and original tipi artwork. Concepts are visual references, never collision maps. Daylight is the bounded engineering integration; lantern/dusk polish and collectible changes remain deferred.

## Interface for PR #41

The current keyboard and native accessible D-pad buttons invoke `movePlayer(direction)`. It synchronously reads and commits canonical `move()` through `gameRef`, then returns `{reason, terminal, message}`. Reasons match the UX lab vocabulary: `step`, `obstruction`, `fire blocked`, `fire cleared`, `complete`, plus shell-only `inactive` while loading, in a modal or finished. Only `step` is nonterminal. `commandOutcome` derives these values from the canonical before/after result and does not own gameplay or scheduling. Successful fire clearing returns `fire cleared` while position remains unchanged; a later command enters that tile.

The future controller may bind its `command` to this callback and cancel on shell inactivity/unmount. It remains responsible for pointer ownership, repeat timing, pause-on-obstruction for drag, release/cancel/blur/resize, and the terminal fire-clear latch. The `terminal` result is an observation for that controller, not an implementation of its drag policy. No UX branch, controller, timing defaults or lab file is imported/copied/edited. Continuous touch hold/drag is deliberately deferred to the revised, independently reviewed PR #41. Existing discrete clicks and native keyboard-repeat behavior remain; this PR does not claim that holding a key has the future controller's fire-clear latch.

Native quit/save-error dialogs make background controls inert, cycle Tab/Shift+Tab, contain focus and restore it on close. Quit Escape cancels without movement; save-error Escape preserves recovery until Retry or Back. Reduced-motion behavior from the camera foundation remains and the sprite renderer adds no animation. Visible position/neighbors, equipment status and movement feedback supplement decorative sprites; this is not a certified nonvisual maze experience.

## Reproduce local validation

Existing dependencies and `/usr/bin/chromium` are used; no new package or CI configuration is required.

```sh
CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_VISUALS=true CI=true npm test -- --watch=false --runInBand
REACT_APP_API_URL=/api BUILD_PATH=/tmp/fort-custer-legacy npm run build
REACT_APP_MAZE_VISUALS=true REACT_APP_API_URL=/api BUILD_PATH=/tmp/fort-custer-integrated npm run build
CI=true PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
# Optimized flagged route, synthetic intercepted API, plus existing recovery suite:
REACT_APP_MAZE_VISUALS=true FC_BUILD_DIR=/tmp/fort-custer-integrated FC_EVIDENCE_DIR=docs/production-integration/evidence node_modules/.bin/playwright test --config=docs/production-integration/playwright.config.cjs --workers=2
# Optimized default route, activation safeguard and comparison captures:
FC_BUILD_DIR=/tmp/fort-custer-legacy FC_EVIDENCE_DIR=docs/production-integration/evidence node_modules/.bin/playwright test --config=docs/production-integration/playwright.config.cjs --workers=2
```

The small static server/config only serves an already-built app on loopback for tests. Browser fixtures intercept synthetic APIs on the actual `/maze` route. They cover collision, touch/keyboard parity, single equipment slot, stationary clear, terminal completion, unchanged completion request, retry/refresh with the same UUID, modal interruption/focus, same-attempt fallback, failed PNG/chunk fallback, image identity/decoding, responsive camera bounds, enlarged text and reduced motion. Pure geometry tests exhaust all cells of 13×17 and 21×21 at four clip sizes. Existing mode-specific presentation assertions remain active; integrated-only cases explicitly skip without opt-in.

Local results: **44/44 unit tests in each of default, square-camera and integrated modes**; both optimized builds compiled. Existing browser coverage: **32 legacy shared cases passed** (two camera-only cases skipped), **34 square-camera cases passed**. Optimized route coverage: **16 integrated cases passed** (one default-only case skipped), **4 default cases passed** (13 opt-in cases skipped). Final focused dialog/camera checks passed **2/2**, and the strengthened integrated shell unit suite passed **12/12**. Default builds do not request daylight sprites. Integration-specific skips are explicit and do not replace shared regressions.

## Evidence and limitations

Captures use optimized Chromium with synthetic APIs on `/maze`. Each pair shows the same 13×17 state immediately after stationary fire clearing. The app clock is real, so elapsed labels differ. No production data or external account is used in automated checks.

| Viewport | Integrated 58° | Classic comparison |
| --- | --- | --- |
| 320×568 | [PNG](evidence/320x568-cleared.png) | [PNG](evidence/320x568-classic.png) |
| 390×844 | [PNG](evidence/390x844-cleared.png) | [PNG](evidence/390x844-classic.png) |
| 844×390 | [PNG](evidence/844x390-cleared.png) | [PNG](evidence/844x390-classic.png) |
| 1280×800 | [PNG](evidence/1280x800-cleared.png) | [PNG](evidence/1280x800-classic.png) |

See [validation manifest](evidence/validation.json) for local counts, tool versions and source/artifact hashes; [geometry](evidence/geometry.json) records actual edge-camera bounds. Evidence is author validation, not independent signoff.

**Activation gates:** EG-09 remains open: adaptive dimensions plus the 0.848048 projected row pitch reveal different logical areas across screens (about 17.918% more rows than square geometry at equal clip height, before padding/clamps). This PR does not choose/version equal ranked visibility, reclassify attempts or change server requests. Do not activate this preview against production/ranked play until Gameplay/owner policy and QA approval. EG-01 timing remains unchanged: lazy artwork/loading can add time after the server's start timestamp; no ready/playable handshake is introduced.

**Still unverified:** independent pinned-SHA QA; owner integrated visual acceptance and tipi recognition; named physical-device readability/performance/heat/battery; Safari/Firefox; screen readers/touch exploration, physical pinch/zoom and motor/cognitive usability (EG-08/11). Chromium touch, text enlargement and resize evidence are narrower than those gates. No FPS, physical latency or WCAG certification claim. The renderer paints the full logical world; grids larger than the tested 21×21 and their DOM/memory costs are unverified. Original tipi lighting/projection is an acknowledged placeholder mismatch. Dusk is not integrated. Dependency installation and live-server integration were not tested. Existing Browserslist/Node/dev-server notices remain.

## Rollback

For immediate review rollback, select **Use classic view**. This also works after an image fails; a failed renderer chunk presents the same fallback action through an error boundary. Current gameplay state stays in `MazePage`.

For build rollback, remove/unset `REACT_APP_MAZE_VISUALS` and rebuild using the existing deployment process only after its separate authorization. To restore the original full-grid experience, leave `REACT_APP_MAZE_CAMERA` unset as well. There is no localStorage/cookie/query activation override. Browser refresh follows the pre-existing attempt/recovery rules, so prefer the in-page fallback during a live attempt.

To remove the engineering integration entirely, revert this PR's integration commit. No server/data/schema/reward migration, attempt reset, storage cleanup, secret, dependency or deployment-setting change is needed. Independent QA and the owner must approve production activation; this delivery stops after local validation, commit/push and draft PR update, with no CI polling, merge or deployment.
