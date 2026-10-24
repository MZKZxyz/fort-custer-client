# FC-JOUR-01 — Curated Field Journal editorial pilot and accessible information architecture

**Status:** Historical seed draft; published as [FC-JOUR-01](https://github.com/MZKZxyz/fort-custer-client/issues/34). The live issue owns scope, readiness and acceptance; do not create a duplicate. **Domain:** Narrative. **Priority:** P1. **Workstream:** Content. **Owner decisions:** OD-16, OD-17, OD-18, OD-19.

## Objective and expected evidence
10 sourced historical entries, culture review gate, anonymized undiscovered concept, keyboard/screen-reader detail flows, preserve IDs, journal implementation after core slice.

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
