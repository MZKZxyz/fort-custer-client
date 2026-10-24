# Fort Custer — First integrated development program

**Status:** approved direction under OD-22; linked work packages are live planning backlog, not implementation authorization. Each package is a substantial issue/epic, not one PR for every small subtask. Dependencies refer to package IDs; every code change requires issue-scoped authorization and fresh repo inspection.

| Package | Lead domain | Can start | Scope / output | Exit gate |
|---|---|---|---|---|
| [FC-GOV-01](https://github.com/MZKZxyz/fort-custer-client/issues/29) | Producer/Integrator | Immediately | Publish approved OD register and workflow contract here; link existing board and work packages; record triage boundaries | Owner IDs traceable, 0 duplicate canonical registers, live project/issue URLs documented |
| [FC-VIS-01](https://github.com/MZKZxyz/fort-custer-client/issues/30) | Art + UX | Immediately; parallel with FC-VIS-02 | Polished reference scene: `#` pallet cubes, floor, explorer, X/F/E, two lighting studies, asset anchors | Owner approves visual reference, legible at 320px portrait, no false wall passages |
| [FC-VIS-02](https://github.com/MZKZxyz/fort-custer-client/issues/31) | Engineering | Immediately | Baseline fixtures, renderer-independent scene/view model, reversible existing DOM host | Movement, attempt and recovery parity; no server contract or UX regressions |
| [FC-VIS-03](https://github.com/MZKZxyz/fort-custer-client/issues/32) | Engineering + UX | After VIS-02; art pilot parallel | Responsive scrolling camera, viewport-only reveal, player clamp, HUD composition, input adaptations, reduced motion | 13×17 and 21×21 fixture matrix; 320×568/390×844/844×390/desktop; no phantom geometry |
| [FC-VIS-04](https://github.com/MZKZxyz/fort-custer-client/issues/33) | Engineering + Art + QA | After VIS-01 and VIS-03 | Integrated asset pack and continuous hold/drag controls + accessible alternatives; stage behind flag | Device performance/readability; collision parity; focus/keyboard/D-pad/reduced motion; owner visual sign-off |
| [FC-SYS-01](https://github.com/MZKZxyz/fort-custer-server/issues/5) | Eng + Gameplay + Progression | Read-only RFC in parallel | Define playable readiness timing, attempts, ranking class, historical comparability, migration sequencing | EG-01/02/03/05 supported by state machine, race tests, rollback plan; no data writes in RFC |
| [FC-SYS-02](https://github.com/MZKZxyz/fort-custer-server/issues/6) | Gameplay + Eng | Read-only/design parallel | Deterministic versioned generator + daily publisher contract, archive availability, legacy season removal planning | Reproduce same seed/version/config; no historical grid rewrite; production scheduler audit |
| [FC-SYS-03](https://github.com/MZKZxyz/fort-custer-server/issues/7) | Eng + Progression | After SYS-01 and DB read-only comparison | Eligibility once/date, weighted-unowned award, fastest valid leaderboard, exhausted catalog distinction | Transaction/concurrency/idempotency + historical tests; no destructive catalog seeding |
| FC-UX-01 (future scope; no issue yet) | UX + QA | Can start with baseline; can bundle with VIS-03/04 | Semantic controls, dialogs, touch parity, Field Kit current accessibility fixes | Accessible activation, focus management and device/browser evidence |
| [FC-JOUR-01](https://github.com/MZKZxyz/fort-custer-client/issues/34) | Narrative + Progression + UX | Editorial pilot in parallel, implementation after visual slice | Ten source-backed collectible entries, rights/culture review, Journal information architecture; later UI | Owner editorial signoff, provenance, item IDs stable, collection counts verified against DB |
| FC-EXP-01 (future scope; no issue yet) | Gameplay + Eng | After visual release, roadmap only now | Authored-level schema, expedition keyring, gates, validation/solver prototype | Separate RFC and owner-scoped implementation authorization |

| [FC-QA-01](https://github.com/MZKZxyz/fort-custer-client/issues/35) | Independent QA + UX | Read-only baseline with VIS-02 after scope review | Independent regression matrix, accessibility and visual-slice evidence | Reproducible report, named review checkpoints, no self-signoff |

## Milestone gates and practical sequence

**Iteration 0 — Program bootstrap and no-regression baseline.** Publish OD contract and verify remaining board configuration; triage existing issues; Art prepares a style study, Engineering pins fixture baselines. No database writes.

**Iteration 1 — Visible camera foundation.** VIS-02 + VIS-01 in parallel (different files). Once style approved, VIS-03 integrates viewport, responsiveness, visibility and camera clamp; centralize conflict-heavy `MazePage` edits.

**Iteration 2 — Polished daily-maze slice.** VIS-04 + UX-01 combined where cohesive; owner reviews screenshots/real device; independent QA. Do not require SYS-01 migrations for the visual proof.

**Parallel read-only track — Persistence contracts.** SYS-01 and SYS-02 produce testable RFCs while visual work proceeds. Authorization to change API/DB only after compatibility evidence, independent from client visuals.

**Next releases — Trusted timing, rankings, rewards, Journal.** SYS-03 after migration gates; Journal after editorial/provenance sample; expedition deferred under OD-13.

## Critical path

`VIS-02 → VIS-03 → VIS-04` with `VIS-01 → VIS-04` and `UX-01 → VIS-04`. Server track `SYS-01 → SYS-03`; `SYS-02` can advance separately after existing generator issue triage. `JOUR-01` editorial planning parallel, UI integration later.

**Release exclusions:** no authored-level system, no live collectible abilities, no paid mechanics, no client framework rewrite, no production rewardSeeder rerun, no auto-merge/deploy, no dependence on [automation PR #35](https://github.com/MZKZxyz/fort-custer-automation/pull/35). This is distinct from [client QA issue #35](https://github.com/MZKZxyz/fort-custer-client/issues/35).
