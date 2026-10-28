# Sprint 1.7D — Today and the published maze archive

Implements client issue #53 from client `ea952aa6b1eafed45143607753210abf23f60867`.
Contract: [accepted issue #50 specification](https://github.com/MZKZxyz/fort-custer-client/issues/50#issuecomment-6434131449)
and merged server PR #18, reference `1f668d23477aa62557bd531e501ce5f6771bdd0c`.

**Draft source only. Do not merge or deploy.** Client main auto-deploys through
Vercel; the deployed Railway API remains the older server without the catalog.
No production setting, data, publisher, schedule, scoring or v2 activation changes
are included. Independent QA and coordinated release approval remain required.

## QA correction on the existing PR

The original head failed independent QA for cross-profile result disclosure.
See [the result ownership correction](results-ownership-remediation.md) and
[its current validation](remediation-validation.json). The original validation.json
and 26 archive captures below describe the pre-correction archive delivery;
they are retained as historical evidence, not current result-privacy acceptance.

## Player behavior

Today's UTC date leads the archive. Today can be played/replayed only when the
catalog confirms it. Missing Today remains explicitly unpublished; a separate
latest-publication action verifies that date's month before enabling play.
The default published-date list works at 320px and enlarged text. A native-table
calendar is optional where seven usable targets fit; both views have full date,
UTC, publication, completion and selection names. Month/year controls jump
straight to an older year; holes and empty months remain unavailable.

Completion is an owner-scoped saved boolean, with Unknown on metadata-only reads
or failed progress projections. It does not assert reward eligibility, best time,
or official ranking. Profile changes discard the previous private projection,
abort its requests and ignore late callbacks. Native navigation/profile controls
and safe cached-profile parsing keep keyboard navigation and recovery reachable.

Selection never starts an attempt. New legacy entries re-read the exact month
before mounting gameplay. Invalid local dates, missing catalogs, unpublished or
future dates cannot create an attempt through this route. A mounted admitted
attempt stays mounted through catalog refresh/midnight; its date and original
account remain pinned. An unconfirmed owned result blocks a different new date.
Recovery actions remain available without the catalog and reuse the original
profile/date/UUID. Optional account hints on new recovery records do not replace
server authentication. Prior recovery record shapes remain supported.

Results retain saved receipt presentation during outages. Replay uses the exact
played date; Browse archive and catalog-confirmed Today replace date-plus-one
navigation. Reward presentation/selection is unchanged; opening the existing
crate now has a native button, focus and reduced-motion support. Daily scores
use the selected published date and distinguish empty scores, unavailable maze
and network failure. They are explicitly legacy saved results; weekly retains
its legacy summer scope and alltime its existing aggregation.

The compact Field HUD, movement, fire/Kit semantics, timer/scoring, art assets,
renderer/camera flags, v2 transport and runtime activation gates are preserved.
The existing gameplay regression fixtures now explicitly provide their known
synthetic publication; no debug unlock or fabricated season enables admission.

## Protocol and failure behavior

`GET /api/maze/archive?month=YYYY-MM[&subProfileId=owned]` uses the exact merged
server DTO: today/serverNow/nextDayAt, global eligible bounds, todayMaze and at
most 31 sorted published items. Missing month uses the server month. Private
requests pin Authorization to the initiating identity. Metadata fallback after a
transient private read failure strips progress; 401/403/profile errors do not
fall back into a false owned result. No private completion cache is persisted.

Catalog validation rejects normalized/invalid dates, future or duplicate rows,
wrong months, malformed bounds/clocks and invalid completion types. UTC civil
arithmetic avoids local setDate and the JavaScript year-0–99 constructor trap.
Monotonic freshness is bounded by 60 seconds and the server's next UTC boundary;
focus, reconnect, visibility and confirmed result events revalidate. Refreshes
retain stale content only within the same identity, with gameplay actions
inactive until fresh. An explicit start recheck remains independent of the
server's final publication/ownership guard.

Old HTML 404s, 503s, timeouts and malformed DTOs show Archive temporarily
unavailable / Retry. They never become a synthetic empty calendar or enable
Today from the device clock. An empty successful catalog is a different state.
No client changes invent a legacy inventory. The merged server's default legacy
inventory is empty and intentionally hides markerless history until positive
exact-date/grid-hash evidence and shared runtime wiring are reviewed.

## Local reproduction

Dependencies are unchanged. Build before starting a static browser host; do not
rebuild/delete its bundle while it is serving tests.

```sh
CI=true npm test -- --watchAll=false --runInBand

env -u REACT_APP_EXPERIMENTAL_SESSION_V2 -u REACT_APP_MAZE_CAMERA \
  -u REACT_APP_MAZE_VISUAL_INTEGRATION -u REACT_APP_MAZE_INPUT_PREVIEW \
  -u REACT_APP_MAZE_VISUALS CI=true REACT_APP_API_URL=/api npm run build

FC_ARCHIVE_EVIDENCE=docs/archive-client/evidence CI=true \
  node_modules/.bin/playwright test --config=docs/archive-client/playwright.config.cjs

FC_BUILD_DIR=build FC_V2_EXPECT_OFF=true CI=true \
  node_modules/.bin/playwright test --config=docs/client-v2/playwright.config.cjs
```

The main browser config serves the optimized local bundle and intercepts APIs;
all identities, publication dates, scores and attempts are synthetic. It checks
320×568, 375×667, 390×844, 844×390 and 1280×800, with the existing responsive
suite also covering 412×915 and 1440×900. The calendar uses native table/button
Tab/Enter behavior, rather than claiming an ARIA grid keyboard model. Browser
checks cover actual keyboard activation, native Chromium touch input in existing
regressions, document scrolling, targets, fixed navigation clearance, focus,
200% text, reduced motion, drift/travel, rollover and profile/save races.

### Real merged-server integration

Use a separate checkout pinned to the server reference above, its locked
Node dependencies, and a local mongod binary. The harness refuses ambient Mongo
selectors, creates its own named loopback database and temporary directory,
checks the server SHA, and tears down its database process. It never imports
server startup or a production configuration. Four tiny fixture grids have
explicit synthetic legacy date/hash evidence, including a stored future day.
The current UTC clock advances monotonically from a synthetic 2028 epoch;
completion delegates to the unchanged server service with that same clock.

```sh
env -u MONGO_URI -u MONGODB_URI -u MONGO_URL -u DATABASE_URL \
  FC_ARCHIVE_SERVER_REFERENCE="$FC_ARCHIVE_SERVER_REFERENCE" \
  MONGOD_BINARY="$MONGOD_BINARY" CI=true node_modules/.bin/playwright test \
  --config=docs/archive-client/playwright.integration.config.cjs
```

This separately verifies browser → actual merged archive/start/complete/daily
routes → actual disposable MongoDB → saved completion and leaderboard rendering.
Browsing creates zero attempts. A denied future start adds no attempt, including
when its grid is stored. The fixture catalog is not a production inventory.

## Review evidence and release conditions

See [validation.json](validation.json) for final counts and the screenshot
manifest. Screenshots contain synthetic Player fixtures only; viewport and full
page images are both retained, including 320px enlarged text.

Earlier runs found a test-environment URLSearchParams compatibility issue, a
wrong control-name selector, and an invalid regression run caused by rebuilding
while the static host was serving. These were corrected; intermediate logs are
not final passing evidence. Author checks are not independent QA.

Not certified: physical iOS Safari/Android/PWA behavior, notches/browser chrome,
real screen-reader speech, 400% browser zoom, or a complete WCAG audit. Automated
semantics/keyboard/touch emulation and 200% text do not establish those claims.
The default classic suite intentionally skips opt-in presentation/preview cases
and unsupported desktop touch cases; it does not enable them to make counts pass.

Before any merge/release, approve and verify the server deployment and positive
legacy publication policy, schema/index behavior, old-client compatibility,
client preview against that actual API, rollback and owner GO. Source-merged
server code alone is not production readiness. No live publisher/backfill,
legacy history/reward reconstruction or v2 enablement is authorized.

Rollback is a client code/build rollback to the starting SHA under separate
release review. It does not delete publications, attempts or receipts. Preserve
the original backend completion compatibility and server future-date guard;
never repair archive access by running a seeder or unlocking dates in the client.

## Screenshot gallery

Each pair retains the actual viewport and the full scrollable document. Fixed
navigation can appear within a full-page capture; inspect its viewport partner
when assessing what is visible together. The Today card remains primary, with
archive content reached by normal document scrolling.

| Viewport | Today | Selected archive date |
| --- | --- | --- |
| 320×568 | [viewport](evidence/320-today-viewport.png) / [page](evidence/320-today-page.png) | [viewport](evidence/320-selected-viewport.png) / [page](evidence/320-selected-page.png) |
| 375×667 | [viewport](evidence/375-today-viewport.png) / [page](evidence/375-today-page.png) | [viewport](evidence/375-selected-viewport.png) / [page](evidence/375-selected-page.png) |
| 390×844 | [viewport](evidence/390-today-viewport.png) / [page](evidence/390-today-page.png) | [viewport](evidence/390-selected-viewport.png) / [page](evidence/390-selected-page.png) |
| 844×390 | [viewport](evidence/844-today-viewport.png) / [page](evidence/844-today-page.png) | [viewport](evidence/844-selected-viewport.png) / [page](evidence/844-selected-page.png) |
| 1280×800 | [viewport](evidence/1280-today-viewport.png) / [page](evidence/1280-today-page.png) | [viewport](evidence/1280-selected-viewport.png) / [page](evidence/1280-selected-page.png) |

Additional states: [calendar](evidence/1280-calendar-page.png),
[empty month](evidence/1280-empty-month-page.png), and
[320px / 200% text](evidence/320-text200-page.png).
Recovery retains the existing per-tab storage lifetime; it does not introduce
cross-device or closed-tab result recovery.
