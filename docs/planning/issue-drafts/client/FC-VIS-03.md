# FC-VIS-03 — Build responsive player-following viewport and remove mechanical fog

**Status:** Historical seed draft; published as [FC-VIS-03](https://github.com/MZKZxyz/fort-custer-client/issues/32). The live issue owns scope, readiness and acceptance; do not create a duplicate. **Domain:** Engineering. **Priority:** P0. **Workstream:** Visual slice. **Owner decisions:** OD-02, OD-03, OD-21.

## Objective and expected evidence
Player clamp, no void, 7–9 phone columns as test hypothesis, portrait/landscape, reduced motion, clear tiles in viewport; input + fog regression.

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
