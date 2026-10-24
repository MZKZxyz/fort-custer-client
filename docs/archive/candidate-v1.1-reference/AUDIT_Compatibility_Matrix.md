> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# Cross-Document Compatibility and Requirements Matrix

**Status codes:** `I` existing implementation invariant; `A*` approved direction claimed in draft (owner-signoff not independently established); `P` proposed; `D` deferred; `X` conflict/decision gate. Every row has one **authoritative domain**, even when multiple documents are consulted.

| ID | Requirement / interface | Owner | Related docs | Evidence / compatibility judgment | State | Owner decision |
|---|---|---|---|---|---|---|
| R-001 | Browser-first solo-scale daily maze | 00 Lead | 01,05 | Shared scope across all; no conflict | A* | — |
| R-002 | Finite grid and immutable renderer contract | 01 Gameplay | 05,06 | `move()` clones mutated grid; camera must not own collision | I | — |
| R-003 | Tile `#` impassable | 01 | 02,05,06 | One logical cell = one pallet cube; decoration must not invent gaps | I/A* | — |
| R-004 | `X` pickup, `F` clear-without-entry, `E` finish | 01 | 02,05,06 | All agree; preservation tests needed | I | — |
| R-005 | One extinguisher capacity | 01 | 04,06 | Key/gate inventory would alter contract | I/X | D-07 |
| R-006 | Close camera follows, clamps grid | 06 UX | 01,02,05 | Shared direction, no proven viewport policy | A*/P | D-01,D-02 |
| R-007 | Radius-1 fog replacement | 01 | 02,05,06 | Changes hidden-information behavior; not merely visual | X | D-03 |
| R-008 | Pallet cube one-cell footprint | 02 Art | 01,05,06 | Approved image target, production sprite contract missing | A*/P | D-04 |
| R-009 | Evening lantern palette, legibility | 02 | 05,06 | No gameplay lighting dependencies or verified device budget | A*/P | D-04,D-05 |
| R-010 | React shell + reversible render adapter | 05 Engineering | 01,02,06 | Compatible with existing backend; framework undecided | P | D-01 |
| R-011 | Keyboard move parity | 06 | 01,05 | Existing; form fields and modal protection need tests | I | — |
| R-012 | Swipe one discrete step | 06 | 01,05 | Proposed vs continuous gesture alternative | X | D-06 |
| R-013 | Alternative accessible on-screen movement | 06 | 01,02 | Essential even if primary gesture is swipe | P | D-06 |
| R-014 | Compact HUD: date, visual timer, 1 item, back | 06 | 01,02,05 | Consistent; exact size and placement TBD | A*/P | D-05 |
| R-015 | Authoritative server attempts and result recovery | 05 | 01,04,06 | Verified, preserve original attempt ID and result snapshot | I | — |
| R-016 | Server-receipt official timer | 05 | 01,04,06 | Visual timer starts later; competitive contract mismatch | I/X | D-08 |
| R-017 | Best time and leaderboard semantics | 04 Progression | 01,05,06 | Latest saved progress replaces past daily time; local PB separate | X | D-09 |
| R-018 | One unseen item per completed attempt when available | 04 | 01,03,05,06 | Verified; prose “daily guarantee” ambiguous | I/X | D-10 |
| R-019 | Rarity is descriptive; not odds/power | 04 | 03,05 | Current selector uniform across unseen records | I | D-11 |
| R-020 | Seeded daily maze generation | 01 | 05 | Stored grids stable; write-side seed not applied to RNG | X | D-12 |
| R-021 | Future maze provisioning and date boundaries | 01 | 04,05,06 | Source scripts/leaderboard fixed to 2025 | X | D-13 |
| R-022 | Reward catalog canonical seed source | 04 | 03,05,06 | Seeder found, 112 definitions; destructive reseeding | X | D-14 |
| R-023 | Field Journal and set completion | 04 | 03,06,05 | Requires complete verified catalog and potentially new DB fields | P | D-15 |
| R-024 | Special expedition levels | 01 | 03,04,05,06 | Shared mechanics clear; schema, unlock and scoreboard unresolved | P/D | D-16 |
| R-025 | Key/gate, plate/gate mechanics | 01 | 04,05,06 | One-slot and authored format not resolved | P/D | D-07,D-16 |
| R-026 | Gameplay assistance and ranked fairness | 04 | 01,05,06 | Timer freeze incompatible with stored server timer without migration | X | D-17 |
| R-027 | Kearny fictional setting and humor | 03 Narrative | 00,02,04,06 | Tone coherent; keep heritage distinct | A* | D-18 |
| R-028 | Cultural provenance and attribution | 03 | 02,04,06 | Current seeder claims not fully sourced | P/X | D-19 |
| R-029 | WCAG 2.2 AA target, honest evidence | 06 | 02,05,04 | Current Field Kit/reveal not keyboard semantic | P/X | D-20 |
| R-030 | Domain-spec ownership + decision log | 00 | SG, 01–06 | SG duplicates charter; canonical source needs consolidation | P | D-21 |
| R-031 | Agent tasks: scoped, tested, draft PR, no deploy | 00 | 05,06,SG | Compatible with existing Codex workflow; no new broker required | P | D-22 |

## Interface dependency chains

**Camera chain:** `R-002,R-003,R-004` → `R-006,R-007` → `R-008,R-010` → `R-011–014` → real-device acceptance. A renderer cannot define visibility or traversal rules by itself.

**Rewards chain:** `R-015` → `R-018` → `R-022` → `R-019,R-023` → `R-017,R-026`. Catalog, prize eligibility, competitive behavior and UI should not be changed in one unreviewed feature.

**Expeditions chain:** `R-002,R-004,R-005` → authored schema/version + level-local object state (`R-024,R-025`) → server identity/replay safety (`R-015`) → standings (`R-017`) → UX accessible restart and progress (`R-029`).

**Heritage chain:** `R-027` → provenance check (`R-028`) → field journal data model (`R-023`) → art depiction review (`R-008`) → publication approval (`R-031`).

## Conflict-resolution protocol

1. Confirm the current source contract and the exact draft sections involved.
2. Apply the single authoritative owner above; cross-domain agents submit proposals, not direct spec edits.
3. Log alternatives, decision criteria, migration consequence, owner approval and test changes in `AUDIT_Decision_Register.md`.
4. Until approved, preserve current behavior and use a flagged prototype or a read-only experiment.
5. Update the owning canonical requirement once, referencing rather than copying from dependent documents.
