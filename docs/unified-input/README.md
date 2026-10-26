# Sprint 1.2 — unified input and gameplay integration

**Current correction:** [Bounded turn expiry with callback tolerance](turn-expiry/README.md) addresses independent QA's two-cell timing P2. The owner-selected cardinal snapping + trailing anchor remains the default; comparison modes remain for validation. Use the correction's timing results, validation record and rollback instructions for the latest revision.

**Steering baseline (`5c21a5e`):** [Continuous cardinal steering, anticipated turns and trailing-anchor comparison](continuous-steering/README.md). Its strict 360ms expiry is superseded by the current correction; geometry and approved cadence are preserved.

**Gesture-policy baseline (`e14e0ca`):** [Full-maze drag and mobile gesture stability](surface-revision/README.md). The owner-approved 400ms/180ms cadence is unchanged. The visible maze now owns drag gestures; the dedicated box is removed. New evidence and physical-device gaps are recorded in the linked revision.

Draft implementation for FC-VIS-04 / #33. **Default OFF; no ranked production activation.** Independent QA and owner review are required on this combined revision. Client Engineering owns implementation; Integrator coordinates shared MazePage/completion review; independent QA, Gameplay and Art/owner own their respective activation evidence. Author checks below are not independent signoff.

## Baseline and authority

Started from current `main` **c4803f2d307abc4ce5c78dc2ff8bd3267abbf770** after fetching. It contains merged UX PR #41 (`9430219`) and renderer PR #43 (`c4803f2`). Independent baselines:

- [UX QA](https://github.com/MZKZxyz/fort-custer-client/pull/41#issuecomment-6402536153): reviewed `088e65c3c709cf343608ae8b72a455d69f513d56`, PASS for isolated lab; wall redirection keeps pointer ownership, successful fire clearing remains terminal.
- [Renderer QA](https://github.com/MZKZxyz/fort-custer-client/pull/43#issuecomment-6402536931): reviewed `d929a9a0ba2c50a5f0b0a6b1f97c5d5c8047ee7d`, PASS WITH CONDITIONS for default-off integration. Native keyboard repeat lacked fresh-press protection; explorer obscured the tipi on arrival. Neither baseline certifies the combined app.

[Approved OD-01–04/20–22](../design/decisions.md), [spec reconciliation](../design/spec-reconciliation-map.md), [engineering gates](../planning/engineering-gates.md) and the live issue govern this scope. Archived domain 01/05/06 contracts provide reconciled context, not new release authorization. This scoped implementation follows the Sprint 1.2 assignment; historical issue text restricting the earlier lab does not authorize deployment.

## Runtime contract

`src/game/inputController.js` is the extracted reviewed scheduler: immediate first atomic command, 400ms initial delay, 180ms repeats, bounded timing, owner token, timer invalidation and drag-only collision pause. The current prototype adds deadline-preserving cardinal steering and bounded turn arbitration; the original selector remains an interactive comparison. It now also ignores command returns after synchronous shell cancellation. The lab's former controller re-exports this module; there is one implementation and no runtime import from `docs/`.

`src/game/inputCoordinator.js` binds keyboard arrows, Space/Enter on semantic D-pad buttons, mouse/touch/pen D-pad holds, the visible maze surface, and non-pointer assistive activation to that scheduler. Pointer clicks are never translated into a second command. Native key repeat does not drive movement. The page supplies the existing synchronous `movePlayer`/canonical `move()` boundary, commits gameRef before subsequent input, and retains completion/save ownership. `commandOutcome` remains the common outcome classifier.

- Wall/boundary/unequipped fire pauses drag with no retry timer. Keep the same contact and choose a different cardinal direction to resume after 180ms. No wall sliding. The original comparison uses the <18px dead zone and ambiguous-diagonal pause; current prototype thresholds and hysteresis are documented in the linked steering contract. Repeating the unchanged blocked direction does nothing.
- X equips the existing single slot. Successful F clear consumes it while stationary and halts the held session. Neither steering nor native keyboard repeat can enter F until release + fresh press. Completion is terminal and still calls the existing completion handler exactly once per arrival; an explicit save retry is a separate intentional request using the same attempt ID.
- Only one input owner runs at once. Release, cancel, lost capture, extra pointers, focus loss, blur, hidden document, resize/orientation/visual viewport resize, pagehide, modal, completion, fallback and unmount invalidate movement. Cancellation does not resume an old native key repeat.
- The page retains normal browser scrolling outside the board. Maze surfaces and descendants use scoped `touch-action: pinch-zoom` to reserve one-finger drags for gameplay and allow browser pinch zoom; the D-pad retains `manipulation`. Arrow keys remain available on initial page load/body and inside the maze shell, without taking them from forms, dialogs or unrelated navigation.
- Quit/save dialogs retain focus containment/return. Fallback cancels input, focuses the surviving D-pad, and preserves the attempt, position, grid and equipment. Classic fog, square-camera fallback, reduced motion, server requests, rewards and recovery remain on existing contracts.

The integrated arrival composition omits the explorer body/shadow on E, retaining a small directional cue below the intact original tipi. No asset pixels, grid cells, goal rules or projection constants changed.

## Flag and rollback

The sole sprite activation flag is now **`REACT_APP_MAZE_VISUAL_INTEGRATION=true`**, matching the Sprint 1.2 contract. Exact lowercase `true` is required. Unset, false or malformed values keep classic rendering. The old renderer-preview spelling `REACT_APP_MAZE_VISUALS` no longer activates sprites; it is not an alternate bypass. No environment/deployment configuration is changed by this PR. `REACT_APP_MAZE_CAMERA` remains a separate opt-in.

1. **Current attempt:** select **Use classic view**. Input stops, focus moves to the surviving control, and the same cleared grid/equipment/attempt continues. This retains the unified input coordinator.
2. **Visual build rollback:** unset `REACT_APP_MAZE_VISUAL_INTEGRATION` and rebuild. Also unset `REACT_APP_MAZE_CAMERA` to restore full-grid/fog instead of square camera. This retains unified input.
3. **Full input/visual rollback:** revert this PR's commits in reverse order (the turn-expiry correction, the continuous-steering revision, the owner surface revision, then the initial integration) and rebuild. That restores the merged PR #41/#43 baseline, including its disclosed native-repeat fire limitation and old preview flag spelling. Do not enable the old visual flag for ranked play. No schema, API, attempt, stored grid or reward migration is needed. Do not clear pending `mazeCompletion:*` storage; keep the existing backend completion contract available for retries.

Rollback checks: default build browser assertion requests no sprite kit; manual, missing-image and failed-chunk fallback preserve attempts; reverse application of the complete commit diff must pass before handoff. No rollback is deployed by this work.

## Initial integration validation and interactive owner playtest

The result table and screenshot/trace links below record initial integration `4fbfa34`. Use the [owner revision evidence](surface-revision/README.md) for the current surface controls. Historical trace source references have been made repository-relative; original actions and snapshots are retained.

| Local check | Result |
| --- | --- |
| Jest: default / square camera / integrated | 58 passed in each mode (9 suites) |
| Malformed new flag `TRUE` + old flag `true` | 12 MazePage tests passed; remains classic |
| Extracted controller invariants | 24 passed |
| Original UX lab browser coverage | 45 passed |
| Full optimized classic browser regression | 48 passed / 16 explicit mode skips |
| Optimized integrated browser suite | 31 passed / 2 explicit mode skips |
| Both presentation flags true: manual/image/chunk fallback | 3 passed |
| Optimized default / integrated / both-flags builds | Compiled successfully; current runtime source verified against source maps |
| Complete staged binary diff reverse-apply | Passed; no working files were reversed |

Classic skips: 13 opt-in renderer cases, 2 square-camera-only cases and 1 desktop touch-only case. Integrated skips: default-build assertion and desktop touch-only case. No skips hide a shared input, fire, completion or recovery requirement. The default suite also exercises calendar/account/navigation sizing. The local static host now serves `/` as well as deep routes; the native page-scroll probe explicitly swipes outside the maze surface and asserts no player movement.

Use existing dependencies (`npm ci` if needed) and a Chromium installation. All browser scenarios use synthetic intercepted APIs; no account, live backend or database is required. Browser evidence is headless Chromium with native mouse/keyboard/CDP touch events, not physical-device or Safari certification.

```sh
CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_VISUAL_INTEGRATION=true CI=true npm test -- --watch=false --runInBand
node docs/ux-interaction-lab/tests/controller.test.mjs

# Local optimized builds only; these commands do not deploy.
REACT_APP_API_URL=/api BUILD_PATH=/tmp/fc-classic npm run build
REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true BUILD_PATH=/tmp/fc-integrated npm run build

FC_BUILD_DIR=/tmp/fc-classic FC_ALL_REGRESSIONS=true node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --workers=2
REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --workers=2
CI=true node_modules/.bin/playwright test --config=docs/ux-interaction-lab/playwright.config.cjs --workers=2
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if Chromium is not `/usr/bin/chromium`. Set `FC_EVIDENCE_DIR` to regenerate screenshots. The new focused scenarios freeze the browser clock, then advance it across 400/180ms boundaries; native CDP touch, existing renderer/recovery and lab tests retain wall-clock interaction coverage. Traces are recorded for every combined test. Release-time, stalled-owner and timer assertions are deterministic; no FPS/latency claim follows.

For **interactive local evaluation**, run on a machine with a display:

```sh
FC_PLAYTEST=true REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs e2e/unified-input.spec.js --grep '390×844.*held keyboard' --headed --workers=1 --timeout=0
```

The test pauses in Playwright Inspector after synthetic `/maze` setup; the browser remains interactive with normal timers in this manual mode. Inspect at 320×568, 390×844, 844×390 and 1280×800 by changing the grep size; omit the visual flag and choose the classic build for comparison. Stop the runner after manual play; continuing the automation after changing its fixture state is not a regression result. All data is synthetic. A completion intentionally stays pending until the existing 15-second timeout so arrival remains visible; the separate recovery cases simulate failed saves and retry/refresh.

Playtest sequence:

1. Hold Right: collect X, then clear F without moving. Keep holding, steer away/back, or generate native repeat: position must stay at column 3 (one-based). Release + fresh Right enters column 4.
2. Anywhere on the maze, steer Up into the boundary wall. Keep contact; observe BLOCKED. Steer Down to resume, return to center/diagonal to pause, then release. Repeat wall hits must never accumulate catch-up steps.
3. Use D-pad taps/holds, arrows, Space/Enter and programmatic/assistive activation. While holding, open Back, press Escape to close, resize, change focus, or select classic view. No old input may resume. Tab/Shift+Tab must stay inside the dialog and return to its opener.
4. Move Right along row 2 to column 8 (E). The tipi must remain recognizable, movement must stop, and only one completion request should be present. Repeat with the recovery test's failed-response fixture to verify retry + refresh reuses the same UUID.
5. Scroll outside the maze surface, enlarge text to 200%, enable reduced motion and rotate/resize. Controls must remain reachable without horizontal page overflow. Check camera edges with the existing 13×17/21×21 fixture scenarios; missing-image/chunk scenarios must offer classic fallback.

Recorded results and hashes: [validation.json](evidence/validation.json). Screenshots are full-page captures at the named viewport size; their image height can exceed the viewport because short layouts scroll. Representative arrival comparisons:

| Viewport | Integrated arrival | Classic arrival |
| --- | --- | --- |
| 320×568 | [PNG](evidence/integrated-320x568-arrival.png) | [PNG](evidence/classic-320x568-arrival.png) |
| 390×844 | [PNG](evidence/integrated-390x844-arrival.png) | [PNG](evidence/classic-390x844-arrival.png) |
| 844×390 | [PNG](evidence/integrated-844x390-arrival.png) | [PNG](evidence/classic-844x390-arrival.png) |
| 1280×800 | [PNG](evidence/integrated-1280x800-arrival.png) | [PNG](evidence/classic-1280x800-arrival.png) |

Replay the retained [mobile trace](evidence/integrated-mobile-trace.zip) or [desktop trace](evidence/integrated-desktop-trace.zip) with `node_modules/.bin/playwright show-trace <zip>`. They include interactive DOM snapshots and the synthetic request sequence; they are not hosted deployments.

## Unresolved activation gates and limitations

- **EG-08:** owner/Art must review integrated arrival treatment, real-device readability/performance, arbitrary-grid occlusion and final representative scene. Original tipi projection/lighting mismatch remains; daylight only, dusk and lantern polish remain unimplemented. Omitting the explorer on E is a bounded arrival treatment pending visual approval.
- **EG-09:** adaptive physical extents and 58° row pitch still reveal unequal logical tactical windows. QA measured about 17.918% more projected rows than square at equal height before clamps. Gameplay/owner must settle ranked equal-view geometry/version policy, fog-removal difficulty and representative-maze/analyzer evidence. **Do not enable ranked production gameplay.**
- **EG-11:** physical iOS/Android, Safari/Firefox, screen readers/touch exploration, physical pinch/browser chrome/OS interruptions, contrast audit and motor/cognitive usability remain unverified. No WCAG AA certification. Short layouts require scrolling between board, feedback and controls; simultaneous board/control visibility and drag ergonomics need owner/device evaluation. Keyboard and D-pad remain usable as alternatives to maze dragging.
- **EG-07:** the owner has approved the 400ms initial delay and 180ms repeat cadence. Physical gesture stability and usability still require device evaluation. Synchronous ownership and interaction safety are tested; physical comfort/scheme selection remains open.
- **EG-01 / persistence:** server timing starts on its existing contract; lazy artwork may add measured-attempt latency. Payloads, reward semantics and client recovery are unchanged; no live-server or database concurrency certification is claimed. Existing recovery/backend rollout restrictions continue to apply.

Independent QA must reproduce the combined revision and inspect native-size arrival PNGs, held fire sessions, recovery and fallback. Owner review must evaluate movement feel and integrated composition. Neither approval is supplied by this implementation PR. After local validation: commit, push, update the draft PR and stop; no GitHub CI polling, merge, deploy or production-setting changes.
