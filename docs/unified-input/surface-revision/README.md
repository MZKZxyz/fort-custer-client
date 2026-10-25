# Owner revision — full-maze drag and mobile gesture stability

Continuation of draft PR #44 from initial integration `4fbfa3492e6459504e526e0b9222a1c52babfed6`. Client Engineering implements; independent QA and a second owner playtest are required. No production activation, merge, deployment or CI polling is authorized. The owner-approved **400ms initial delay / 180ms repeat** remains unchanged, as do the controller, dead zone (18px), axis ratio (1.25), and relative displacement from initial contact.

## What changed

The visible maze replaces the separate drag box. The classic full-grid renderer uses its actual `.maze-grid` element because the surrounding legacy host has `display: contents`. The square-camera fallback and integrated renderer use their clipped viewport elements. Each mode has exactly one focusable, labeled `data-maze-surface`, with visible drag instructions and keyboard/D-pad alternatives. A contact can begin on floor, wall, fog, sprite or a viewport edge. Merely touching does not move or teleport; displacement issues ordinary canonical directional commands.

The existing input coordinator delegates child hits to the stable surface and captures that element. React can replace cells/sprites and translate the camera without replacing the captured host or recomputing the original contact coordinates. Native image dragging is suppressed only on the game surface. Renderer fallback explicitly cancels the old owner, focuses the surviving D-pad and lets a fresh contact acquire the new classic surface. There is still one owner, one scheduler and one canonical `move()` boundary.

Scoped CSS applies **`touch-action: pinch-zoom` to the surface and all descendants**, with greater specificity than `.maze-page * { touch-action: auto }`. This reserves one-finger surface drags for gameplay and permits browser pinch zoom. The D-pad keeps its existing `manipulation` policy. The HUD, instructions and any page margin and other content retain ordinary browser scroll/zoom behavior. A gesture begun on the maze stays game-owned until release, even if the finger leaves the board; lift and begin outside the maze to scroll. No body positioning/overflow hack, document-wide touch cancellation, global overscroll/refresh suppression or viewport zoom limit was added.

One-finger downward gestures at page scroll position zero and with the maze aligned to the display's top edge must leave both document scroll and visual-viewport offset unchanged. Pinch is browser-owned: a second contact cancels movement; the existing viewport-resize/cancellation handling also applies during zoom. Pull-to-refresh/browser-chrome behavior on physical devices remains a release check, not something a headless page-scroll assertion can certify.

## Local evidence and interpretation

Current results and artifact/source hashes are in [evidence/validation.json](evidence/validation.json). The square-camera checks retain [13×17](evidence/camera-13x17.json) and [21×21](evidence/camera-21x21.json) geometry measurements here; earlier camera evidence is preserved. All application requests are synthetic interceptions. The browser matrix is Linux Chromium with desktop mouse and mobile CDP touch emulation at **320×568, 390×844, 844×390 and 1280×800**. It does not emulate Safari's rendering engine or an installed PWA.

| Local validation | Result |
| --- | --- |
| Jest: default / integrated / square camera | 59 passed in each mode, 9 suites |
| Unchanged controller invariants | 24 passed |
| Complete optimized classic regression | 62 passed / 22 explicit mode skips |
| Optimized integrated regression | 49 passed / 4 explicit mode skips |
| Square-camera surface/input/camera cases | 31 passed / 7 explicit mode skips |
| Both flags: captured/manual/image/chunk fallback | 7 passed |
| Optimized default / integrated / camera / both-flags builds | Compiled successfully; runtime source maps match current code |
| Complete owner-revision binary diff reverse-apply | Passed; no files reversed |

Mode skips are listed in the manifest: they cover renderer-specific assertions, integrated-to-classic fallback when starting in classic, and native-touch cases in the desktop mouse layout. They do not replace shared input/recovery checks.

The focused surface cases cover:

- Mouse and native CDP touch initiation on 14 locations: wall, explorer, equipment, fire, goal, center, four edges and four corners. Classic fog can hide an object; its underlying tile still accepts a gesture. Initiation asserts capture ownership, no tap-to-teleport, one discrete displacement-driven step, stable host identity and unchanged page offsets. Tests return to the initial cell with a fresh keyboard command between contacts.
- Capture retained through repeated movement, camera translations and rendering updates; turning uses displacement from the original screen contact. Neutrality, a dispatched window-blur event and an active-pointer resize stop movement. Release never issues another command.
- Downward drags at the top of the visible maze with page-at-top and maze-at-display-top framing. A second contact cancels the first owner; further movement and native pointer cancellation cannot restart it. Document and visual-viewport offsets remain stable before browser pinch begins.
- Browser pinch using two native emulated contacts with sufficient span. A separate plain-page positive control established that the narrower probe did not exceed Chromium's pinch threshold. The wider probe zoomed with `auto` and `pinch-zoom`, while `none` stayed at scale 1. The app test observes increased `visualViewport.scale` and no logical movement. This is engine emulation, not physical-device pinch signoff.
- Held-contact fallback to classic without a new attempt; fresh gestures work on the new surface. Both-flags-true fallback, missing artwork/chunk recovery, modal interruption, keyboard/Space/Enter/D-pad, stationary terminal fire clear, fresh-input entry, completion lockout, save retry/refresh, reduced motion and responsive regressions remain covered by the combined suite.
- Native page scrolling from hit-tested instruction content outside the maze still works and leaves the player stationary. No mechanical fog, camera, collision, reward, attempt or server-payload policy was changed by this revision.

Screenshots show the new surface controls with the redundant box removed. They are full-page captures at the named viewport width; short layouts can still scroll vertically.

| Viewport | Classic | Integrated |
| --- | --- | --- |
| 320×568 | [PNG](evidence/classic-320x568-surface.png) | [PNG](evidence/integrated-320x568-surface.png) |
| 390×844 | [PNG](evidence/classic-390x844-surface.png) | [PNG](evidence/integrated-390x844-surface.png) |
| 844×390 | [PNG](evidence/classic-844x390-surface.png) | [PNG](evidence/integrated-844x390-surface.png) |
| 1280×800 | [PNG](evidence/classic-1280x800-surface.png) | [PNG](evidence/integrated-1280x800-surface.png) |

Replay the [mobile gesture trace](evidence/mobile-gestures-trace.zip) or [desktop initiation trace](evidence/desktop-surface-trace.zip) with `node_modules/.bin/playwright show-trace <zip>`. Source references are repository-relative. Original initial-integration archives were likewise sanitized, without changing their actions/snapshots; their manifest records the new archive hashes.

## Reproduction and second owner playtest

Use the existing dependencies and a Chromium installation; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if required. Builds and the static host are local only.

```sh
CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_VISUAL_INTEGRATION=true CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand

REACT_APP_API_URL=/api BUILD_PATH=/tmp/fc-classic npm run build
REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true BUILD_PATH=/tmp/fc-integrated npm run build

FC_ALL_REGRESSIONS=true FC_BUILD_DIR=/tmp/fc-classic node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --workers=2
REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --workers=2
```

Set `FC_SURFACE_EVIDENCE_DIR` to regenerate surface screenshots. Traces are recorded locally for every case, with source embedding disabled; run `sanitize-traces.py INPUT OUTPUT` in this directory before publishing a retained archive. It removes absolute source references, preserves actions/snapshots/network records and updates source-resource lookup keys when present.

For interactive evaluation on a machine with a display:

```sh
FC_PLAYTEST=true REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs e2e/unified-input.spec.js --grep '390×844.*held keyboard' --headed --workers=1 --timeout=0
```

The test pauses after the synthetic maze loads; normal browser timers remain active. Play in the browser while the inspector is paused, then stop the runner. Change the grep size for the other layouts. Omit the visual flag and choose the classic build to compare renderers. Do not resume automated assertions after manually changing their starting fixture.

1. Start at center, each visible edge/corner, walls, sprites and fog. Touch/click without displacement must stay still. Drag to choose a direction; keep the original contact while the camera follows. Return to the initial contact point to pause. Release must stop immediately.
2. Drag into a wall, keep contact and redirect into a clear path. Repeat several times without lifting. Keep the approved cadence; no catch-up bursts or automatic wall sliding.
3. Collect X and hold toward F. Clearing must consume equipment while stationary. Steer away/back while still held: no entry. Release and deliberately start again to enter.
4. On mobile, start a downward drag near the top of the visible maze with the page at its top, then repeat after scrolling the maze to the display's top edge. Observe document position, browser chrome and refresh behavior. Drag outside the maze to confirm normal page scrolling remains available.
5. Pinch over the maze and outside it. Add a second contact during movement, switch apps, open browser UI, rotate, resize, cancel a pointer, open/close Back and select classic fallback. Old input must not resume. Verify keyboard/D-pad, focus return, completion and retry/refresh recovery.

## Physical-device matrix and remaining gates

No attached physical device, iOS simulator/remote Safari session, Android device bridge or installed mobile PWA test environment was available in this cloud workspace. These are explicit **NOT RUN**, not emulated passes:

| Target | Required independent QA / owner evidence |
| --- | --- |
| iOS Safari | Real one-finger up/down at page/display top, rubber-band/pull-to-refresh/browser chrome, pinch, touch cancellation and app switching |
| Installed iOS PWA | Same gestures in standalone display mode, safe areas, OS interruptions and recovery |
| Android Chrome | Real pull-to-refresh, pinch, browser chrome, multi-touch/cancel and app switching |
| Installed Android PWA | Standalone gestures/refresh behavior, navigation/OS interruptions and recovery |

**EG-08/09/11 remain open.** Owner/Art scene approval, physical-device performance/readability, ranked logical-view equality/version policy, fog-removal difficulty, Safari/Firefox, screen readers/touch exploration and full accessibility review are not supplied by these local checks. Input cadence is owner-approved; gesture stability on actual device/browser/PWA combinations still needs independent QA and the second owner playtest. Daylight-only art, existing tipi lighting/projection mismatch, short-screen scrolling and existing EG-01 server timing remain unchanged limitations. No ranked production activation is allowed.

## Flags and reversible rollback

`REACT_APP_MAZE_VISUAL_INTEGRATION` remains exact-`true` opt-in and OFF by default; the old `REACT_APP_MAZE_VISUALS` spelling does not activate it. `REACT_APP_MAZE_CAMERA` remains independent. No deployment configuration or production setting changed.

- **Current attempt:** Use classic view cancels the old contact and keeps the same attempt, grid and equipment; begin a fresh gesture on the classic maze. This retains the revised input policy.
- **Surface-only rollback:** revert the owner-revision commit and rebuild to restore the initial integration `4fbfa34`, including its separate drag box. No controller cadence, data/API or recovery migration is needed. The initial box's ergonomics remain a known limitation of that rollback.
- **Visual rollback:** unset the visual flag and rebuild; also unset the camera flag for legacy full-grid/fog. This keeps the revised surface input behavior.
- **Whole PR rollback:** revert PR commits latest first and rebuild. Keep the existing backend completion contract and pending `mazeCompletion:*` storage available. No historical attempts, rewards or grids are rewritten.

The complete owner-revision diff must pass a reverse-apply check before handoff. After local validation: commit, push, update existing draft PR #44 and stop. Independent QA and the second owner playtest remain required; do not merge, deploy or wait for GitHub CI.
