# FC-SYS-02 — RFC and fixtures: deterministic, immutable, year-round daily publishing

**Status:** Historical seed draft; published as [FC-SYS-02](https://github.com/MZKZxyz/fort-custer-server/issues/6). The live issue owns scope, readiness and acceptance; do not create a duplicate. **Domain:** Gameplay. **Priority:** P1. **Workstream:** Systems. **Owner decisions:** OD-06, OD-07, OD-08.

## Objective and expected evidence
Reproducible seed/version/config, keep historical grids immutable, calendar UTC proposal, reconcile legacy 2025 boundaries and existing server issue #3, no prod data writes.

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
