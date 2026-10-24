# GitHub Projects — Fort Custer Development (proposed configuration)

## System boundary and ownership

One cross-repository **GitHub Project** named `Fort Custer Development` tracks work items and PRs from `MZKZxyz/fort-custer-client`, `MZKZxyz/fort-custer-server`, and, where genuinely needed, `MZKZxyz/fort-custer-automation`. Do **not** move game design source of truth into the automation runtime or create autonomous microservices for each specialist.

- **Specs and accepted product policy:** `docs/design/decisions.md` plus canonical Markdown 00–06 after owner-review promotion; Git version history owns old decisions.
- **Operational truth:** GitHub issue for objective, owner, status, acceptance, dependency and task-level changes.
- **Implementation truth:** target repository branch, linked PR, tests and review comments.
- **Runtime truth:** latest verified deployment state, not issues or documentation.

## Minimum project fields

| Field | Type | Values / use |
|---|---|---|
| Status | Single select | Backlog, Decision needed, Ready, In progress, In review, Blocked, Done |
| Domain | Single select | Producer, Gameplay, Art, Narrative, Progression, Engineering, UX/QA |
| Priority | Single select | P0, P1, P2 |
| Workstream | Single select | Visual slice, Systems, Content, Expeditions, Infrastructure |
| Iteration | Iteration | 2-week planning cadence as starting point, adjust after 2 cycles |
| Effort | Single select | S, M, L (planning estimate, not fixed SLA) |
| Target milestone | Text or single select | VS-01 Visual daily maze, SYS-01 Trusted daily systems, JOUR-01 Journal, EXP-01 Expeditions |

Avoid proliferating custom fields. Use native issue assignee and parent/sub-issue, linked PR, labels and blocked-by references. Reserve two weekly review windows for producer triage if useful; agents shouldn't churn static specifications every sprint.

## Saved views

1. **Program Board**: status Kanban; filter planned work only; grouped by Status.
2. **Current Iteration**: board or table filtered to current iteration, sort by priority and dependency.
3. **Domain Views**: one view filtered by Domain for each specialist, not separate projects.
4. **Dependencies & Blockers**: table filter Blocked/Decision needed; include milestone and owner.
5. **Release Readiness**: items by Target milestone with QA/review status.
6. **Owner Inbox**: `Status = Decision needed`; limit to consequential decisions, not routine code choices.

## Live bootstrap status (October 24, 2026)

[Fort Custer Development](https://github.com/users/MZKZxyz/projects/1) exists. [Program issue #29](https://github.com/MZKZxyz/fort-custer-client/issues/29) records the owner confirmation that issues were added on October 24. Project fields, views and membership have not been independently verified through the connector. The configuration below remains a proposal; do not create another board. Live work-package links are in the [roadmap](implementation-program.md).

## Remaining configuration in GitHub UI

1. Open the [existing board](https://github.com/users/MZKZxyz/projects/1); inspect its current configuration.
2. Create minimal fields above, an Iteration field, and the saved views; if desired configure a two-week iteration cycle.
3. Add repositories as sources by adding existing issues/PRs. Auto-add workflows are plan-limited; on GitHub Free, only one auto-add workflow may be available. If that's insufficient for three repos, explicitly add issues or use a narrowly-scoped action later. Do **not** assume project creation or cross-repo auto-add has occurred.
4. Enable built-in Status → Done on issue closure / PR merge (after reviewing desired behavior), and verify which PRs/issues it applies to.
5. Backfill already active client issues #27/#28 and server issue #3 only after triage; do not auto-close, relabel, or duplicate them without inspection.

**Connected-tool limitation:** current GitHub connector can work with issues and PRs, but does not expose GitHub Projects GraphQL create/configuration actions. The live board exists and issue population is owner-confirmed; remaining custom fields/views are unverified. This PR changes documentation only.

## Workflow and quality gates

`Backlog → Ready → In progress → In review → Done`, with `Blocked` and `Decision needed` escape hatches. `Ready` requires accepted OD references, no unresolved blocking EG, exact scope, acceptance, test commands, dependencies and output artifact. A scoped issue is the agent's prompt.

- **One integrator** controls shared `MazePage` edits, PR ordering and release branches. Multiple specialists may operate in parallel on art/research/pure contracts; avoid simultaneous edits to the same high-risk service or view.
- **Meaningful PRs** include a coherent behavior or integration slice, tests, fixture coverage, screenshots and rollback. Don't raise tiny PRs solely to change one status/checkbox.
- **Agent execution stops after commit/push/PR update and local check report**; do not poll or wait for GitHub CI. Integration/QA checks it subsequently. No automatic merge or production deployment.
- **Independent QA** reviews acceptance criteria and regresses related invariants before Ready for owner/release review.
- **Owner approval** reserved for visually decisive art, changes to gameplay/economy/ranked meaning, security-sensitive migrations, and release gates. Engineer may decide internal implementations while preserving OD contracts.
- **Timing:** first use one or two coherent user-visible PRs per iteration rather than optimizing an invented sprint velocity. Capacity can be revised after observing real PR cycle time.
