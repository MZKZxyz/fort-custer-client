# FC-VIS-02 scene boundary and rollback

Scope authority: [#31 and Sprint 1 kickoff](https://github.com/MZKZxyz/fort-custer-client/issues/31#issuecomment-6390145647).
Baseline: client `main` at `a9394631661a9e654bb3cb9b9e6dbce14b9491fa`, refreshed before work on October 24, 2026.
Engineering owns this adapter and the presentation-only `MazePage.js` wiring;
Art owns `docs/art/reference-scene/**`. Integrator review and independent QA-01
[#35](https://github.com/MZKZxyz/fort-custer-client/issues/35) signoff are pending.
This document is implementation evidence, not independent approval.

## Contract

`src/game/scene.js` contains two pure functions with no React, DOM, clock,
storage, API, asset or movement dependencies. Inputs are read-only caller-owned
values; projection neither mutates nor freezes them. Outputs are detached,
recursively frozen records/arrays. No mutable gameplay reference or callback
crosses the boundary. Inputs use the existing rectangular character grid and
primitive UI values; this is not a new level parser or server response validator.

| Function / field | Contract |
| --- | --- |
| `createMazeScene(state, { visionRadius = 1 })` | Accepts `grid`, `[row, column]` position, equipment array and completed boolean. Geometry is memoized separately from HUD timer updates. |
| `rows[r][c]` | Stable `row-column` ID, integer row/column, unchanged tile symbol, `wall`/`floor` terrain, `extinguisher`/`fire`/`exit` object or null, player occupancy, current square-radius visibility. Player occupancy and underlying object coexist; DOM preserves player-first display. |
| `player`, `equipment`, `completed` | Logical row/column; one extinguisher or null; display-only completion flag. No additional slot or expedition rules. |
| `camera` | Grid row/column bounds, player cell-center focus, corresponding x/y percentages, and existing visibility radius/percentage. No viewport clamp, zoom, pixel scale, projection or asset anchor policy. |
| `createMazeViewModel(scene, ui)` | Reuses the immutable scene. Copies scalar date/timer labels, equipment, fire hint, quit modal, finished/closing/error display and current fog animation radius into frozen HUD/UI/effect records. |

`MazePage.js` retains the renderer, goal-image selection, CSS, effects, input
handlers, synchronous gameplay ref, `move()` calls, attempt ID, completion POST,
result persistence, retries and recovery. Its shared-file changes replace only
derived cell/visibility, fog-coordinate and HUD/overlay reads with model reads.
`src/game/movement.js` and all existing test files are unchanged.

OD-01 is implemented as a reversible boundary on the current default DOM path.
OD-02/03 camera/visibility changes belong to VIS-03: radius-one visibility and
mechanical fog deliberately remain exactly as scoped by this kickoff. OD-13
does not introduce expeditions. Art scale, projection and anchors remain open
under EG-08 and VIS-01; this logical coordinate contract requires no new art
decision. EG-07/09/11 integration, real-device performance/accessibility, and
independent QA remain later gates. Server EG-01–06 are unaffected.

## Local validation

Run from the client repository:

```sh
CI=true npm test -- --watch=false --runInBand
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
```

- Jest: 5 suites, 34 tests passed, including new adapter coverage at 13 rows ×
  17 columns and 21 rows × 21 columns. Covers every border/cell/object,
  `S/#/X/F/E`, single equipment slot, stationary fire clearing, completion,
  deterministic projection, empty loading/recovery grid and deep immutability.
  Existing movement, keyboard/D-pad and completion retry/refresh tests pass.
- Production build: passed. Toolchain reports stale Browserslist data and Node
  deprecation notices; no dependency or toolchain changes were made.
- Playwright: all 32 existing tests passed in Chromium 154.0.8037.57 (3.1m):
  `completion-recovery.spec.js`, `dpad.spec.js`, `responsive.spec.js`. Includes
  native touch/mouse delivery, keyboard parity, original board proportions,
  short-screen scrolling, modals, route reachability and same-attempt save
  recovery. No existing Jest or Playwright suite was skipped.
- Unavailable/not run: physical device performance/heat/battery, Safari/Firefox,
  assistive-technology/manual accessibility audit and live server integration.
  Browser API responses are synthetic; no production database was accessed.

## Visual evidence and reproduction

`capture.cjs` uses real Chromium against the local development server, with
synthetic API fixtures only. It fixes random goal selection and the display
clock, blocks external fonts and pauses decorative CSS animation at time zero.
These controls are identical before/after; runtime code is unchanged by them.

```sh
BROWSER=none HOST=127.0.0.1 PORT=3100 npm start
# In another terminal, on the baseline before wiring:
node docs/scene-boundary/capture.cjs before
# After wiring:
node docs/scene-boundary/capture.cjs after
```

Both grids run at 320×568, 390×844, 844×390 and desktop 1280×800.
Full-page initial and cleared-fire screenshots cover all eight combinations.
DOM comparisons also cover a blocked wall, pickup, stationary fire clearing,
advance onto cleared floor, and quit-modal movement blocking. The manifests
record source-file and artifact SHA-256 hashes. All 16 after screenshots were
captured and byte-compared successfully, and all 48 DOM-state hashes match.
One copy of each identical screenshot is retained under `evidence/before/`;
`evidence/after/manifest.json` records the matching after hashes. DOM evidence
stores hashes instead of duplicating large serialized HTML strings.

| Viewport | 13×17 initial | 21×21 initial |
| --- | --- | --- |
| 320×568 | [Screenshot](evidence/before/13x17-320x568-initial.png) | [Screenshot](evidence/before/21x21-320x568-initial.png) |
| 390×844 | [Screenshot](evidence/before/13x17-390x844-initial.png) | [Screenshot](evidence/before/21x21-390x844-initial.png) |
| 844×390 | [Screenshot](evidence/before/13x17-844x390-initial.png) | [Screenshot](evidence/before/21x21-844x390-initial.png) |
| 1280×800 | [Screenshot](evidence/before/13x17-1280x800-initial.png) | [Screenshot](evidence/before/21x21-1280x800-initial.png) |

Each has a `-cleared.png` counterpart showing the consumed extinguisher and
stationary player after fire clearing. Exact comparison controls animated pixels; it does not
claim real-device performance, unrestricted font rendering or accessibility
certification. No new visual design is approved here.

## Rollback

The current renderer remains the default; there is no alternate engine or flag
to leave behind. A single commit revert removes this entire change. For a
presentation-only fallback while retaining the isolated adapter for inspection:

```sh
git restore --source=a9394631661a9e654bb3cb9b9e6dbce14b9491fa -- src/pages/MazePage.js
CI=true npm test -- --watch=false --runInBand
node docs/scene-boundary/capture.cjs rollback
```

Restoring that one file removes every runtime adapter import/read. Unreferenced
adapter/tests/docs may be kept or deleted. No data migration, server action,
CSS change, storage cleanup or attempt reset is required. Restore the PR's
`MazePage.js` afterward to return to the adapter path. The drill records actual
test and screenshot/DOM results rather than merely proposing these commands.

Executed locally: temporarily restored exactly the baseline file, ran all
5 Jest suites / 34 tests successfully, then ran `capture.cjs rollback`.
All 16 screenshots were byte-identical and all 48 DOM states matched baseline.
The rollback manifest's `sourceMazePageSha256` equals the before manifest's
source hash and differs from the adapter path's hash. The adapter wiring was
restored after the drill. See [rollback manifest](evidence/rollback/manifest.json).
