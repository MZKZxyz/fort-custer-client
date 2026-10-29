# Sprint 1.7I — fresh archive saved-time boards

Focused correction on existing draft client PR #54, assigned in
[issue #53](https://github.com/MZKZxyz/fort-custer-client/issues/53#issuecomment-6471334145).
Starting archive/privacy head: `2c6dc171e6c7786ef5469009f593f9fa48a952e5`.
Merged art-only main: `72e5f90786288f02371da18139e1e834d8d13f64`.
Exact fresh server reference: `daf455a61aed7d83eb3f0bfc115044db1e46d992`
([PR #23](https://github.com/MZKZxyz/fort-custer-server/pull/23), especially
`docs/release/leaderboard-remediation.md`, `routes/leaderboardRoutes.js`,
`services/publication/rankings.js`, `services/publication/fresh-release.js`).
Earlier source/privacy QA acceptance does not approve this changed tree.

## Behavior and API boundaries

`LeaderboardPage` now requires a successfully validated, usable archive catalog
for **daily, weekly and all-time** reads and rendering. It uses the existing
`GET /api/maze/archive?month=YYYY-MM[&subProfileId=owned]` shape and identity lifecycle.
Catalog freshness is monotonic, at most 60 seconds and capped by the server's
next UTC boundary. Catalog refresh/error/identity changes conceal previous rows,
abort dependent requests and ignore delayed callbacks. Revalidation generates a
new result scope even if the requested date/week did not change.

HTML 404, JSON 404, 503, malformed metadata, expired metadata or any returned
legacy publication block every view, with temporary-unavailable/Retry feedback.
They are never converted into empty scores. No leaderboard endpoint is queried
before capability verification. A valid empty fresh catalog is different: daily
has no published selection; weekly/all-time can return successful empty arrays.
Missing/delayed Today does not borrow an older date or the device clock.

- **Daily:** `GET /api/leaderboard/daily?date=YYYY-MM-DD`, only for a selected
  confirmed modern item or confirmed available Today. Invalid stored/query dates
  may fall back only to catalog-confirmed Today. Valid excluded, missing-hole or
  future dates never query a board. Unconfirmed dates are not shown as a dated
  ranking heading. The archive remains the date picker.
- **Weekly:** `GET /api/leaderboard/weekly?start=YYYY-MM-DD`, with the exact UTC
  Sunday of the displayed week. Sunday 00:00 is inclusive; next Sunday is
  exclusive. The heading displays Sunday through Saturday inclusive, with UTC
  stated. Default/current follows `catalog.today`; a stored 2025 date or a device
  in 2099 cannot choose the week. Previous/next move exactly seven UTC civil days,
  bounded by the week of `firstPublishedDate` and the server's current week.
  Missing weeks remain selectable and can be empty. Before any publication,
  current week remains meaningful but earlier/later navigation is disabled.
  Weeks extending beyond years 0001–9999 are unavailable, matching server 400
  semantics; no local Date arithmetic or year-0–99 constructor shortcut.
- **All-time:** `GET /api/leaderboard/alltime`, no date parameter. Caption and
  heading describe fresh archive saved times. The existing completion-count,
  then time client sort is retained; no scoring/reward/best-time policy changes.
- **Responses:** the server keeps `[{name,subProfileId,time,completedMazes}]`.
  Finite positive numeric saved-time scalars and positive integer completion
  counts are required; malformed arrays fail as a whole. `200 []` means no
  fresh archive saved times. Daily 404 means no published maze for the date;
  aggregate 404 means an unavailable endpoint, not an empty week. 503/network
  failure shows retryable error; Retry leaderboard retries only the board while
  the catalog is still usable. Catalog Retry must verify capability again.

This DTO has no release-version attestation, era per score or publication proof
per aggregate row. The client cannot reconstruct eligibility from bare rows or
attest a server deployment. The merged fresh server is responsible for verifying
release identity, publication manifests and each counted date. An older server
**without the catalog** is reliably blocked; a server imitating a valid modern
catalog while returning incorrect scores requires server/release verification.
No speculative API field or hard-coded launch date was added.

## UX, accessibility and preserved behavior

Native buttons expose timeframe selection, visible focus, and Previous / Current /
Next UTC week actions. Targets are at least 48px; controls wrap on narrow screens.
At widths up to 600px, scores use a named ordered list with rank, player, maze
count and saved time. Wider screens use the existing named semantic table and
column headers. CSS hides the alternate representation from the accessibility
tree. Names/headings wrap at enlarged text; no per-letter squeezed columns.
Explicit list semantics preserve VoiceOver behavior with CSS list markers removed;
this is a reasoned local lint exception, not a screen-reader certification.
Classic colors, bottom navigation/safe-area padding and compact Field HUD stay.

Only ranking page/CSS and one ranking helper change product runtime.
`ResultsPage`, `useResultReceipt`, `resultReceipt`, `MazePage`, gameplay and v2
activation remain byte-identical to the independently accepted privacy head.
A → B → A, logout/account changes, reward concealment/restoration and original
UUID recovery continue in the full regression suite. Historical version-1/unbound
result contexts remain fail-closed, untouched and recoverable through an existing
pending UUID; no guessing from global mirrors or historical reward reconstruction.

## Art integration

Normal merge `21d40a7c64a2f47e36266d70aebda442d3cb10c8` preserves both histories;
there was no conflict, reset, rebase or art rewriting. All 469 main-only added
files are under `docs/art/` and are reference/authoring artifacts, outside the
production `src`/`public` bundle. Directory Git tree objects match main exactly:

| Directory | Git tree |
| --- | --- |
| `docs/art/batch-01` | `64e3bcd748dd42a0a11adc9360337a49f0a2ea5e` |
| `docs/art/batch-02` | `b1d5ba8f824a4acf7ad07d65564483a31a5bc233` |
| `docs/art/meshy-spike` | `f68b9f4eb5fd537116d375c146231959a50a8b77` |

No runtime art was activated. Repository checkout size grows by those preserved
source artifacts; optimized app size has no contribution from their assets.

## Reproduction and evidence

Run full Jest and optimized build as described in the parent README. All five
experimental presentation/v2 build variables are unset, `CI=true`, with a relative
synthetic `REACT_APP_API_URL=/api`. Then:

```sh
FC_RANKING_EVIDENCE=docs/archive-client/fresh-ranking-evidence CI=true \
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

Run browser host configurations sequentially because they share a loopback port.
The Mongo integration has its own port and isolated process/database. The server
fixture owns connection reuse and bounded local startup limits; no production pool
configuration changes. It creates required indexes before application start;
actual default-server command monitoring asserts zero application DDL.

Final observed counts and SHA-256 provenance are recorded in
[fresh-ranking-validation.json](fresh-ranking-validation.json).

| Final check | Observed result |
| --- | --- |
| Complete Jest | 262 passed, 19 suites, zero failed/skipped |
| Optimized default build | PASS; main JS 115.44 kB gzip, CSS 4.08 kB gzip |
| Complete applicable Chromium suite | 147 passed, 28 intentional skips, zero failures/flaky; 175 discovered |
| Default v2-OFF | 2 passed, 14 opt-in skips, zero failures |
| Cached v2 result routes | 5 passed, zero failed/skipped |
| Actual merged default-server + disposable Mongo integration | 1 passed, zero failed/skipped |

The 28 browser skips are existing camera/sprite/input-preview opt-ins and
unsupported desktop-native-touch cases. Their individual names/reasons are in
the manifest. All 16 new focused ranking browser tests passed. Node 24.19.0,
Playwright 1.62.1, Chromium 154.0.8037.57 and MongoDB 8.0.16 were used.

Screenshots:
[weekly empty](fresh-ranking-evidence/320-weekly-empty.png),
[all-time list](fresh-ranking-evidence/320-all-time-list.png),
[200% text](fresh-ranking-evidence/320-all-time-text200.png), and
[old backend unavailable](fresh-ranking-evidence/old-backend-all-time-neutral.png).

Development runs found wrong-month synthetic fixtures, missing browser sign-in,
a malformed-input expectation that should allow verified Today, and a missing
local bcrypt native dependency. Those test-environment problems were corrected;
the production runtime did not need an authentication/recovery change. Visual
review additionally caught the squeezed 200%-text table despite overflow checks,
leading to the readable mobile list. An interim full browser run was interrupted
for that layout correction; only the final complete run is acceptance evidence.

## Independent QA and release HOLD

Independent Client/UX QA must test the final combined head. Challenge UTC Saturday
23:59:59.999 → Sunday 00:00, year/leap/DST boundaries, sparse/empty/delayed dates,
old/corrupt/future direct entry, every catalog failure across every tab, revalidation
and late score callbacks. Verify keyboard/focus, 320px/200% list readability,
bottom-nav clearance and saved-time/non-official wording. Recheck original result
privacy/reward restoration and byte-identical original-UUID recovery with old API
outages. Check exact art tree hashes and default v2-off state. Author checks do
not supply independent signoff. Chromium emulation does not certify physical
mobile devices, native screen readers or 400% zoom.

Keep PR #54 **draft/unmerged**. Vercel main auto-deploys; Railway remains on the
older API. Merged server source has a **pending** fresh release artifact, no genuine
first-day publication and no live publisher. Outstanding integrator/owner work:
choose/approve the real fresh release identity and UTC cutover; authorize secure
one-day publication/verification and index/schema readiness; coordinate server +
client/cache refresh and preserve pending old UUID recovery; verify fresh-compatible
rollback/monitoring. These are separate release actions, not implied by source QA.
No production database, platform config, publication, scheduler, v2 activation,
merge/deploy or GitHub CI polling occurred in this work.
