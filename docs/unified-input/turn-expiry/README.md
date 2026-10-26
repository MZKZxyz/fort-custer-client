# Bounded turn expiry with callback tolerance

Continues draft PR #44 from `5c21a5ec66f90e845d22791ed71e6bd69187ce89`. Addresses [independent QA P2, comment 6410544775](https://github.com/MZKZxyz/fort-custer-client/pull/44#issuecomment-6410544775) under the [owner decision, comment 6410592660](https://github.com/MZKZxyz/fort-custer-client/issues/33#issuecomment-6410592660).

**Cardinal snapping + trailing anchor is the owner-selected default interaction.** Its 8° hysteresis, 12/18px engagement hysteresis, 48 CSS px trailing anchor, whole-maze capture and scoped mobile gesture behavior are unchanged. The original and fixed-anchor modes remain validation comparisons; they are not equally preferred choices. The approved movement cadence remains 400ms to first repeat and 180ms thereafter.

This expiry contract is an **implemented Engineering proposal for UX concurrence, fresh pinned-SHA independent QA and owner confirmation**. It is not an independent signoff or activation approval. Production visual activation remains default OFF; ranked gameplay and EG-08/09/11 remain unresolved.

## Explicit policy

| Bound | Behavior |
| --- | --- |
| One pending perpendicular request | No corner list, route search or automatic T-junction choice |
| At most two forward continuations | Third eligible opportunity must turn at the requested adjacent opening or pause; spare time never permits a third forward step or fourth opportunity |
| Fixed expiry from first eligible scheduled deadline | `2 × repeat + 180ms`; **540ms** at the approved 180ms repeat. The 180ms tolerance is fixed, not renewed per callback |
| Inclusive hard cap | At the cap, an eligible side may turn; after it, pause before inspecting or commanding, even if the side is now clear |
| Immutable accepted intent | Late first evaluation, successful continuations, unchanged samples and hysteresis jitter cannot slide the cap |
| Actual-callback scheduling | After one command, next command is due no earlier than actual callback start +400ms initially or +180ms on repeats. No command bursts or catch-up |
| Early browser delivery | Re-arm the same deadline without a command; fractional timeout rounding cannot gradually accelerate movement |

The existing policy used first eligible scheduled deadline +360ms, exactly two nominal repeats. That left no time for ordinary late callbacks. This proposal adds one explicit **180ms cumulative callback allowance**, while retaining the existing two-step/opportunity bound. It changes intent lifetime only; successful corners still use the existing scheduler and canonical single-command boundary.

For initial Right at t=0 and early Down, ideal commands remain **R@0, R@400, R@580, D@760**. QA's late sequence **R@0, R@404.2, R@584.6, D@764.9** now turns. The immutable cap is t=940, regardless of those late callbacks. If callbacks arrive at 600 and 800, a final callback at 980 pauses. A side opening three cells away still pauses at the third opportunity, even though wall-clock time remains. A turn at t=940 schedules any next command for t=1120 or later; it never catches up to an old deadline.

`TURN_POLICY` in `src/game/inputController.js` names the two-step bound and 180ms grace. Existing bounded timing settings remain supported: the cap scales with two configured repeats plus the same fixed 180ms tolerance (at most 980ms with the existing 400ms repeat limit). Production uses the approved 400/180 defaults.

The scheduler is shared across exact keyboard/D-pad and drag inputs. Anticipation remains drag-only. Neutral, reversal/replacement, ordinary collision, multi-contact, focus/visibility changes, resize, modal, renderer fallback and completion retain their cancellation semantics. Neither the pointer geometry nor canonical movement, persistence, payloads, attempt identity or rewards changed.

**Fire/collision safeguards are unchanged:** queued-side or continued-forward F pauses without spending equipment; walls cannot be bypassed. Only fresh explicit fire intent can invoke stationary clearing, and that clear remains terminal until release plus fresh contact. A selected command cannot trigger an extra fallback command. Completion remains terminal and exactly once.

## Real-browser reproduction and results

The retained baseline optimized bundles were verified against the `5c21a5e` controller source map. Trials use fresh contexts and synthetic intercepted APIs, the preferred trailing mode, native mouse/CDP touch events and **unmodified browser timers**. There is no virtual clock, timer wrapper, injected gameplay event or production telemetry hook. Each steering event is observed in capture phase to verify the actual request position. First Down is requested at [6,4], two cells before the opening at [6,6]. Left is then requested at [8,6], two cells before the second opening at [10,6], without lifting. DOM mutation timestamps record visible committed positions; they are not exact command timestamps or an FPS/device benchmark.

Baseline characterization at 390×844 (three fresh contexts per input/renderer) reproduced the P2. In the final characterization batch, classic first turns succeeded **1/6**, with **0/1** eligible second turns; integrated first turns **5/6**, with **5/5** eligible second turns. All first requests were confirmed two cells early. An earlier pilot batch had classic **0/6**, integrated **6/6** first turns and one integrated second-turn miss. These are retained small samples, not a universal renderer ranking. Characterization-mode runner success means the observations were collected, not that baseline cornering passed acceptance.

Final correction results, individual trial records and source/artifact hashes: [validation.json](evidence/validation.json), [native timing records](evidence/native-timing.json). Ordinary trials run in isolation with one worker, zero retries and no concurrent build/test workload. The default matrix runs ten mouse and ten CDP-touch trials at 390×844 per renderer, two of each at 320×568 and 844×390, and two desktop mouse trials at 1280×800: **30 trials and up to 60 two-cell turns per renderer**. A fresh context is used for every trial. The ordered movement sequence must match exactly, both requests must be two cells early, and no completion request is allowed in this non-goal fixture.

<!-- final-expiry-results -->

| Renderer / input / viewport | Two-cell first + second turns | First-turn DOM offset ms, min / median / max |
| --- | --- | --- |
| classic / mouse / 1280×800 | 2/2 + 2/2 | 764.1 / 768.95 / 773.8 |
| classic / touch / 320×568 | 2/2 + 2/2 | 761.7 / 764.1 / 766.5 |
| classic / mouse / 320×568 | 2/2 + 2/2 | 762.4 / 766.05 / 769.7 |
| classic / touch / 390×844 | 10/10 + 10/10 | 754.1 / 765.8 / 769.1 |
| classic / mouse / 390×844 | 10/10 + 10/10 | 760.9 / 768.5 / 773.9 |
| classic / touch / 844×390 | 2/2 + 2/2 | 759.7 / 763.3 / 766.9 |
| classic / mouse / 844×390 | 2/2 + 2/2 | 772.0 / 772.65 / 773.3 |
| integrated / mouse / 1280×800 | 2/2 + 2/2 | 764.8 / 767.7 / 770.6 |
| integrated / touch / 320×568 | 2/2 + 2/2 | 765.8 / 767.95 / 770.1 |
| integrated / mouse / 320×568 | 2/2 + 2/2 | 765.5 / 766.3 / 767.1 |
| integrated / touch / 390×844 | 10/10 + 10/10 | 760.7 / 765.0 / 766.8 |
| integrated / mouse / 390×844 | 10/10 + 10/10 | 761.2 / 765.0 / 768.9 |
| integrated / touch / 844×390 | 2/2 + 2/2 | 760.5 / 763.05 / 765.6 |
| integrated / mouse / 844×390 | 2/2 + 2/2 | 765.7 / 766.15 / 766.6 |

**Final native matrix: 60/60 trials and 120/120 two-cell turns; zero remaining observed failures or retries.**

| Local regression | Result |
| --- | --- |
| Jest default / integrated / camera, each | 112 passed, 10 suites |
| Shared controller Node | 24 passed |
| classic browser checks | 50 passed / 15 explicit skips |
| integrated browser checks | 62 passed / 3 explicit skips |
| camera browser checks | 48 passed / 2 explicit skips |
| both browser checks | 11 passed / 0 explicit skips |
| lab browser checks | 45 passed / 0 explicit skips |
| Four optimized builds | Compiled; final controller source maps match |
| Complete binary diff reverse-apply check | Passed; no rollback applied |

<!-- /final-expiry-results -->

The classic/integrated focused regressions cover continuous steering, unified input, production integration and completion recovery. Camera checks cover steering/input plus geometry/resize; combined-flag checks cover captured/manual/image/chunk fallback. The UX lab suite is complete.

DOM timing distributions include React commit lag: a first-turn offset below 760ms or a DOM repeat interval below 180ms can reflect a late previous render commit, and does not measure the command deadline. Native exact-command timestamps were not instrumented. Deterministic command-clock regressions prove no early command, one command per opportunity, the inclusive cap and >cap expiry, no catch-up, two-forward/final-turn opportunity limit, delayed first evaluation, unchanged intent, consecutive corners, fresh fire clearing, collision, cancellation/stale timers and completion. The existing interactive comparison remains available using [the synthetic playtest instructions](../continuous-steering/README.md#interactive-beforeafter-owner-playtest); its default remains the owner's preferred trailing mode.

Run after optimized builds, with existing dependencies and Chromium:

```sh
REACT_APP_API_URL=/api BUILD_PATH=/tmp/fc-expiry-classic npm run build
REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true BUILD_PATH=/tmp/fc-expiry-integrated npm run build
FC_REALTIME_STEERING=true FC_BUILD_DIR=/tmp/fc-expiry-classic node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --output=/tmp/fc-expiry-classic-results
FC_REALTIME_STEERING=true REACT_APP_MAZE_VISUAL_INTEGRATION=true FC_BUILD_DIR=/tmp/fc-expiry-integrated node_modules/.bin/playwright test --config=docs/unified-input/playwright.config.cjs --output=/tmp/fc-expiry-integrated-results
CI=true npm test -- --watch=false --runInBand
node docs/ux-interaction-lab/tests/controller.test.mjs
```

`FC_REALTIME_STEERING=true` isolates the real-clock spec, forces one worker and disables retries. Normal regressions exclude it so timing characterization is not mixed with competing tests. `FC_EXPIRY_TRIALS` can increase trials per group. `FC_EXPIRY_CHARACTERIZE=true` records misses without asserting corner success for a deliberately old bundle; never use it for acceptance. `FC_EXPIRY_EVIDENCE_DIR` retains representative captures. Playwright records the native traces. Final records contain synthetic local data only.

Portable [classic](evidence/classic-native-corners-trace.zip) and [integrated](evidence/integrated-native-corners-trace.zip) traces retain the first complete 390×844 CDP-touch trial's context and all referenced resources. [export-trace.py](export-trace.py) selects that complete context, preserves actions/snapshots/media and applies the existing source-reference sanitizer. Every other trial remains in `native-timing.json`; no trial is dropped from the timing results. Replay with `node_modules/.bin/playwright show-trace <zip>`.

Representative completed second corners: classic [mouse](evidence/classic-mouse-390x844.png) / [touch](evidence/classic-touch-390x844.png), integrated [mouse](evidence/integrated-mouse-390x844.png) / [touch](evidence/integrated-touch-390x844.png). These are viewport captures after release; the full four-layout interaction matrix is in the native timing records.

## Remaining limits and rollback

The finite 180ms callback allowance tolerates ordinary delay; it does not guarantee turns through arbitrary main-thread stalls, suspended tabs or background throttling. A callback beyond the fixed cap intentionally pauses and requires new deliberate intent. Reaching an unavailable side on the third opportunity also intentionally pauses; no wait-loop looks for a later opening. These are safety bounds, not remaining evidence of the old zero-tolerance defect. Real physical-device comfort and adequacy of this tolerance remain review questions.

Physical iOS Safari, installed iOS PWA, physical Android Chrome and installed Android PWA remain **NOT RUN**. No attached physical/remote-device session was available. Chromium/CDP does not certify actual browser chrome, pull-to-refresh, pinch, standalone behavior, OS interruptions, screen readers or device performance. EG-08 (Art/arrival/readability), EG-09 (ranked view/difficulty equality), EG-11 (devices/accessibility), and existing EG-01 server timing/recovery limitations remain unresolved. No merge, deployment, ranked activation, production flag or data setting changed.

**Revision rollback:** revert this correction commit and rebuild to restore `5c21a5ec66f90e845d22791ed71e6bd69187ce89`. This preserves the approved trailing geometry and whole-maze input but restores the known strict-360ms P2 and former early-delivery behavior. No schema/API migration is needed. Preserve `mazeCompletion:*` recovery records and the existing completion endpoint contract. The complete binary diff is reverse-apply checked before handoff; no rollback is executed.

Classic renderer fallback preserves the attempt and cancels input; it does **not** roll back the shared expiry policy. Unsetting the visual flag and rebuilding is visual-only rollback; camera remains independently flagged. Full-PR rollback reverts commits newest first as described in the [integration record](../README.md#flag-and-rollback).

Stop after local checks, commit/push and the existing draft PR #44 update. Fresh independent QA and owner confirmation remain required on the revised SHA.
