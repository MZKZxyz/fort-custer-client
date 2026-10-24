# Fort Custer approved development program

Source: `Fort_Custer_Approved_Decisions_Program_v1_2.zip`, supplied for [program issue #29](https://github.com/MZKZxyz/fort-custer-client/issues/29). The bundle is source material; this documentation bootstrap does not dispatch its implementation work. Client main was verified through GitHub as `fa3ada6a2cdda4fd455fbc8edc0bfc8c1d140c27` on October 24, 2026.

- [Approved 22-decision register](../design/decisions.md) and [machine-readable decisions](../design/owner-decisions.json) define approved product intent, with the old audit crosswalk.
- [Specification reconciliation map](../design/spec-reconciliation-map.md) records required changes against [candidate v1.1 reference material](../archive/candidate-v1.1-reference/README.md). The archived specifications are not competing canonical authority.
- [Engineering and editorial gates](engineering-gates.md) bound unresolved evidence and compatibility work.
- [Development roadmap and live work packages](implementation-program.md) describe sequencing, independent QA and dependencies.
- [Live Fort Custer Development board](https://github.com/users/MZKZxyz/projects/1) tracks execution; [board configuration blueprint](github-projects-blueprint.md) distinguishes confirmed existence from unverified custom fields/views.
- [Root agent contract](../../AGENTS.md) and [work-package issue template](../../.github/ISSUE_TEMPLATE/work-package.md) define scope and review boundaries.
- [Seed inventory](seed-issues.csv) retains the source planning summaries with published issue URLs; files under `issue-drafts/` are historical seed text, not instructions to file duplicates. Live issue scope takes precedence.
- Existing [project README](../../README.md) and [completion-recovery documentation](../completion-recovery.md) remain unchanged. Neither this program nor a merged source commit establishes production readiness.

## Live issue reconciliation (October 24, 2026)

Issue bodies and open states were read from GitHub for client #27–35 and server #3, #5–7. All work packages remain planning backlog/scope review, not automation-ready. “Can start” in the roadmap describes dependency sequencing, not unattended implementation permission. Before Ready, pin source revisions, allowed paths, acceptance evidence and independent reviewers. No labels, issue bodies or project configuration are changed by this PR.

| Existing issue | Evidence and planning disposition |
|---|---|
| [Client #27](https://github.com/MZKZxyz/fort-custer-client/issues/27) | Maze-loading failure/retry scope. Keep open and separate pending integrator triage with VIS-02/04; preserve its responsibility and avoid a duplicate. |
| [Client #28](https://github.com/MZKZxyz/fort-custer-client/issues/28) | Season configuration scope predates OD-07 year-round publishing. Do not dispatch its old wording; reconcile calendar/archive boundaries in [SYS-02](https://github.com/MZKZxyz/fort-custer-server/issues/6) before implementation. |
| [Server #3](https://github.com/MZKZxyz/fort-custer-server/issues/3) | Existing deterministic-generation rejection investigation. Reuse its analyzer evidence in SYS-02; retain the investigation rather than duplicate it. |
| [Client #35](https://github.com/MZKZxyz/fort-custer-client/issues/35) | FC-QA-01 is the live independent QA package. It is separate from [automation repository PR #35](https://github.com/MZKZxyz/fort-custer-automation/pull/35), which is not a gameplay dependency. |

The owner confirmed board population in issue #29 on October 24. Connector access does not independently verify Project v2 membership, fields or views. Keep #29 open for remaining governance completion; no closing keyword is used in this PR. The issue's older “create/select board next” sentence is superseded by its later confirmation and the live board link.

## Publication notes

The supplied root README is replaced in this publication by this additive index so the repository README is preserved. All 22 approved decision entries and JSON records are retained verbatim. The candidate archive retains each historical document body below an explicit reference-only banner. Planning edits correct board/issue existence, qualify unverified runtime claims, add independent QA, and make the issue template selectable in GitHub. No canonical 00–06 rewrite is claimed.
