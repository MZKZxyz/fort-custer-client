---
name: Work package
about: Scope issue-driven work with approved decisions, gates, and review evidence
title: "[FC-…] "
labels: ""
assignees: ""
---

# Implementable Issue Template

**Assigned owner / independent reviewer:** …

**Pinned main SHA / allowed paths:** …

**Work package:** FC-…

**Owning domain:** …

**Repository / area:** …

**Owner decisions:** OD-…

**Technical gates:** EG-…

**Dependencies / blockers:** …

**Authority:** read-only analysis | prototype-only | branch implementation (never production data)

## Outcome visible to player or operator
Describe measurable behavior; do not specify only file edits.

## In scope / out of scope
Precise bounded change, relevant files and exclusions.

## Acceptance criteria
- [ ] Behavior / fixture expectation
- [ ] Accessibility and viewport behavior where relevant
- [ ] No-regression invariants (movement, timing, completion, reward, existing records)
- [ ] Local test commands and results
- [ ] Rollback / compatibility verified

## Agent contract
Read [approved decisions](../../docs/design/decisions.md), [engineering gates](../../docs/planning/engineering-gates.md), linked specs and current main; complete the authorized scope; create one cohesive draft PR with screenshots/logs. **Do not wait or poll for CI.** No merge/deployment without owner/integrator release approval.
