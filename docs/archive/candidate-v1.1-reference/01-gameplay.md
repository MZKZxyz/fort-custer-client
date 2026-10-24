> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 01 — Gameplay, Maze Rules and Authored-Level Roadmap

**Candidate canonical v1.1 · 24 October 2026 · Owner: Gameplay Design · Approval: PENDING**

**Scope:** Player rules, grids, maze experiences and future authored-level mechanics. Rendering technology belongs to 05, visual geometry to 02, accessibility widgets to 06, server attempts to 05, rewards to 04.

## 1. Product gameplay contract

The daily maze is the primary play loop: select date → request authorized stored grid/attempt → explore a finite maze → interact with extinguisher/fire → reach exit → save or recover authoritative completion → optionally reveal a collectible and review records. Sessions should be brief and understandable without mandatory lore. Do not add a second rules engine for expeditions.

**Current verified tile vocabulary:** `#` blocked wall; ` ` walkable floor; `S` spawn; `E` exit/teepee; `X` extinguisher pickup; `F` fire to clear. Client movement behavior comes from `src/game/movement.js` at the reviewed baseline (see Repo Baseline). New symbols are not approved.

## 2. Current movement invariants (CURRENT)

- Position is a discrete `[row,column]`, and an input is one cardinal transition. Out-of-bounds, `#`, or a fire without extinguisher leaves state unchanged.
- `X` enters the cell, clears the pickup from the mutable *state copy*, and adds extinguisher without stacking duplicates.
- With extinguisher, a direction toward `F` clears that tile and consumes the extinguisher **without advancing position**. A second directional input is needed to enter that now-clear tile.
- Entering `E` sets completed state; subsequent movement is ignored. Existing input adapters must call the same pure transition.
- Renderer must not mutate the source grid merely to display it; any object-state changes belong in the canonical transition state.
- Server determines whether the attempt is accepted and which reward was assigned. Gameplay never fabricates an attempt result.

**Acceptance fixture G-01:** grid with start, extinguisher, fire, end; prove blocked-without-extinguisher, item pickup, stationary fire clearing, subsequent entry, one completion, and exact replay under keyboard and other input sources. Test no movement through apparent gaps between pallet sprites.

## 3. Daily generation: observed and not-yet-proven

Server currently serves a **stored** grid indexed by date. The data model stores seed, grid, width and height. The writing script `scripts/generateMazes.js` uses `Math.random()` and a bounded 2025 date range, while offline `tools/maze-analyzer/generator.js` supplies a seeded RNG. Therefore **a stored date being stable is not proof that its seed reproduces that grid with the production script**. Do not advertise cross-version deterministic regeneration without verifying producer version and RNG. `R-020`/`D-12` control any redesign.

No current-source assertion proves available 2026 date coverage, production job cadence, or intended regional season. `R-021`/`D-13` require an actual date provisioning audit before editing availability or leaderboard calendars.

**Generated-daily quality criteria to validate (not numeric commitments):** solver-proven reachability; no isolated mandatory extinguisher; correct count/placement of S/E; finite dimensions and no impossible forced route; interesting paths without endless backtracking; representative samples assessed with analyzer and playtest. Capture distribution of minimal paths and play duration before setting difficulty tiers.

## 4. Camera and visibility are not gameplay-neutral

Accepted *direction*: near-overhead close-follow local viewport clipped to a finite grid. `R-006` controls exact framing. The current client has radius-1 fog. Replacing it with offscreen-only concealment alters what players know about the maze. `D-03` remains OPEN: preserve behavior for controlled comparison, test whether local geometry/goal and backtracking remain understandable, and avoid accidentally revealing a mechanically relevant route.

Camera smoothing, pan, zoom and clamping must not alter logical coordinates or allow inputs while a critical tile interaction is unresolved. Visual tweening is an animation of a completed transition, not an independent simulation.

## 5. Core input semantics

Keyboard arrows are supported; any touch adapter maps its gesture to the same `move()` transition. The leading prototype is **one directional command per swipe** on the game surface only, with axis-lock and threshold; continuous movement is an unapproved alternative (`D-06`). Maintain discoverable keyboard/on-screen control alternative. A D-pad may be hidden from normal touch presentation only if accessible and immediately available by settings or other clear affordance; never eliminate it without accessibility testing.

Quick repeated inputs must not reuse stale state, skip fire-clearing, or move while a quit/completion modal is active. Make browser scroll and zoom possible outside the active gesture area.

## 6. Authored expeditions: staged specification (PROPOSED, not Slice 01)

Goal: small curated spatial puzzles with the same grid, movement, rendering, event and completion model. No endless authored-content obligation. The existing example *Lantern Gate* uses a key and door atop fire/extinguisher; it is a **concept**, not an executable schema.

**Step A — fixture-only format:** define `levelId`, `levelVersion`, grid width/height, grid content, optional typed `objects`, starting state and finish criteria. Validate exactly one S and E, known tile types, solvability, legal item and gate state. A fixed JSON level must parse in an offline test before adding production storage.

**Step B — local mechanic trial:** if authorized, one key and one gate. Open decision `D-07`: key uses existing one-slot inventory or level-local boolean flag. Recommendation is a separate *non-collectible* level-local flag for the prototype, to preserve extinguisher behavior and HUD, but this requires owner sign-off.

**Step C — service contract:** before real completion/rewards, determine authored attempt identity, level version pin, expiry/restart, progress persistence, server-authoritative duration, ranking cohort and entitlement. Never reuse date-indexed daily completion identifiers implicitly for authored levels.

**Step D — schedule/rewards:** weekend access, streak bonus, rotations, history and scoreboard remain `D-16` / `D-17`; avoid locking users out for broken streaks or forcing weekly manual content production.

**Deferred mechanics:** plates linked to gates; movable crates; sliding ice; teleports; multiple key types; enemies/combat; narrative quest logs; generated multistage puzzle solvers.

## 7. Gameplay acceptance tests and handoff

- `G-01`: exact transition parity for keyboard, D-pad, swipe; special input under continuous/sequential gestures.
- `G-02`: camera clamp, player visibility, no wrong implied passability from art. Map dimension fixtures at least 13×17 and 21×21.
- `G-03`: no new attempt on completion retry or browser recovery; test slow network response, server-authoritative snapshot.
- `G-04`: puzzle information test with original fog vs viewport-only treatment before changing default.
- `G-05` (future): authored loader rejects missing goal, overlapping objects, impossible key/fire path and invalid version; accepted fixed level completes with same transition rules.

Gameplay agent may propose design data, maze fixtures, rules and targeted tests. It must coordinate timing with Engineering, progress with 04, touch ergonomics with 06, and collision depiction with 02. No unilateral backend schemas, achievements or new powers.

**Open decisions:** D-02, D-03, D-06, D-07, D-12, D-13, D-16. **Original draft:** uploaded Gameplay & Product Design pp1–5.
