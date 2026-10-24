> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# Fort Custer — Owner Decision Register

**All decisions below are OPEN unless explicitly marked.** A recommendation is **not** approval. Do not implement a proposed mechanic based merely on a document being marked “v1.1”. Owner signs each accepted decision with date, rationale and repository/scope impact; agents then update the owning domain spec.

| ID | Priority | Topic and alternatives | Recommendation / evidence needed | Owner / gate | State |
|---|---|---|---|---|---|
| D-01 | P0 slice | Renderer: existing DOM, Canvas 2D, Phaser, Three.js | Keep DOM as fallback; implement viewport boundary; benchmark Canvas 2D before Three. Need real-phone device/asset data. | Eng + Art + UX | OPEN |
| D-02 | P0 slice | 7–9 cols fixed vs responsive zoom / dead zone | Prototype 7–9 *as hypothesis*; finalize from 320/390 portrait and landscape tests, tile readability. | UX + Gameplay | OPEN |
| D-03 | P0 slice | Radius-1 fog vs viewport-only concealment vs hybrid | Initially preserve fog behind toggle; decide after exploration and puzzle information test. | Gameplay + UX | OPEN |
| D-04 | P0 slice | Pallet/character asset pack specs | Approve small pilot, consistent projection/anchors/collision footprint and two lighting studies; source images missing. | Art | OPEN |
| D-05 | P1 | HUD size and tile legibility | Date, mm:ss.mmm visual clock, 1 extinguisher slot, back; calibrate with real devices. | UX | OPEN |
| D-06 | P1 | One-swipe-one-cell vs continuous touch | Default prototype one action/gesture on maze surface, accessible optional D-pad and keyboard. | UX + Gameplay | OPEN |
| D-07 | P1 future | Gate key consumes slot vs separate level flag | Defer gate for daily slice; favor level-local non-inventory key flag for first authored-only prototype *if approved*. | Gameplay + Progression | OPEN |
| D-08 | P0 timing change | Server elapsed receipt vs gameplay-only time | Preserve current ranked authoritative time; document mismatched UI clock; study revised timed attempt contract separately. | Engineering + Progression | OPEN |
| D-09 | P1 | Daily “best” vs latest completion in server progress | Audit expectations; do not change leaderboards before migration/test and historical data review. | Progression + Engineering | OPEN |
| D-10 | P0 rewards change | Per-attempt uniform unseen vs one-per-date vs fixed-daily | Preserve code for Slice 01; product owner specify earning eligibility, replay and exhaustion, with idempotency invariants. | Progression | OPEN |
| D-11 | P1 | Rarity label vs statistical weighting | Keep label; no implied drop odds or power until source/reward economy deliberately designed. | Progression | OPEN |
| D-12 | P1 | Stable stored daily grid vs deterministic generation from seed | Distinguish explicitly; validate offline generator method/version and seeding script if reproducibility required. | Gameplay + Engineering | OPEN |
| D-13 | P0 schedule change | Season 2025 static dates vs continuing year-round dailies | Inspect production data and scheduler read-only; choose calendar/timezone/season plan before promise. | Lead + Engineering | OPEN |
| D-14 | P0 catalog change | Destructive seeder vs idempotent upsert and migration | Never rerun `rewardSeeder.js` in production as-is; export actual DB catalog read-only; design additive ID-stable migration. | Engineering + Progression | OPEN |
| D-15 | P1 future | Field Kit vs journal, sets, favorites, achievements | Run 10-entry editorial and accessible UI mock-up first; no persistence until schema and ownership contract approved. | Progression + UX + Narrative | OPEN |
| D-16 | P1 future | Weekend rotation, streak gate, authored schema and results | Postpone access/award policy; use one fixed level only after baseline vertical slice. | Gameplay + Lead | OPEN |
| D-17 | P1 future | Power-ups/timer aid and ranked eligibility | Defer assistance in ranked dailies; assisted category requires explicit durable classification. | Progression + Engineering | OPEN |
| D-18 | P1 | Kearny chronology, real family naming, office era | Retain fictional Kearny and deliberately nonspecific frontier; owner approve family-specific facts/promotional copy. | Narrative + Owner | OPEN |
| D-19 | P0 for heritage publication | Nation-specific Indigenous attribution and sensitive artifact rules | Require source log and sensitivity review; do not make generic sacred-object powers/jokes. | Narrative + Owner | OPEN |
| D-20 | P1 | Accessibility compliance assertions | WCAG 2.2 AA **target**, not certified; prioritize semantic collection/reveal controls and keyboard/gestural parity test. | UX + QA | OPEN |
| D-21 | P1 governance | Documentation source and status authority | Canonical Markdown 00–06 + decision log; archive SG as background, keep DOCX/PDF review exports. | Lead | OPEN |
| D-22 | P1 agent delivery | One-off Codex PR vs custom broker loop | Use existing issue→Codex→tests→draft-PR with role briefs; preserve review/merge human gate; PR #35 not prerequisite. | Lead + Engineering | OPEN |

## Decision recording form

```yaml
decision_id: D-XX
state: OPEN | ACCEPTED | REJECTED | SUPERSEDED
owner: "role / named approver"
date: YYYY-MM-DD
selected_option: ""
evidence: ["repository commit / benchmark / playtest / historical source"]
rationale: ""
impacted_requirements: ["R-..."]
impacted_spec_sections: ["00...", "05..."]
implementation_authorized: false  # separate explicit instruction
migration_and_tests: ""
```

### Policy

**ACCEPTED** approves a requirement/design choice, not a code deployment. Implementation still requires a scoped task brief and source verification. The reader should never treat the document's revision number as blanket permission to change production logic.
