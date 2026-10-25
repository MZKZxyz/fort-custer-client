# VIS-04B — Interactive Movement & Controls Lab

Isolated UX study for [client #33, VIS-04B assignment](https://github.com/MZKZxyz/fort-custer-client/issues/33#issuecomment-6391787997), explicitly authorized by the owner in the task. Based on current client main `344b43159fbbe6276787ab45977cf9e40a3799e8`. Independent of QA-pinned rendering PR #40; none of that branch's files or assets are adopted or changed.

## Play locally

From the **repository root**, using the existing checkout:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open **http://127.0.0.1:8765/docs/ux-interaction-lab/**. No app build, account, API, environment variables or backend needed. Serve the repository root, rather than this directory, because native ES modules import the canonical game helpers and existing fixture JSON. The page is self-contained within the checkout and uses no CDN/fonts or remote service; `file://` module loading is not supported.

The page is the primary review interface: a live maze, A/B selection, adjustable timing, day/dusk, both fixtures, diagnostics, a transition notebook, brief test instructions, a recommendation and an expandable native capture gallery. No publishing or deployment is required.

## Exact input contract

- **A — Hold to repeat:** pointer down takes one immediate step. First repeat is **400 ms** later; subsequent steps are **180 ms** apart. Tap = one step, with no second command from the synthetic click. Delay is bounded to **200–800 ms**, repeat interval to **100–400 ms** (2.5–10 repeat steps/s). Settings stop the current input. Timers schedule one future callback at a time; no catch-up burst after a stall.
- **B — Drag to steer:** a dedicated input pad measures displacement from the original contact, with an **18 CSS px** dead zone and **1.25 axis-dominance ratio**. First clear direction takes one step; holding displacement repeats at the same cadence as A. Neutral/diagonal displacement pauses. Steering later in the same contact waits a repeat interval, preventing jitter from issuing unlimited steps. Release anywhere ends the press. There is no momentum or release-time move.
- Both use the same `move()` import and controller. **X** equips the existing one-slot extinguisher. **F** clears and consumes it **without advancing**. Fire clear, obstruction and completion latch the current press stopped. Steering cannot revive it; release and consciously press again. Without equipment, fire blocks.
- Stop on pointerup/cancel, lost capture, window blur, hidden document, focus leaving an input control, modal open, resize/orientation/visual-viewport resize, settings/fixture/scheme change, pagehide/unmount. Additional pointers stop the active contact. Stale owners and invalidated timeout callbacks cannot issue later steps. Repeated native keydown events cannot re-arm a cancelled key.
- Keyboard arrows work while the maze, drag pad or a directional button has focus. D-pad buttons support Tab + held Enter/Space and single assistive activation. Form fields keep native arrows. One input owner at a time; changing to another simultaneous input does not transfer a hold.
- Native modal semantics, explicit Tab containment, Escape and return-focus behavior apply **inside this lab only**. Closing never resumes movement. No production dialog is changed.
- Dedicated D-pad buttons and drag pad have `touch-action:none`; the maze and surrounding page retain native scrolling/pinch behavior. No global touch prevention, application role or gesture-only requirement. Native screen-reader touch exploration remains unverified.
- Day/dusk changes real colors. No perpetual movement animation; reduced motion explicitly disables transitions/animations. Controls are at least 44 CSS px in the measured standard layouts. On phones the maze stays visible while scrolling to inputs; short landscape uses normal page scrolling. Enlarged text may increase page height.

## Shared source and deterministic fixtures

| File | Role |
| --- | --- |
| `../../src/game/movement.js` | Unmodified source-of-truth transitions and start location |
| `../../src/game/scene.js` | Unmodified immutable scene adapter; all in-viewport cues exposed |
| `../../src/game/camera.js` | Unmodified square player-follow/clamping helper |
| `fixtures.mjs` | Exact border/trace fixture from `docs/viewport-camera/verify.cjs`: 13×17, S/X/F/E at [1,1..4] |
| `../art/reference-scene/iteration-2/source/fixture.json` | Existing authored 11×9 garden fixture, loaded directly |
| `controller.mjs` | Input scheduling, ownership, terminal latches and direction selector |
| `lab.mjs` / `lab.css` / `index.html` | Browser adapters, local schematic and review interface |

The schematic uses locally authored SVG marks and CSS cells, not the approved sprite renderer or a claim of final artwork. Internal E remains the canonical goal tile; its visible cue is **one tipi**, with objective **“Reach the tipi.”** No external art or production assets are modified. This does not certify the deferred final tipi artwork integration or ranked tactical visibility policy (EG-09).

## Verify and regenerate evidence

Use the repository's existing dependencies. No package/lockfile modification:

```sh
# Node 24 as tested; runs 17 deterministic checks with an adversarial fake clock.
node docs/ux-interaction-lab/tests/controller.test.mjs
# 43 browser checks; config serves repository root automatically if :8765 is free.
# Stop the manual static server first when using CI=true.
node_modules/.bin/playwright test --config=docs/ux-interaction-lab/playwright.config.cjs --workers=2
# Existing regression checks (default camera remains off).
CI=true npm test -- --watch=false --runInBand
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
BUILD_PATH=/tmp/vis04b-production-build npm run build
# With the static server running at :8765, capture actual browser pixels + JSON:
node docs/ux-interaction-lab/capture.cjs /tmp/vis04b-production-build
```

Chromium defaults to `/usr/bin/chromium`; optionally supply `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The dedicated config writes transient Playwright results under `/tmp/fort-custer-ux-results`. [Review evidence](evidence/review.md), [raw measurements/source hashes](evidence/report.json), and four native PNGs are committed here. The capture script asserts no overflow, running animation, page error, API call, out-of-scope tracked diff, production-bundle lab marker, or measured core text contrast below 4.5:1. It records source hashes and does not run deployment or CI.

## Ownership, review and rollback

UX & Interaction Design owns the recommendation and author evidence. Integrator coordinates the candidate; independent QA should reproduce at the final PR SHA and Gameplay should review input invariants. Owner design review and physical-device/accessibility validation remain pending. Author tests are not independent signoff or WCAG certification.

The entire diff is `docs/ux-interaction-lab/**`. Production maze, rendering, API, attempts, rewards, timer, completion/recovery, storage, dependencies, flags and assets are unchanged. The static page has no persistence flow; arrival only freezes local movement. Existing completion/recovery regressions pass separately. Ordinary production builds cannot import or serve this directory through a production route. No camera opt-in was activated.

Rollback: delete this one directory or revert the lab commit. No data migration, server change, flag change or dependency rollback. Do not close the parent VIS-04 issue based on this study. Finish at the draft PR; do not merge, deploy or wait/poll GitHub CI.
