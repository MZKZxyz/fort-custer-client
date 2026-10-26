# Sprint 1.4A — Production Maze HUD & UX Refinement

Design-only evidence for issue #45, handoff 6416242980. Source main: `8664c4f2026e8ec4857b31f40e51e5a7e1ce3b97`. All new files are in this directory. No application code, API, flags, rendering implementation or movement logic is changed. No implementation PR, deployment or CI polling.

## Play the comparison

On this design branch, extract the committed `runtime.zip` into a `runtime` directory here, then from the repository root:

```sh
python3 -m zipfile -e docs/hud-ux-study/runtime.zip docs/hud-ux-study/runtime
node docs/hud-ux-study/serve.cjs
```

Open **http://127.0.0.1:8775/study/**. Node core is sufficient; no dependencies, backend or credentials needed to play. Choose A, B, C or current UI, viewport and state. The review controls sit outside the game frame. You can also open `/maze?hud=A` directly for a responsive full-window playtest.

The host serves a minimal copy of the exact optimized classic build and a synthetic API. Candidate overlays are injected only by this local study host; the actual compiled JavaScript is unchanged. It does not publish a website or contact a live backend. The local host restricts resources to its own origin. The application’s external Google Fonts import was unavailable in this cloud run, so native captures use the existing monospace fallback; exact production font delivery remains a typography check for the final implementation. The server binds loopback only. Other app routes outside maze/recovery/results are not supported by this research kit.

State selection starts a fresh local demonstration and replays ordinary commands through the existing input coordinator. It never injects React fixture props, teleports the player, rewrites the grid after load, or replaces game components. The maze is a deterministic offline sample of the existing server generator, not a reconstruction of a historical daily maze. Its provenance and replay paths are in `fixture.json`.

For error/retry, select Save error, choose Start selected state, then Restore local connection and use the actual Retry saving action. Direct refresh preserves the app's recovery intent; only an explicit fresh-demo selection clears synthetic intent. All attempt/profile values are invented local fixtures. Save success returns a fixed test result, never a real reward.

## Evidence and recommendation

Use the browser gallery for before/after and complete native images. `evidence/report.json` records 128 core full-page captures (4 presentations × 4 sizes × 8 states), 16 exact initial viewport captures, native queued-turn checks and geometry/fog/outcome/request comparisons. Supplementary images cover Help, Quit, 200% text, queued turns, actual recovery/results and the review interface. `interaction-checks.json` records owner-control, refresh/retry and announcement-boundary probes.

[A — Field strip](audit.md) is recommended. At 320×568 on the documented 13×17 sample it reduces initial page height from 803 to 568 CSS px and fits all four D-pad targets. Classic desktop/landscape and larger grids still scroll. The audit includes every current visible element, conditional accessibility/preview UI, tradeoffs, copy and a ten-part production acceptance gate.

The baseline has no design overlay and uses the actual compiled `/maze` route. Proposed screenshots use that same bundle with externally injected HUD presentation; they are not final production implementation screenshots. Fog, radius, logical visibility, board geometry, player/equipment outcomes and API payloads remain equivalent. The existing polite status is kept nonvisual; the concise visible mirror is not another live announcer. Original recovery/results remain unmodified.

## Reproduce from source

Build the pinned source without any maze preview flags. Use a separate disposable checkout if necessary. Example from the repository root:

```sh
env -u REACT_APP_MAZE_CAMERA -u REACT_APP_MAZE_VISUAL_INTEGRATION -u REACT_APP_MAZE_INPUT_PREVIEW -u REACT_APP_MAZE_VISUALS GENERATE_SOURCEMAP=false REACT_APP_API_URL=/api BUILD_PATH=review-build npm run build
HUD_BUILD=review-build node docs/hud-ux-study/serve.cjs
# In another terminal, using the existing Playwright installation:
node docs/hud-ux-study/capture.cjs
node docs/hud-ux-study/probe.cjs
node docs/hud-ux-study/mechanics.cjs
# Optional: start another kit host in its own terminal, then run supplemental probes.
HUD_PORT=8776 node docs/hud-ux-study/serve.cjs
node docs/hud-ux-study/supplement.cjs
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if your existing browser requires it. The packaged runtime manifest records hashes/provenance and excludes source maps. The mock API URL is local test configuration, not a production environment change. Build/reproduction outputs should remain untracked. The compiled kit contains no overlay import until the local study server injects it.

## Review boundary

Owner selection precedes Client Engineering implementation. Independent QA and owner must review complete final production-like screenshots and the inventory before recommending the eventual cohesive UI PR for merge. Physical device/accessibility checks remain open. Keep source/timer/fog/goal/state semantics unchanged until separately authorized. Removal of this directory and stopping the local host removes the study; no migration, flag or production rollback is needed.
