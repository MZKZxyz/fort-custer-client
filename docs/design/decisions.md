# Fort Custer — Approved Owner Decisions (OD-01–OD-22)

**Approved by the owner in sequential conversation on October 24, 2026.** 22/22 product/governance choices resolved. **Authority: approved requirements, not automatic authorization to deploy, edit production data, run destructive seeders, or merge code.**

**ID policy:** `OD-xx` is the *owner 2AFC sequence*. `AUD-Dxx` is the *different* earlier audit register ID; these are NOT interchangeable. Existing audit IDs remain stable historical references. New items have no audit predecessor.

**Precedence:** explicit owner approvals (`OD`) → approved spec requirements → candidate v1.1 draft suggestions. A current code behavior conflicting with an OD is implementation debt, not evidence that the OD was revoked. An agent must first create a scoped issue with data contract, migration/compatibility, and tests; there is no implicit implementation permission.

| Owner ID | Status | Domain | Priority | Approved decision | Audit crosswalk |
|---|---|---|---|---|---|
| OD-01 | APPROVED | ENG | P0 | Renderer foundation: Evolve existing React/CSS, extract reversible rendering boundary; no mandatory Canvas/Three migration. | AUD-D01 |
| OD-02 | APPROVED | UX | P0 | Responsive framing: Adapt camera zoom across orientations; test 7–9 visible columns on portrait phones as a starting target. | AUD-D02,AUD-D05 |
| OD-03 | APPROVED | GAME | P0 | Visibility: Remove mechanical fog, reveal every in-viewport tile; decorative mist may not obscure interaction; validate difficulty. | AUD-D03 |
| OD-04 | APPROVED | UX | P0 | Continuous directional input: Hold/drag enables repeat of discrete atomic grid moves; hard-stop on release, obstruction, interaction safeguards, modal, completion; retain accessible keyboard and on-screen controls. | AUD-D06 |
| OD-05 | APPROVED | ENG | P0 | Playable-session official time: Server-authoritative time starts from ready/playable handshake, not request creation; latency safeguards, retry/idempotency and historical compatibility required. | AUD-D08 |
| OD-06 | APPROVED | GAME | P1 | Deterministic generation: Future date mazes reproducible by seed + version + configuration; historical stored grids immutable and remain authoritative. | AUD-D12 |
| OD-07 | APPROVED | GAME | P1 | Release calendar: One new daily maze year-round; seasons shape aesthetics/events, not access; schedule and time boundary need engineering specification. | AUD-D13 |
| OD-08 | APPROVED | GAME | P1 | Archive access: Every previously published daily maze remains replayable and catch-up eligible; no unpublished future access. | NEW |
| OD-09 | APPROVED | PROG | P0 | Reward eligibility: First successful completion of each date per subprofile provides one collectible opportunity, including catch-up; replays give no additional item; protect all legacy awards. | AUD-D10 |
| OD-10 | APPROVED | PROG | P1 | Rarity selection: Weight new-item selection by rarity among unowned items; guarantee novelty until exhaustion; disclose/test rates; no paid rolls. | AUD-D11 |
| OD-11 | APPROVED | PROG | P1 | Catalog exhaustion: Award permanent full-collection distinction; no ongoing substitute item or currency once exhausted; preserve completed-at-catalog-version provenance. | AUD-D10 |
| OD-12 | APPROVED | PROG | P0 | Competitive ranking: Permanent leaderboard per dated maze; catch-up and replay runs qualify; fastest valid time per subprofile ranks; preserve legacy records. | AUD-D09 |
| OD-13 | APPROVED | GAME | P1 | Expedition sequencing: First major milestone: improved daily maze. Design extension boundaries now; implement authored expeditions in later milestone. | AUD-D16 |
| OD-14 | APPROVED | GAME | P2 | Future keyring: Keys use level-local expedition keyring; one consumable equipment slot remains distinct; deferred until expedition work. | AUD-D07 |
| OD-15 | APPROVED | PROG | P1 | Collectible abilities: Selected permanent collectibles may unlock optional utilities; assisted runs separated from standard ranked runs; no pay-for-power; server-aware verification; implementation later. | AUD-D17 |
| OD-16 | APPROVED | PROG | P2 | Initial achievements: Launch 5–8 permanent achievements, extensible IDs; retroactive awards only from verifiable historical evidence; no competitive power. | AUD-D15 |
| OD-17 | APPROVED | UX | P1 | Field Journal: Curated Kearny museum journal, collection progress, anonymous undiscovered entries, illustrated detail, source-backed history, clearly fictional annotations, ability labels; incremental after visual milestone. | AUD-D15 |
| OD-18 | APPROVED | NARR | P1 | Historical research standard: Historical factual claims sourced and editorially verified; enhanced Indigenous/sensitive-content review; separate Kearny fiction; preserve stable item IDs; withhold unsupported claims. | AUD-D19 |
| OD-19 | APPROVED | NARR | P1 | Narrative placement: Environmental story, sparse signs, optional Kearny lore, deeper Field Journal and future expeditions; no required dialogue interrupts ranked daily puzzles. | AUD-D18 |
| OD-20 | APPROVED | ART | P0 | Asset standard: Approve polished representative scene then lock common art bible: projections, cell scale, lighting, anchors, occlusion, formats, test gates; renderer-neutral where practical. | AUD-D04 |
| OD-21 | APPROVED | UX | P0 | Accessibility: Accessibility in first milestone definition of done: input parity, reduced motion, readable/responsive UI, semantic focus/keyboard/screen-reader where applicable, WCAG 2.2 AA target for web UI with known limitations. | AUD-D20 |
| OD-22 | APPROVED | LEAD | P0 | Program governance: One cross-repo integrated GitHub Projects program; specialist roles, integrator dependency ownership, cohesive PRs, automated QA, independent review; owner signs product/release gates. | AUD-D21,AUD-D22 |

## Interpretation and guardrails

1. **Release boundaries:** OD-01–04, OD-20–21 are the first user-visible visual/accessibility milestone; the server changes required by OD-05–12 are separate compatibility-sensitive packages, not incidental parts of a renderer PR. OD-13–16 and the ability system OD-15 do not authorize expedited implementation ahead of the daily-maze foundation.
2. **Competitive classes:** default ranked runs exclude collectible-granted abilities (OD-12, OD-15). Assisted runs require durable classification, server-aware validation, and separate display policy; the precise class protocol is an OPEN engineering gate (EG-05).
3. **Historic data:** retain historical grids, rewards, attempts, and results. A schema/data migration is not allowed to reinterpret old times as if the new playable-session handshake existed. Introduce provenance/version markers as needed.
4. **Reliable timing:** a server-authoritative readiness handshake is a desired contract, *not proof that network latency and manipulation are solved*. An implementation proposal must address spoofing, timeouts, retries, reconnects, clock authority and scoring before ranked launch (EG-01).
5. **No unreviewed content publishing:** full-collection distinction must survive expansion; 112 rewards are defined in source seeder, but the live DB catalog has NOT been verified and the existing seeder is destructive.
6. **Working register vs remote:** this file contains the approved owner decision record. GitHub Issues/Projects are not considered created until their live URLs are confirmed.

## Source and supersession

- Owner's OD choices: conversation, October 24, 2026, choices OD-01 through OD-22.
- Earlier proposed IDs: [archived audit decision register](../archive/candidate-v1.1-reference/AUDIT_Decision_Register.md) (historical `D-xx` labels crosswalked here as `AUD-Dxx`); many recommendation paths were intentionally overridden.
- This register supersedes **only** conflicting product choices in the v1.1 candidate specifications. Repository contracts and production assertions still require live read-only verification.
