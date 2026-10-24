# Approved owner choices — Spec reconciliation map

The clean v1.1 documents contain `OPEN`, `PENDING`, `PROPOSED`, and planned behavior that the owner has now decided differently. Do not treat the unedited v1.1 draft as an equal authority. This map tells each specialist which sections to update when a scoped documentation PR promotes the drafts into approved specs; it intentionally does not silently manufacture a new 7-document v1.2 rewrite.

| Spec | Reconcile approved contract | Decisions | Implementation / acceptance evidence |
|---|---|---|---|
| 00 Project Charter | Promote year-round archive-based daily game, separation of visual vs persistence milestones, integrated program governance and issue-centric workflow; replace pending approvals | 07,08,13,22 | Milestone dependencies; agent/approval RACI |
| 01 Gameplay | Remove radius-one fog; responsive viewport; continuous discrete-step repeat; future level-local keys; permanent repeatable archive; deterministic future generation | 02,03,04,06,07,08,13,14 | Rule/visibility fixtures, no accidental fire double-consumption, deterministic replay corpus |
| 02 Art | Pilot and owner approve representative scene before locking asset pipeline; renderer-neutral sprites/anchor geometries, occlusion and tile readability | 01,02,03,20 | Contact sheet and actual viewport screenshots on small phone/landscape |
| 03 Narrative | Optional environment storytelling, researched historical facts, provenance and sensitivity review, clearly distinct family fiction | 17,18,19 | Source ledger, sensitivity queue, item IDs preserved, copy review |
| 04 Progression | One reward eligibility per date, weighted unowned, no consolation after exhaustion, permanent distinction, fastest-ranked results, assisted class, achievements, curated Journal | 09,10,11,12,15,16,17,18 | Idempotency, simultaneous race, legacy migration, published rates, distinct rank classes |
| 05 Engineering | DOM-first reversible viewport; server ready/playable timing handshake; future deterministic versioned generation, year-round pipeline, best-valid leaderboards and reward-migration hazards | 01,02,04,05,06,07,09,10,12,15,22 | Contract RFC, version-safe rollout, rollback, targeted server regression, no live seeder run |
| 06 UX / QA | Adaptive camera, no mechanical fog, continuous input + accessible alternatives, inclusive first milestone, Field Journal future | 02,03,04,17,21 | 320×568/390×844/844×390/desktop, motion, screen reader and keyboard, focus QA |

### Reconciliation discipline

- **Contract changes are not no-op edits.** Revise tests that currently assert full-grid/fog only after implementation scope is approved and preserve regression coverage of canonical movement and saving.
- The supplied audit reports the following at its [pinned source baseline](../archive/candidate-v1.1-reference/AUDIT_Repository_Baseline.md), not as verified production behavior: `completeAttempt` uses server receipt; progress stores last completed; rewards are selected unweighted per attempt and may become null when exhausted; generation seeder is not deterministic; leaderboard has a legacy season window.
- **No mass rewrite with 22 pending tickets.** Update the source-owning spec when a coherent issue implementing its area is started, linking the accepted OD IDs. Keep one `decisions.md`, not separate duplicate decision files in each repo.
- [Archived domain drafts 00–06](../archive/candidate-v1.1-reference/README.md) are **candidate v1.1**, not all owner-approved prose. Until replaced, this OD register and change map clarify the delta.
