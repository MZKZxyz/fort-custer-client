# PR #44 Playwright CI correction

Addresses [triage 6411557398](https://github.com/MZKZxyz/fort-custer-client/pull/44#issuecomment-6411557398), baseline `c072941cd5682bc8466bbabcbc845d8b4e4a3e15`.

The five CI failures do not justify changing gameplay. One native-touch location test held contact across uncontrolled transport round trips: its extra cell is consistent with legitimate repeat. Two repeated-native cases exhausted the root runner's 30-second deadline while opening ten contexts and recording traces; context/trace errors are not valid gameplay observations. Two other trials reached the final corner but injected steering after the required cell; they are invalid two-cell trials and remain failures, not passes.

The regular `npm run test:e2e -- --workers=2` suite retains deterministic geometry, cadence, collision, fire, completion, recovery and corner assertions. Native touch initiation now uses the same frozen clock as mouse initiation: genuine CDP pointer delivery, capture, hit testing, unchanged page offsets and exactly one immediate step are asserted, with repeat deadlines frozen across transport round trips. Native cadence remains covered separately.

The root config excludes only the repeated native spec. `npm run test:e2e:native` runs a separate serial CI smoke: one fresh mouse and one fresh CDP-touch context at 390×844, each asserting two consecutive corners, both requests actually two cells early, the exact position sequence and zero completion requests. It has a 120-second per-case budget, zero retries, and failure-only traces. The workflow runs this after the ordinary full suite, against its already compiled optimized `build/` bundle rather than the development server. Locally set `FC_BUILD_DIR` to an equivalent optimized build, or run `npm run build` first. It does not label a late request as acceptable or retry until one succeeds.

Full characterization remains available with the optimized-build config:

```sh
FC_REALTIME_STEERING=true FC_BUILD_DIR=<classic-build> node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs
FC_REALTIME_STEERING=true REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=<integrated-build> node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs
```

Each run uses one worker, zero retries, 120 seconds per group, sequential fresh contexts and 30 trials across four layouts. Run without competing build/test workload. Failure-only trace retention limits archive pressure; every accepted trial must still prove both early requests. Timing JSON remains attached to results. A missed injection remains a visible assertion failure even if the final position is correct. Context creation, timeout and archive failures remain runner failures and must not be reported as gameplay success.

No runtime source, steering geometry, 400/180ms cadence, 540ms bounded expiry, feature flag, payload or persistence implementation changed. Revert this correction commit to restore the previous harness/workflow; no data migration or production change is involved. Visual activation remains OFF. Independent pinned-SHA QA, owner confirmation and existing EG-08/09/11/device/ranked gates remain required.

Local reproduction and final results are recorded in `results.json`. Physical iOS/Android/PWA testing remains NOT RUN. No GitHub CI polling, merge, deployment or new PR.

Untouched baseline local reproduction: 91 passed, 23 skipped, 9 failed (three touch-location extra-step assertions, two native 30-second timeouts, four late-injection assertions). In the latter four cases the final sequence matched but requests arrived at later cells; none is counted as a valid two-cell trial. The CI-reported browser-target/truncated-archive exceptions were not independently reproduced locally. Resource-pressure mitigation is bounded contexts, serial execution and failure-only trace retention, not a claim that those exceptions proved a movement defect.

The first corrected full run retained one additional failure: 92 passed / 23 skipped / 1 failed in the older native one-cell corner probe at 844×390. Its observer signalled a cell but did not control the subsequent transport window before steering. That regular-suite probe now also freezes deadlines while delivering native CDP gestures, advances exact 400/180ms opportunities and verifies cancellation across another 500ms. Full unmodified native cadence/cornering assertions remain in the isolated smoke and repeated suites. This intermediate failure is retained, not retried away.

Final local results: full workflow command **93 passed /23 mode skips**, isolated CI smoke **2 passed**, Jest **112 passed**, isolated optimized classic **30/30 trials**, integrated **30/30 trials**, **120/120 two-cell corners**, zero retries or remaining observed failures. Both early-request positions and complete sequences matched in every accepted trial. Existing optimized c072941 bundles were reused locally because runtime source is unchanged; CI builds its own bundle. See [results](results.json) and [all final native trials](native-trials.json).
