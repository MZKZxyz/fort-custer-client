# PR #54 — result ownership correction

Failed head: `81798c7c8123def0c98804f9d1d30cb635f94add`.
[Independent P2 report](https://github.com/MZKZxyz/fort-custer-client/pull/54#pullrequestreview-5678588004)
and [integrator correction review](https://github.com/MZKZxyz/fort-custer-client/pull/54#pullrequestreview-5678650070).
The correction stays on the existing PR branch and requires fresh independent re-QA.

## Failure and correction

Replay was owner-gated, but the result page still read and displayed globally
cached date/time/reward/best state. Its mount effect also consumed lastNewRecord
under the wrong identity. A mismatch warning did not prevent disclosure.

Results now render private content only from a validated version-2 saved receipt
whose original profile and account binding match the current identity. A local
SHA-256 scope binds a JWT account ID across token renewal; an opaque sign-in is
bound to its exact token without storing that token in the receipt. This is a
local presentation guard, not a server signature or a substitute for API auth.

The context stores the actual saved time, reward snapshot, personal-best boolean
and original attempt UUID together with the owner/date metadata in one atomic
sessionStorage value. Results do not infer a date from selectedMazeDate or read
private fields from lastMazeTime, lastReward or lastNewRecord. Changes to those
global mirrors cannot replace the preserved receipt's contents.

The private subtree is gated before rendering. Identity/storage/focus lifecycle
notifications synchronously remove it, independently of catalog callbacks.
Pending identity-hash verification is scoped to the initiating identity/context;
late callbacks cannot authorize another player. Private child renders and reveal
callbacks also check the live scope, and unmount cancels reveal timers. The
neutral state reveals no original date, time, reward, best banner or reveal
controls and provides safe player/sign-in/archive navigation.

Viewing under another identity never deletes the receipt, consumes the reward or
best flag, creates an attempt, or resubmits completion. Returning to the original
owner restores the saved snapshot even when the catalog returns HTML 404/503.
Logout can clear the legacy localStorage mirrors without losing the owner-bound
session receipt. Original per-tab lifetime remains unchanged.

## Conservative compatibility

Missing/malformed metadata, an invalid payload, and version-1/unbound result
contexts remain hidden. An old profile/date label alone cannot prove ownership
of globally shared cache values; the viewer must not assign those values to the
currently active player. These legacy values are retained unchanged, not erased
or reconstructed. A still-pending original UUID can recover its actual server
snapshot through the existing completion retry, including on the older backend
without an archive endpoint, and then save the new bound context.

Binding happens after receiving the saved server response and before changing
legacy cache mirrors. A binding/storage failure retains the existing recovery
UUID for retry; it does not create another start or alter scoring. Web Crypto is
required for this local binding; failure is conservative and recoverable with
that same saved attempt. The v2 results branch, transport, activation gates,
movement, HUD, scores, reward selection and backend are unchanged.

## Final author verification

Node 24.19.0; Playwright 1.62.1; Chromium 154.0.8037.57; disposable MongoDB 8.0.16.
Server reference remains `1f668d23477aa62557bd531e501ce5f6771bdd0c`.

| Check | Result |
| --- | --- |
| Complete noninteractive Jest suite | 229 passed, 17 suites, zero failed/skipped |
| Optimized flag-OFF build | Passed |
| Complete archive/gameplay/privacy/viewport browser suite | 131 passed, 28 explicit skips, zero failed/flaky |
| Default v2-OFF browser cases | 2 passed, 14 opt-in skips |
| Cached v2 results route | 5 passed, zero skipped |
| Actual merged routes + disposable Mongo integration | 1 passed, zero skipped |

The 28 main-suite skips remain existing opt-in camera/sprite/input-preview or
unsupported desktop-touch scenarios. The 14 other skips require v2 opt-in, which
was not enabled. Exact skip names/reasons, corrected source hashes and image
hashes are in [remediation-validation.json](remediation-validation.json).

New tests cover the independent reproduction at five viewport sizes; mounted
A → B → A; wrong initial player; logout and account changes; absent/malformed or
legacy context; stale proof/reveal callbacks; global-cache changes; reward image,
name, description and personal-best privacy; reload; opaque sign-ins; a valid
owned receipt with corrupt selected-date storage; and same-UUID retry after a
binding failure. Checks read the DOM immediately after a switch event returns.

The old-backend save-recovery browser case still uses one start and two identical
completion payloads with the same original UUID. It now also switches away from
and back to the recovered result while the catalog is absent. The real Mongo
flow verifies an actual saved owner-bound receipt, immediate concealment under
another profile, restoration during a simulated missing catalog, unchanged
receipt/UUID, and one total attempt before resuming the daily leaderboard flow.

```sh
CI=true npm test -- --watchAll=false --runInBand

env -u REACT_APP_EXPERIMENTAL_SESSION_V2 -u REACT_APP_MAZE_CAMERA \
  -u REACT_APP_MAZE_VISUAL_INTEGRATION -u REACT_APP_MAZE_INPUT_PREVIEW \
  -u REACT_APP_MAZE_VISUALS CI=true REACT_APP_API_URL=/api npm run build

FC_RESULT_EVIDENCE=docs/archive-client/remediation-evidence CI=true \
  node_modules/.bin/playwright test --config=docs/archive-client/playwright.config.cjs

FC_BUILD_DIR=build FC_V2_EXPECT_OFF=true CI=true \
  node_modules/.bin/playwright test --config=docs/client-v2/playwright.config.cjs
FC_BUILD_DIR=build CI=true node_modules/.bin/playwright test \
  --config=docs/client-v2/playwright.results.config.cjs

env -u MONGO_URI -u MONGODB_URI -u MONGO_URL -u DATABASE_URL \
  FC_ARCHIVE_SERVER_REFERENCE="$FC_ARCHIVE_SERVER_REFERENCE" \
  MONGOD_BINARY="$MONGOD_BINARY" CI=true node_modules/.bin/playwright test \
  --config=docs/archive-client/playwright.integration.config.cjs
```

All APIs/identities in these checks are synthetic/disposable. Physical mobile,
actual screen-reader speech and a complete accessibility audit remain unverified.

| Private result state | Viewport | Full page |
| --- | --- | --- |
| Player B: neutral, no A fields | [image](remediation-evidence/other-player-neutral-viewport.png) | [image](remediation-evidence/other-player-neutral-page.png) |
| Player A restored: original snapshot | [image](remediation-evidence/owner-restored-viewport.png) | [image](remediation-evidence/owner-restored-page.png) |

This is engineering evidence, not independent acceptance. Keep PR #54 draft for
re-QA at the new exact head. Production release is still separately blocked on
the approved legacy publication inventory/runtime wiring, schema/index and
old-client/rollback checks, actual API deployment and coordinated owner approval.
No merge, production access/configuration change, art PR #52 modification,
publisher, schedule, v2 enablement or GitHub CI polling occurred.
