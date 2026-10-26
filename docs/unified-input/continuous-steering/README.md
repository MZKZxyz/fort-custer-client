# Continuous cardinal steering — owner comparison prototype

**Historical steering baseline (`5c21a5e`):** the owner has selected cardinal snapping + trailing anchor as the preferred default. [The current timing correction](../turn-expiry/README.md) supersedes this record's strict 360ms expiry and its timing limitation. The remaining modes are validation comparisons. Baseline evidence below is preserved.

Continuation of draft PR #44 from `e14e0ca3375bb990c50d097818d27a3f83dce0da`. Implements [UX specification #33, comment 6404380667](https://github.com/MZKZxyz/fort-custer-client/issues/33#issuecomment-6404380667) and [engineering handoff #44, comment 6404404642](https://github.com/MZKZxyz/fort-custer-client/pull/44#issuecomment-6404404642).

The owner approved whole-maze dragging and the existing **400ms initial / 180ms repeat** cadence. The new snapping, buffer and anchor parameters are a reversible first playtest candidate. Independent pinned-SHA QA and owner playtesting are still required. The production visual flag remains default OFF; this is not ranked-production activation.

## Compare the three modes

Current builds require explicit `REACT_APP_MAZE_INPUT_PREVIEW=true` at build time to show this comparison selector. It defaults OFF; normal gameplay uses the owner-selected trailing mode. See [production UI cleanup](../production-ui/README.md).

The real maze route now has a keyboard-accessible **Drag steering** selector. It preserves the current attempt, position and equipment; changing it cancels the current gesture and all queued intent. Begin a fresh gesture after changing modes.

| Mode | Direction selection | Anchor | Turn anticipation |
| --- | --- | --- | --- |
| Original selector · fixed anchor | Existing 18px maximum-axis threshold and diagonal-neutral wedge | Original contact | Off |
| Cardinal snapping · fixed anchor | Four cardinal directions with 8° hysteresis and 12/18px neutral hysteresis | Original contact | On |
| Cardinal snapping · trailing anchor | Same cardinal selector | Bounded 48 CSS px trailing anchor | On |

Trailing is the prototype default. All three use the **same production controller and deadline scheduler**, including the corrected protected first-repeat delay. “Original” compares the old selector, anchor and lack of anticipation; it does not restore the old timer-reset/shortening flaw. No second controller or practice-only movement implementation was added. The existing isolated UX lab continues to re-export the production controller.

## Steering and scheduling contract

`dragSteering.js` contains pointer geometry only; `inputController.js` remains the one scheduler and drag-intent arbiter. `inputCoordinator.js` feeds ordered coalesced samples, then the final pointer position. Samples update intent; after the contact's first engagement they cannot directly issue another move or reset an active timer. All actual gameplay still goes through the existing canonical `movePlayer` / `move()` boundary.

- The 12/18px thresholds use the UX specification's explicit **maximum-axis footprint**: engage at `max(|dx|,|dy|) >= 18`; once engaged, neutral only below 12. Neutral clears control heading and pending intent. Re-engaging within the same contact receives no new immediate-step privilege.
- Outside neutral, exact cold diagonals choose the horizontal cardinal. A previously requested cardinal remains selected at angular distance **<=53°**; beyond 53° the nearest cardinal wins. Right→Down switches beyond 53°, Down→Right below 37°, with symmetric rotations. Reference the requested direction even when the committed heading is still forward. Reversals select the opposite directly.
- The trailing anchor starts at contact and moves only when a changed pointer sample exceeds **48px Euclidean distance**. It follows to a point 48px behind that sample. It never follows elapsed time, cells, successful turns, camera transforms or stationary samples, and is never clamped to viewport edges.
- Maintain one requested direction, committed travel heading and optional perpendicular turn. At the existing deadline, inspect only the requested adjacent tile and committed-forward adjacent tile on authoritative state. `inspectDirection()` is read-only; it performs no speculative `move()`, pickup, interaction, message or completion.
- An ordinary enterable requested side turns once. A blocked wall/bounds side can continue the established legal heading for at most **two forward translations**. Turn at the first eligible opening; at the third opportunity either turn or pause before a third forward translation. No T-junction chooses a side automatically, and no distant cells are scanned.
- The immutable time budget ends at **first eligible deadline +360ms**, inclusive. The first eligible deadline is recorded when intent is accepted, so delaying even the first evaluation cannot revive a stale request. The example remains **R@0, R@400, R@580, D@760**. A callback after expiry pauses without catch-up, even if a side is now open. Same-direction samples and hysteresis jitter cannot renew the budget; a distinct accepted direction or neutral/re-engage is required.
- Selecting forward cancels the queue. Reversal cancels it and attempts reverse at the eligible deadline, with no forward fallback. A different perpendicular selection replaces the one request. Already-legal explicit turns need no continuation buffer.
- Fire is never ordinary-enterable for anticipation. If an existing pending side or proposed continued-forward step encounters F, pause without spending equipment. A fresh explicit selection toward F still follows the established interaction: equipped clear stays stationary and terminal until release/fresh contact; unequipped fire blocks and permits redirection. Canonical X pickup and E completion remain unchanged.
- At most one canonical command runs per callback; a failed selected command cannot trigger a second fallback command. Steering never changes an active deadline. A paused session resumes at `max(protected next deadline, now+180ms)`. Generation invalidation and synchronous cancellation guards prevent stale callbacks or feedback reentrancy from re-arming movement.

The live status adds a heading/bent-turn cue and “Turn queued”, “Turn unavailable—steer again”, or a fire-boundary explanation. Repeated identical text does not introduce flashing, haptics or a route suggestion. Keyboard and D-pad remain exact-command inputs, with anticipation restricted to drag.

**Strict-time limitation:** the final two-cell opening is at the inclusive wall-clock deadline. Callback latency can make that final opportunity expire; this prototype adds no hidden grace interval or accelerated catch-up. Deterministic tests prove the exact boundary, and native-touch tests exercise a one-cell early request with ordinary browser timing. Physical-device timing/comfort, sampling sensitivity and whether these parameters need adjustment remain owner/QA playtest questions.

## Interactive before/after owner playtest

Use existing dependencies and a Chromium installation. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed. These are local optimized builds with intercepted synthetic APIs; no live account, backend or database is used.

```sh
REACT_APP_API_URL=/api BUILD_PATH=/tmp/fc-classic npm run build
REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true BUILD_PATH=/tmp/fc-integrated npm run build

FC_STEERING_PLAYTEST=true REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs e2e/continuous-steering.spec.js --grep '390×844.*two consecutive' --headed --workers=1 --timeout=0
```

The inspector pauses after setup; interact with the real maze while normal timers run. Stop the runner after manual play rather than resuming assertions from a changed fixture. Omit the visual flag and choose the classic build for comparison. Change the grep size for **320×568, 390×844, 844×390 or 1280×800**. For square camera, build with `REACT_APP_MAZE_CAMERA=true` and use that local build.

The practice fixture starts at one-based row 7, column 4. The first down opening is column 7, and the next left corridor is row 11. The goal is row 11, column 4. The top branch at the first junction must never be selected automatically.

1. Choose Original, drag Right, then sweep through a diagonal. Observe its pause. Choose either cardinal mode and repeat: 40–52° should hold Right; passing 53° chooses Down, which persists until below 37°. Deliberate reverse should select Left directly.
2. In each fixed-anchor mode, drag roughly 240px Right, then try a short perpendicular turn. Compare trailing mode: a roughly 64px perpendicular movement can change selection without returning across the full original displacement. Keep one contact through several requested corners; stationary holding must remain stable as the camera follows.
3. In the new modes, request Down before column 7. Observe “Turn queued” while the character continues the corridor, then the requested first opening. Request Left before row 11 for a second corner. Try too early, rapidly replace the side request, reverse, or return to neutral; a stale request must not find an opening later.
4. Reach X/F fixtures using the automated cases below: pending side/forward fire must not spend equipment. Deliberately select F again to clear; it must stay stationary and latch until release plus fresh contact. Verify arrival freezes input and creates one completion intent, with existing retry/recovery semantics.
5. Switch modes while holding, open/close Back, change focus, resize/rotate, add a second contact, cancel a pointer or switch renderer. No queued command may resume. Pinch remains browser-owned and one-finger maze dragging must not pan the page; scrolling from outside instructions/HUD remains available.

For a clean comparison, stop and restart the paused test to obtain a new synthetic browser context. Mode changes themselves deliberately preserve the current attempt/state. The synthetic completion responds with a save interruption so the ordinary error/retry flow remains visible. No practice reset action was added to production gameplay.

## Automated acceptance evidence

Current exact-source results and hashes are in [evidence/validation.json](evidence/validation.json). The suite covers 37°/53° edges, cold diagonal ties, rotated boundaries, 12/18px engagement, jitter, direct reversal, fixed/trailing long gestures at 1/8/64px sample spacing, unchanged samples, coalesced input, consecutive corners, first opening/two-cell expiry, signed T-junctions, dead ends, latest-intent replacement, pending-side/forward F with/without equipment, explicit stationary clearing, X/E, no double command on unexpected obstruction, late/stale callbacks and all interruption paths.

<!-- final-regression-results -->

| Final local check | Result |
| --- | --- |
| Jest, default / integrated / camera (each) | 94 passed, 10 suites |
| Shared controller Node regressions | 24 passed |
| Legacy UX lab browser regressions | 45 passed |
| Classic full regression | 93 passed / 23 explicit skips |
| Integrated regression | 80 passed / 5 explicit skips |
| Square-camera input/surface/camera regression | 62 passed / 8 explicit skips |
| Both flags, fallback cases | 11 passed / 0 explicit skips |
| Optimized classic / integrated / camera / both builds | All compiled; final runtime source maps match |
| Complete staged binary diff reverse-apply check | Passed; no rollback applied |

<!-- /final-regression-results -->

The original lab regression assertions now preserve the 400ms first-repeat delay after early steering changes; they no longer assert the old accidental 180ms shortening. This is a strengthened timing assertion, not removal of collision/cancellation coverage.

```sh
CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_VISUAL_INTEGRATION=true CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand
node docs/ux-interaction-lab/tests/controller.test.mjs
CI=true node_modules/.bin/playwright test --config=docs/ux-interaction-lab/playwright.config.cjs --workers=2
FC_ALL_REGRESSIONS=true FC_BUILD_DIR=/tmp/fc-classic node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --workers=2
REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --workers=2
```

Set `FC_STEERING_EVIDENCE_DIR` to regenerate queued-turn captures. They are **viewport screenshots during a held gesture**: full-page capture can resize the viewport and intentionally cancel input. Replay the [desktop consecutive-corner trace](evidence/desktop-corners-trace.zip) and [mobile touch trace](evidence/mobile-corner-trace.zip) with `node_modules/.bin/playwright show-trace <zip>`. Retained traces use repository-relative source references and no embedded test sources. The new steering cases always record traces; other regressions retain failures only to bound temporary disk use. Set `FC_TRACE_ALL=true` to record every case when sufficient space is available.

| Viewport | Classic queued turn | Integrated queued turn |
| --- | --- | --- |
| 320×568 | [PNG](evidence/classic-320x568-queued.png) | [PNG](evidence/integrated-320x568-queued.png) |
| 390×844 | [PNG](evidence/classic-390x844-queued.png) | [PNG](evidence/integrated-390x844-queued.png) |
| 844×390 | [PNG](evidence/classic-844x390-queued.png) | [PNG](evidence/integrated-844x390-queued.png) |
| 1280×800 | [PNG](evidence/classic-1280x800-queued.png) | [PNG](evidence/integrated-1280x800-queued.png) |

Current square-camera geometry and resize measurements: [13×17](evidence/camera-13x17.json) and [21×21](evidence/camera-21x21.json). The historical camera gallery is preserved.

## Release boundaries and rollback

**Independent QA and owner playtest are required on the new commit.** 8°, 12/18px, 48px, two cells and 360ms are first-candidate tuning parameters. Physical iOS Safari, installed iOS PWA, Android Chrome and installed Android PWA remain **NOT RUN** because no physical/remote device session was available. Chromium mouse/CDP emulation and dispatched lifecycle events do not certify real browser chrome, pull-to-refresh, pinch, OS interruptions, motor comfort, screen readers or device performance. Existing EG-08/09/11 and server timing/recovery limitations remain open; ranked logical-view equality is unchanged and unresolved. No WCAG/FPS or physical-device claim is made.

The visual flag stays exact-`true` opt-in and OFF by default; the old spelling remains inactive. Whole-maze capture, scoped `pinch-zoom`, normal outside scrolling, classic fallback, existing grids, attempt UUIDs, completion payloads and reward contracts are preserved. No deployment setting changed.

To roll back this steering prototype, revert its commit and rebuild to return to `e14e0ca`: whole-maze dragging with the former fixed-anchor selector and its disclosed timer-reset behavior. No schema/API migration or recovery-storage deletion is needed. Visual-only rollback can still unset the visual flag and rebuild; unset the independent camera flag too for full-grid/fog. A whole-PR rollback reverts commits latest first. Preserve pending `mazeCompletion:*` data and the existing backend completion contract.

After local validation, reverse-apply-check the complete change, commit/push to the existing PR #44 branch, update that draft and stop. Do not create another implementation PR, merge, deploy or wait for GitHub CI.
