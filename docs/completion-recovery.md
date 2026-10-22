# Completion recovery (Sprint 3)

**Release blocked:** Server PR #2 is merged as `c4f480abb309a7a4d141b20ab462552a868ef0e3`, but Railway has an upstream outage and the production backend still runs its previous version. Keep the production frontend on its existing version. Do not merge or deploy client PR #26 until the backend deployment is complete and all serving replicas are verified to support the new completion contract. A merged server commit does not establish production readiness.

Deploy the companion server idempotent-completions code first, replacing/draining every old API worker. Do not mix old reward-awarding handlers with new ones. No frontend migration is required; the backend adds fields without changing existing response fields. See the server's `docs/completion-reliability.md` for atomicity, data compatibility, and rollout restrictions.

The client keeps the server-issued `attemptId` from maze start. At the exit it freezes movement/time, writes pending intent to sessionStorage **before** submitting completion, and uses a 15-second request timeout. On failure, Retry saving sends the same ID. A reload with pending intent offers recovery without starting a new attempt. A successful response populates results only from server time/reward; pending intent remains through the closing animation and is removed when navigating to results. A slow or lost response cannot trigger a second attempt through recovery. Saving status and error text explain progress; Back to mazes preserves recovery, while the explicit Dismiss recovery action abandons it without undoing any server save.

Recovery state is scoped to the unique profile ID and maze date, in per-tab sessionStorage so independent tabs normally cannot replace each other's attempt IDs. Closing the tab clears sessionStorage; this is refresh/retry recovery, not a cross-device result history. If browser storage is unavailable, no stable-ID completion request is sent until intent can be stored; the normal error/retry UI remains available. Storage availability and storage corruption are browser limitations, not evidence that a result was unsaved. Server ownership validation remains authoritative even for edited browser storage.

Against an old backend that omits `attemptId`, ordinary completion and in-place retry retain the legacy request shape, but refresh-safe recovery cannot be promised. This fallback is for compatibility, not a supported deployment order. Existing clients work against the new backend, but cannot disambiguate retrying an older attempt after another start. Historical completions whose server has no saved response cannot reconstruct an old reward; the server reports that explicitly rather than awarding again.

Validation:

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium CI=true npm run test:e2e -- --workers=2
```

The results display rounds the seconds-to-milliseconds conversion to avoid truncating a server value such as 8.123 to 8.122 through floating-point error.

Client tests cover deferred responses, stable-ID retries, timers, browser refresh, and compatibility without IDs. Browser tests simulate a lost response and refresh using intercepted synthetic API responses; companion backend integration tests exercise real local MongoDB atomicity and lost responses after actual persistence. No production API or MongoDB is used.

Potential simultaneous-sprint overlap: MazePage completion state, tests and API request behavior. The shared-movement sprint is already merged into this branch's latest-main base; its controls, movement rules and sizing are preserved. Coordinate any further edits to the same component. No open repository PRs were returned at initial inspection; this does not detect unpushed branches.

## Contract verification and main integration

Reviewed the merged server `c4f480a` contract: authenticated `POST /maze/start` accepts `{subProfileId, date}` and returns `attemptId` plus the existing maze fields. `POST /maze/complete` accepts `{subProfileId, date, attemptId}` and returns the saved `{time, reward, today, attemptId}` result. The client sends no completion time, uses the same ID for every retry, and reads time/reward from the server. Dates remain YYYY-MM-DD. Ownership is server-validated. The 15-second client timeout does not cancel server persistence, which is why the saved ID must be retained.

The server can return `PROFILE_VERSION_REQUIRED` (409), `LEGACY_COMPLETED` (409), `ATTEMPT_EXPIRED` (410), and retryable save errors. Existing error text and recovery controls surface the server message; returning to mazes preserves pending intent and explicit dismissal abandons it. Historical rewards cannot be reconstructed by the client. Missing-version production records require separately reviewed repair; no client-side fallback can safely bypass server validation. The old production backend may omit IDs or process duplicate completions, so the fallback request shape is not permission to release this frontend early.

Latest client main includes PR #25 (`b7b34ea`). The merge retains its CSS, native document/touch scrolling, safe-area/navigation clearance, calendar bounds and responsive tests. The conflict resolution removes the obsolete maze-wide touch cancellation while preserving recovery state and IDs. Movement, timer and D-pad rules are unchanged. The recovery browser scenario also runs at 320×568 and 844×390, in addition to the original desktop viewport.

Remaining release risks: Railway outage and unverified backend deployment are blocking. Do not change production API bindings or deploy from this branch. After Railway recovery, follow the server's gated no-overlap deployment sequence, verify all backend replicas and staging replay/ownership/error cases, then approve a separate frontend release. A rollback must keep idempotent backend handlers available for pending retries. Per-tab storage does not support cross-device or closed-tab recovery. Physical iOS safe-area/browser-chrome and virtual-keyboard behavior still need device validation, as noted in PR #25.
