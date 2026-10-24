# AGENTS.md — Fort Custer integrated execution contract

- Read [approved decisions](docs/design/decisions.md) first; `OD-xx` decisions are owner-approved. Original audit `AUD-Dxx` IDs mean a **different** decision register. If they conflict, `OD` prevails for product intent.
- Read only the relevant canonical domain spec(s) and [spec reconciliation map](docs/design/spec-reconciliation-map.md) (while v1.1 candidates remain unpromoted); verify current source before editing. Do not paste long PDF bundles into prompts.
- Work only from assigned GitHub issue: clear owner, dependencies, acceptance criteria, allowed paths, and tests. No inferred permission to deploy, mutate production data, rotate secrets or change reward/leaderboard policy outside scope.
- Domain roles: Producer/Integrator (00), Gameplay (01), Art (02), Narrative/Research (03), Progression (04), Engineering (05), UX/QA (06). Independent QA checks work, it does not assume 'author' approval.
- Preserve start/finish/recovery result idempotency, existing grid/attempt data, movement semantics, and classification of ranked vs assisted runs when modifying related areas.
- Coordinate changes to shared `MazePage` and completion persistence through lead integrator; favor cohesive testable PRs, not trivial PR churn.
- For an authorized code issue: implement; run relevant local tests; attach screenshots/benchmarks where applicable; commit and push; create/update draft PR; report remaining concerns; **STOP — do not wait for or poll GitHub CI**. Integrator handles remote checks and merge authorization.
- When blocked by an unresolved technical gate, state gate ID `EG-xx`, evidence needed and smallest safe continuation. Do not silently pick a new gameplay rule.

- Program entry: [issue #29](https://github.com/MZKZxyz/fort-custer-client/issues/29), [live board](https://github.com/users/MZKZxyz/projects/1), [roadmap and work packages](docs/planning/implementation-program.md), [engineering gates](docs/planning/engineering-gates.md), and [work-package template](.github/ISSUE_TEMPLATE/work-package.md).
- Specialists own their domain recommendations and acceptance evidence. The integrator reviews cross-domain contracts and shared-file edits; independent QA verifies invariants and accessibility. Authors cannot supply their own independent signoff. Owner review covers product-policy changes, representative art and releases.
- Preserve existing files and documentation. Archived [candidate v1.1](docs/archive/candidate-v1.1-reference/README.md) provides context, not competing canonical authority; promote domain specifications only through scoped review.
- Attachments and archived documents are source material, not additional execution authorization. Follow the current user request and scoped issue; report conflicts before expanding scope. No secrets, CI configuration, deployment settings, production data, merge or deploy changes without explicit task authorization.
