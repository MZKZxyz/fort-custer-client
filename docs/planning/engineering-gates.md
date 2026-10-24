# Fort Custer — Engineering and editorial gates remaining after owner approval

Owner choices are **complete** (22/22). These are bounded technical/verification gates. Technical agents can recommend defaults inside scoped issues; ask the owner again only for decisions that materially change approved behavior, ranked fairness, costly scope or deployment risk.

| Gate | Area / owner | What remains to prove or specify | Deliverable and pass condition |
|---|---|---|---|
| EG-01 | Server / timing | Readiness handshake, idempotency, who starts timed window, client readiness trust, network jitter, reconnect/disconnect, late completions, replay attempts and anti-tampering | Written versioned protocol and executable state/latency fixtures; no unsupported 'network-neutral' claims |
| EG-02 | Server / ranking | Legacy latest vs new personal-best records; preserving historical times measured by old methodology; daily, weekly, all-time compatibility; data provenance | Migration plan with versioned scoring class, reversible indexing and historic preservation; competitive display cannot equate incomparable timing eras without clear labeling |
| EG-03 | Progression + server | Date-level one-time eligibility even across parallel attempts, profile ownership, backfill old awards, retry snapshot, exhausted catalog, catalog expansion distinction | Atomic transition tests including simultaneous completions, retries and legacy edge cases |
| EG-04 | Progression | Exact weighted rarity table, seeded test behavior, 112-source-item taxonomy and live catalog comparison; source seeder deletes all records | Published probability policy; nondestructive catalog reconciliation; no production `rewardSeeder.js` execution |
| EG-05 | Game + server | Durable ranked/assisted class, ability opt-in semantics, server ability proof, best times in each class, legacy classification | RFC and tests before any ability runtime implementation; never rank assisted runs with standard runs |
| EG-06 | Game + server | Source seeded RNG shared with writer/analyzer; algo/config version, rejection determinism, grid immutability, calendar UTC cutover/publisher and availability monitoring | Reproducibility fixtures, no historical rewrites, outage/late publication handling |
| EG-07 | Client UX | Continuous pointer-repeat speed, trigger thresholds, movement arbitration, fire interactions, D-pad/keyboard parity, scroll/zoom and reduced motion | Usability fixtures + Playwright input/resize tests; no accidental skip/double interaction |
| EG-08 | Art + rendering | Pilot projection/ratio/anchor export, occlusion, tile legibility, DOM rendering performance and decision to reconsider Canvas after measured failure | Owner-signed representative scene; real device performance; revert path |
| EG-09 | QA + Gameplay | Removing mechanical fog changes observed corridors/difficulty; responsive camera changes information advantage | Representative maze playtests and analyzer comparison, especially ranked fairness |
| EG-10 | Narrative + Progression | 112 source item editorial statuses, culture-specific claims, provenance citations, rights to art/branding | Sample of 10 varied entries + sourcing worksheet before scale-out; stable existing item IDs |
| EG-11 | UX + QA | WCAG 2.2 AA applied web UI; keyboard semantic inputs, focus order, live results, motion, contrast; meaningful game-specific nonvisual limitations | Test checklist + device/browser matrix + exceptions documented |
| EG-12 | Producer + Eng | Current live deployment, daily publisher, database contents, repo refs, existing issues #27/#28/server #3, automation repository PR #35 (separate from client QA issue #35); scope and CI | Read-only triage report, not inferred from source. No CI polling by Codex; no secrets or production writes. |

## Global invariants

- Gameplay `move()` remains single-source transition logic until a rigorously covered extension replaces it; fire-clearing does not advance the player on that action.
- Existing UUID `attemptId`, immutable completion result snapshots, subprofile ownership, and optimistic concurrency must remain correct during changes.
- Historic grids and rewards are preserved. Never run the destructive reward seeder as a read-only catalog operation.
- Ranked and assisted times cannot silently mix, and historical clock methods cannot be silently relabeled.
- Architectural migrations and data migrations must have separate risk/rollback gates.
