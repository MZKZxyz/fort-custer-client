# Completion recovery (Sprint 3)

Deploy the companion server idempotent-completions PR first, replacing/draining every old API worker. Do not mix old reward-awarding handlers with new ones. No frontend migration is required; the backend adds fields without changing existing response fields. See the server's `docs/completion-reliability.md` for atomicity, data compatibility, and rollout restrictions.

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
