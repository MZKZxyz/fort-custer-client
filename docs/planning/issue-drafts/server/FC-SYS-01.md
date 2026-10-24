# FC-SYS-01 — RFC: playable-time handshake, permanent best leaderboards and assisted classification

**Status:** Historical seed draft; published as [FC-SYS-01](https://github.com/MZKZxyz/fort-custer-server/issues/5). The live issue owns scope, readiness and acceptance; do not create a duplicate. **Domain:** Engineering. **Priority:** P0. **Workstream:** Systems. **Owner decisions:** OD-05, OD-12, OD-15.

## Objective and expected evidence
Read-only design + state/latency/race tests: server clock, compatibility of old score eras, best valid time, ranked/assisted durability and rollback. No production changes.

## Scope control
- Begin with read-only source inspection and fixture baseline.
- Before coding, identify dependencies and EG gates from [engineering gates](../../engineering-gates.md); link the relevant owning specification.
- Do not overwrite existing issue responsibilities or concurrent shared-file changes.
- No live MongoDB writes, destructive seeder use, secret changes or deployment.
- Build one cohesive PR only when implementation is authorized; run local test suite; push/update draft PR; **do not wait for GitHub CI**.

## Definition of ready
- [ ] Dependencies triaged and current code pin documented.
- [ ] Exact acceptance tests and target viewports or API fixtures specified.
- [ ] Agent authority and allowed paths explicit.
- [ ] Independent QA or editorial reviewer identified.
