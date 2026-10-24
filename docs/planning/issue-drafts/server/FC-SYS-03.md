# FC-SYS-03 — Plan safe one-per-date rarity-weighted rewards and catalog migrations

**Status:** Historical seed draft; published as [FC-SYS-03](https://github.com/MZKZxyz/fort-custer-server/issues/7). The live issue owns scope, readiness and acceptance; do not create a duplicate. **Domain:** Progression. **Priority:** P1. **Workstream:** Systems. **Owner decisions:** OD-09, OD-10, OD-11.

## Objective and expected evidence
Read-only 112-item source catalog vs live DB (if access approved), atomic first-date eligibility, immutable retries, weighted rates proposed, versioned completion distinction. No destructive seed run.

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
