# Sprint 1.5D — accepted-result arrival focus

Focused correction to [PR #49](https://github.com/MZKZxyz/fort-custer-client/pull/49), starting at `3cc7135a6a81e99cb04f6a82bbfa88f8c32cd466`. Addresses the P3 finding in [independent QA 6430517125](https://github.com/MZKZxyz/fort-custer-client/pull/49#issuecomment-6430517125) and [issue #48 requirements 6430685341](https://github.com/MZKZxyz/fort-custer-client/issues/48#issuecomment-6430685341). Final correction SHA is reported on the PR and issues #47/#48.

`V2Results` now focuses the semantic level-one **Maze complete** heading once when an accepted receipt renders. `tabIndex=-1` permits programmatic focus without adding a Tab stop. A per-mount ref prevents repeated focus on rerender/StrictMode; a fresh load/refreshed document gets its own arrival cue. No extra live region duplicates the focus announcement. Tab proceeds to Replay Maze, then Next Maze; Shift+Tab returns normally. Recovery output never focuses an accepted heading.

Untimed/official text and awarded, exhausted, already-used, review-required and pending messages are unchanged. Receipt validation, persistence, completion calls, gameplay, default flags and legacy ResultsPage are unchanged. No overlay or new gameplay UI was added.

## Focused author validation

- **11/11 React tests** across V2Results and unchanged legacy ResultsPage tests. Covers every reward disposition, explicit official milliseconds, recovery rejection, one focus call in StrictMode, rerender without stealing button focus, and fresh-mount focus from the retained receipt.
- **5/5 compiled-browser cached-receipt cases**, one for each supported disposition: initial arrival and refresh focus, no duplicate live outcome channel, Tab/Shift+Tab sequence, one heading focus arrival per document, unchanged receipt and zero API requests.
- **5/5 compiled-browser actual-server cases** against server `2db3820468bba805a32d20c07f2e586b0819d6ec`: four real completion/navigation/refresh cases at 320×568, 390×844, 844×390 and 1280×800, plus actual two-tab/replay/exhaustion and exhausted-result refresh. Existing transcript, single completion, grant/inventory/outbox and receipt assertions are retained. No extra completion is issued on result refresh. Zero retries or skips in these focused runs.
- Optimized local classic/v2 build compiled successfully. Its source map matches the changed V2Results source; SHA-256 `e5d694a02bf45e7e4701856f9efba21031c06a1a23f1a09923cf6331ed0c59ae`.

The first added unit counter used a Jest mock property unavailable in this repository's version; it now records calls through the native focus method without weakening the once-only assertion. The first actual-server extension passed four viewport cases but failed exhausted-result refresh because the test bootstrap reset the selected date. Bootstrap now seeds the date only when absent, preserving the actual player's selection. The full focused five-case rerun passed with the refresh/receipt/no-extra-completion assertions retained. No runtime change was needed for either test setup correction.

Use Node 24, Chromium and (actual-service cases) MongoDB 8.0.16 plus the pinned disposable server checkout. Commands run from the client checkout; set `MONGOD_BINARY` to the installed executable if it is not on PATH:

```sh
CI=true npm test -- --watchAll=false --runInBand src/session/V2Results.test.js src/pages/ResultsPage.test.js
REACT_APP_EXPERIMENTAL_SESSION_V2=true REACT_APP_MAZE_VISUAL_INTEGRATION=false REACT_APP_MAZE_CAMERA=false REACT_APP_MAZE_INPUT_PREVIEW=false REACT_APP_API_URL=/api BUILD_PATH=.temp/result-focus npm run build
FC_BUILD_DIR=.temp/result-focus npx playwright test --config=docs/client-v2/playwright.results.config.cjs
env -u MONGO_URI -u MONGODB_URI -u MONGO_URL -u DATABASE_URL FC_SERVER_ROOT=../fort-custer-server FC_BUILD_DIR=.temp/result-focus npx playwright test --config=docs/client-v2/playwright.actual.config.cjs --grep 'actual ready latch|next date exhausts catalog'
```

This is structural focus/keyboard evidence from Linux Chromium and CDP touch, not spoken screen-reader or physical-device certification. Cached alternate dispositions use synthetic stored receipts; the actual-service cases use unchanged real authenticated HTTP responses and a disposable MongoDB. The original 182-image inventory and broader Sprint 1.5B evidence remain tied to their earlier source; they were not regenerated for this focus-only correction.

## Narrow independent revalidation requested

Complete an actual route and confirm the accepted heading receives focus instead of BODY, then Tab/Shift+Tab through the result actions. Refresh the accepted page and verify one new arrival cue, original receipt and no additional completion/grant. Recheck untimed award and exhausted outcomes against the actual service; inspect the three other supported cached dispositions. Confirm no duplicate live outcome announcement and no later focus theft. Spoken screen-reader confirmation remains useful before an accessibility release claim.

Existing preview configuration uncertainty and production release gates remain open; this correction does not certify the inaccessible automatic preview. V2 remains default OFF. No merge, deployment, activation, environment setting change or CI polling.

Rollback only this focused follow-up commit to restore the previous arrival behavior, leaving the v2 attempt/recovery safeguards intact. No schema or data rollback is required; the broader PR's pending-attempt drain rule still applies to a full implementation revert.
