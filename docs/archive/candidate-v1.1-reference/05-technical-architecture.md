> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 05 — Technical Architecture, Renderer Evaluation and State Contracts

**Candidate canonical v1.1 · 24 October 2026 · Owner: Engineering · Approval: PENDING**

**Scope:** Runtime boundaries, data/API integrity, reversible rendering architecture, performance verification, migrations, operational risk. Do not redefine narrative, reward policy, input *semantics*, or game objectives.

## 1. Verified baseline and protected interfaces

**Client:** React 19 PWA, `react-router-dom` 7, `react-scripts` 5; CSS/HTML grid generated in `src/pages/MazePage.js` and styled in `src/css/MazePage.css`; pure `move()` in `src/game/movement.js`. Keyboard arrows and on-screen D-pad; no approved swipe implementation in reviewed source. Browser tests assert current full-grid width/fog and route interactions.

**Server:** Express/Mongoose; `Maze` holds date, seed, grid, width, height and optional collectibles array; `User` holds nested subprofiles, attempt arrays keyed by date, progress and rewards. `POST /maze/start` creates UUID attempt and returns stored maze; `POST /maze/complete` invokes the version-checked `completeAttempt` service. Identical `attemptId` after successful completion returns an immutable stored result.

**Source-inspection limits:** source main commits are pinned in Repository Baseline; not deployment SHAs. Data stored in MongoDB, device FPS, network latency, and reward catalog actuals remain unverified.

## 2. Layered architecture contract (PROPOSED for renderer work)

```text
Existing /maze/start response and attemptId
  -> immutable initial level definition
  -> canonical pure gameplay transition/state
  -> pure presentation view model (grid and player world position)
  -> replaceable render host (current DOM; experimental Canvas/Three)
  -> React shell (HUD, navigation, recovery, accessible controls)

Keyboard | D-pad | swipe --> single directional-command adapter --> gameplay transition

/maze/complete + same attemptId --> server snapshot/time/reward --> results UI
```

`TECH-01` Only the canonical reducer may determine collision, pickup, fire-clearing and completion. Renderers may interpolate graphics but must not determine game state or directly mutate reward data.

`TECH-02` Presentation view model is derived/deterministic from logical state and camera configuration; must be independently fixture-testable and not require browser/network.

`TECH-03` Render host owns asset lifecycle, sizing, DPR, visibility, animation and cleanup; React shell owns navigation, accessible control DOM, timer **display**, overlays and recovery UI.

`TECH-04` Keep a fallback renderer and reversible flags until device and integration gates prove a candidate. Avoid a React/PWA framework rewrite as part of renderer selection.

## 3. Rendering alternatives (OPEN, D-01)

| Candidate | Strong fit | Cost/risk | Testing gate |
|---|---|---|---|
| Existing DOM/CSS 2.5D | Reuses routes/current view/testing, no new library | High node count/layout/scrolling cost at large grids | First close-follow camera viewport with current textures |
| Canvas 2D + prerendered sprites | Natural camera+sprites, low runtime footprint | DPR, draw order, hit-testing, accessibility must stay outside canvas | Compare same fixed grid + phone performance against DOM |
| Phaser | Mature scene/tween/input utilities | Introduces game framework lifecycle inside React | Only after DOM/Canvas show a measured need |
| Three.js/R3F | Real geometry, lighting, true depth | 3D assets, shader complexity, GPU/battery and testing | Small isolated instanced scene; no migration based on mood renders |

**Recommendation, not decision:** Begin with a DOM viewport prototype and independent view model. Treat sprite-based Canvas as likely next experiment if DOM performance/quality underperforms. Conduct a Three.js comparison only if real visual benefit is demonstrated under equal device and maintenance criteria. Do not treat “near overhead” as an implicit 3D mandate.

## 4. Visibility, camera and input constraints

- Camera maps finite cell coordinates to an intentionally clipped screen viewport, approximately centered in interior, clamped to hard boundaries, and stable on resize/orientation change.
- Suggested portrait framing of 7–9 visible columns is a **hypothesis**; confirm with mobile readability. Keep zoom accessible or tuneable.
- Current radius-1 fog is gameplay-affecting. Scope an A/B fixture with and without offscreen concealment; owner-approved `D-03` required to change public default.
- Use short tweening for visual response, but accept logical move atomically; no double-processing of item state during animation. Reduced-motion mode may jump directly to committed cell.
- Input adapter must not capture page swipe/pinch globally; keyboard/D-pad stay parity-preserving and focus-safe.

## 5. Timing, attempts and authoritative results

**CURRENT contract:** Start request creates a server attempt timestamp before client renders playable grid. Client `performance.now()` starts on playable load; server `completeAttempt()` computes seconds from attempt `started` to receipt of complete request. These are **not equivalent clocks**. Official result may incorporate API/asset-load/save latencies absent from the visible clock. This is known architecture debt, not an implied fix authorization.

`TECH-05` Slice 01 preserves server-authoritative rank durations and the immutable attempt snapshot. Do not change server timing casually to match HUD; log `D-08` and define a separate tested protocol if the experience requires actual on-device play time.

`TECH-06` Persist retry intention before POST complete; retain same `attemptId` after timeout, page reload or response loss; never issue `/maze/start` while recovery is unresolved. On success, use server result and clear recovery key only after appropriate result handling.

`TECH-07` Keep `User.__v` concurrency protections, subprofile ownership checks, and no-double-award invariant; test 409, 410, 503 and other typed errors where supported.

`TECH-08` Existing `sub.progress[date]` stores latest completed attempt time; that may conflict with “personal best” language. Do not rewrite leaderboard aggregation until `D-09` is approved with historical migration decision.

## 6. Maze generation / date contracts

The current server returns a stored grid with a `seed` field. The write-side script uses unseeded `Math.random()` in `generateDummyMaze(seed)`; the offline analyzer wraps the generator with seeded randomness for its own reproducibility. Consequently, “seeded daily maze” is conceptually intended but *write-side determinism is unverified*. Store exact grid/version as the authoritative level; do not regenerate served historical grids from seed without a proven matching algorithm.

The current writing script and leaderboard date bounds reference summer 2025. A read-only production data/scheduler audit is required before assuming ongoing daily availability, future seasonal calendars, or migration needs. Timezone for daily-selection logic needs explicit product decision.

## 7. Catalog safety and migration responsibilities

RewardItem seeder contains 112 static definitions, with a destructive delete/reinsert sequence. **Never run it as a catalog inspector or unreviewed production migration**. Progression and Narrative may prepare offline content/source sheets; Engineering must own read-only DB comparison, stable IDs, migration transaction/backup and regression tests before authorizing any reward schema or copy overwrite.

No current schema field authorizes collecting equipment abilities, favorites, provenance records or achievement balances. `Maze.collectibles` existence does not establish gameplay use. A new field is a proposal until accepted by all owners and supported by rollback/test plan.

## 8. Reversible delivery plan and exit gates

| Phase | Concrete work | Gate before moving on |
|---|---|---|
| 0 Baseline | Pin source, capture current maze screenshots, tests and device metrics | Reproducible fixed fixture and no existing behavior regression |
| 1 Separation | Extract one stable view-model/scene adapter while keeping DOM renderer | Existing tests + static fixture parity + instant rollback |
| 2 Camera | Cropped, clamped scrolling viewport on existing textures | No void, wall-gap or input divergence at target viewports |
| 3 Art kit | Integrate small 2.5D pilot, reuse current renderer until measured need | Correct near-overhead geometry and readable hazards on phones |
| 4 Comparison | Canvas POC (and conditional Three spike) with same fixture | Side-by-side device and maintenance evidence; owner D-01 decision |
| 5 Controls/a11y | Swipe prototype, optional D-pad, compact HUD and reduced effects | Parity; keyboard, screen reader, viewport/safe-area QA |
| 6 Release | Staged review with reversible feature flag, provenance and CI | Owner-approved scope, rollback, regression report, no backend drift |

## 9. Measurement and tests

At minimum compare **13×17** and **21×21** grids, phone portrait (320×568 and 390×844), phone landscape (844×390), and desktop. Record median and worst-frame pacing, input-to-visible-move, sprite/texture transfer size, resize stability, memory pressure and low-end device qualitative heat/battery. Numeric budgets are set from real measured baselines and device capability, not invented universal targets.

- Collision check: canonical `move()` and renderer local position never diverge.
- Maze edge: no empty void and no phantom walkable corridor.
- Input: rapid repeats cannot skip stationary fire state; no movement under modal or after finish.
- HTTP: no new attempt on completion recovery; reward returned from original saved result.
- Responsive: no 320 px clipping or lost gesture alternative; `prefers-reduced-motion` honored.
- CI: preserve current security/contract invariants; migrate presentation-specific Playwright expectations alongside an approved view revision. Do not stall Codex on external GitHub checks.

## 10. Handoff and change authority

Engineering agent owns architecture diagrams, code boundaries, device benchmarks, feature flags and migrations. It coordinates movement rules with 01, sprites with 02, status messages/a11y with 06, rewards with 04 and historical data with 03. Each PR reports source SHA, changed files, local checks, screenshots/metrics, open decisions and rollback; no silent deployment or data mutation.

**Open decisions:** D-01, D-02, D-03, D-08, D-09, D-12, D-13, D-14, D-16, D-22. **Original draft:** uploaded Technical Architecture & Engineering Strategy pp1–5.
