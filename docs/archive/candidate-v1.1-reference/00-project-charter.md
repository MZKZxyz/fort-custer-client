> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 00 — Fort Custer Project Charter and Agent Operating Contract

**Candidate canonical v1.1 · 24 October 2026 · Owner: Lead/Producer · Approval: PENDING**

**Authority:** Scope, priorities, definitions, agent permissions, and cross-domain decision mechanism. Domain-specific mechanics remain authoritative in documents 01–06. Supersedes the *proposed* Documentation & Agent Roles guide only after explicit owner acceptance.

## 1. Product identity and promise

Fort Custer Maze is a browser-first, solo-maintainable, family-heritage game inspired by a real pallet-built maze. The fictional Kearny Family Amusement Company offers a warm and slightly eccentric frontier miniature. The experience is a short, repeatable daily maze with meaningful exploration, clear object interactions, and occasional discovered curiosities. Future authored expeditions may introduce controlled spatial puzzles using the *same* underlying rules.

**Creative direction recorded in drafts (not separate implementation permission):** simplified claymation tabletop aesthetic, distinct open-topped pallet-wall cubes, near-overhead local camera, prairie grasses and flowers, inviting lantern-lit evening mood, readable compact interface, mostly sincere historical atmosphere and restrained humor.

**Primary quality hierarchy:** (1) reliable daily core loop, (2) mobile legibility/inputs, (3) cohesive art, (4) fair records and saved progress, (5) distinctive collectible heritage, (6) optional expansion. Art direction may motivate prototypes, but not override saving, accessibility or performance acceptance.

## 2. Milestones and non-goals

### Vertical Slice 01 — playable scrolling daily maze

- Consume actual `Maze` grid/attempt records from existing backend in an authorized test environment; no fabricated player rewards.
- Player follows a finite maze viewed locally, with camera clamping and compatible pallet-cube visuals. Collision and input semantics stay identical to existing `move()`.
- Date, readable elapsed visual timer, one extinguisher inventory representation and a back/quit action remain available.
- Preserve start/complete/retry behavior including original `attemptId`, authoritative result, and one-result replay safety.
- Keyboard and an accessible on-screen directional alternative remain usable; touch swipe is an evaluated addition.
- Prove operation in portrait, landscape and desktop viewports and reduced-effects mode; validate on a representative phone before locking rendering architecture.

**Explicit non-goals for Slice 01:** new puzzle tokens, weekend level entitlement, achievements, crafting, coin/XP economies, NPC conversations, combat, social systems, live weather, server schema changes, full 3D migration, automated merges or deployments.

### Later stages (separately authorized)

1. Authored level *fixture* and common loader, then one curated expedition (01,05).
2. Field Journal editorial pilot and accessibility improvements (03,04,06).
3. Curated decorations or specific utilities only with an item/competition contract (04,05).
4. Environment variation and progressive effects only after device budget established (02,05,06).

## 3. Requirement maturity vocabulary

| Status | Meaning | Agent behavior |
|---|---|---|
| `CURRENT` | Verified current source or durable product behavior at a pinned revision | Preserve and regression-test until authorized to change |
| `DIRECTION` | Creative/product choice recorded by prior discussions | Respect in proposals; not unilateral permission to ship |
| `PROPOSED` | Explicit recommended future design | Prototype/read-only research only within approved scope |
| `OPEN` | Multiple paths or insufficient evidence | Cite decision ID; do not choose silently |
| `DEFERRED` | Excluded from current milestone | Do not implement |
| `ACCEPTED` | Owner signed a specific design choice | Eligible for scoped work; no implied merge/deploy rights |

**No implied approval:** Revision, filename, discussion, or agent role does not authorize production writes, spending, schema migration, secret handling, merge or deployment. The source-of-truth conflict rule is: current implementation → owner decision register → accepted owning spec; unresolved contradictions stop the affected feature, not unrelated work.

## 4. System boundaries and reviewed baseline

- `MZKZxyz/fort-custer-client`: React 19 PWA; route/maze/view/controls/results/collection; `src/game/movement.js` is gameplay transition anchor.
- `MZKZxyz/fort-custer-server`: Express/Mongoose; date-grid, authenticated attempts, versioned subprofiles, reward snapshots and leaderboards; `services/completions.js` is completion contract anchor.
- `MZKZxyz/fort-custer-automation`: existing automation experiments; maintain as a **separate, nonblocking** concern. Draft multi-task PR #35 is not required for Slice 01.

All agents inspect current `main` before a task, compare with the pinned SHA in `AUDIT_Repository_Baseline.md`, and report drift. A documentation claim about production DB contents is never accepted solely on static source definitions.

## 5. Domain ownership

| ID | Owner | Canonical decision responsibility |
|---|---|---|
| 00 | Lead/Producer | Vision, milestones, order, approvals, cross-domain decisions |
| 01 | Gameplay | Movement, puzzles, maze/difficulty, input *semantics*, authored-level rules |
| 02 | Art & Assets | Geometry silhouettes, palette, props, aesthetic intent and asset constraints |
| 03 | Narrative | Kearny canon, tone, historical claims, provenance review |
| 04 | Progression | Rewards, catalog taxonomy, achievements, item roles, competition meaning |
| 05 | Engineering | Renderer implementation, APIs, state, timing persistence, performance, migrations |
| 06 | UX/QA | Interaction flows, accessibility, HUD, gesture ergonomics, acceptance testing |

Engineers implement agreed mechanics; they do not invent new progression or narrative rules. Multiple roles may consult any spec. **Each requirement and document has exactly one owner.** Cross-domain changes are submitted as decision proposals to the owning role and logged centrally.

## 6. Task operating contract

A scoped issue/agent assignment MUST specify: task ID and owning domain; objective measurable in app behavior; accepted requirements/decision IDs; target repositories and pinned refs; allowed files/classes of files; read-only/prototype/implementation authority; non-goals; dependencies; regression and device evidence; artifacts and proposed PR; rollback path and reporting requirements.

- Prefer coherent implementation PRs over micro-changes; do not bundle unrelated mechanics merely to make a PR larger.
- One integrator owns shared code/merge ordering. Avoid parallel edits to MazePage and completion service from multiple agents.
- Agent coding must not wait or poll GitHub CI indefinitely. Run named local checks, publish to the approved draft PR scope when authorized, report results, and stop. Human review/merge/deploy remains separate.
- No agent assumes it may change server reward logic, production data or security policy because the task references a design concept.

## 7. Vertical Slice 01 acceptance gate

**Behavior:** `#`, `X`, `F`, `E` and one-slot state preserved; fire clears on a stationary move; selected date and `attemptId` stable; timer display not confused with official server result; recovery persists under simulated network timeout.

**Visual/UX:** Individual pallet wall blocks occupy exactly one logical cell with no fake shortcuts. Local camera follows and clamps without exposing void. At least 320×568, 390×844, 844×390, and desktop checked; keyboard, D-pad and reduced-motion mode work. Maze content is legible and foreground effects do not intercept input.

**Engineering:** Current DOM renderer remains available until a measured reversible migration is accepted. Comparable fixture screenshots and responsive tests accompany implementation. No server contract drift or hidden database migration.

**Delivery:** brief artifact summary with screenshots, test commands/results, relevant before/after metrics, known caveats, and rollback instructions. Only the owner may approve shipping.

## 8. Decision and traceability infrastructure

Use `AUDIT_Decision_Register.md` for D-01–D-22 and `AUDIT_Compatibility_Matrix.md` for R-001–R-031. Where a requirement is shared, refer to its canonical owner rather than pasting divergent copies into each specification. Archive the prior SG PDF after this governance contract is adopted; retain source PDFs as history, not live conflicting instructions.

**Reference source:** uploaded `00 — Project Charter & Agent Operating Guide` pp1–4; `Documentation & Agent Roles` pp1–3. Source-code baseline and detailed findings appear in accompanying audit files.
