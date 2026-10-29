# PR #65 — configured-output audit correction

Engineering follow-up to the [independent QA FAIL](https://github.com/MZKZxyz/fort-custer-client/pull/65#issuecomment-6484193438) and [integrator instructions](https://github.com/MZKZxyz/fort-custer-client/pull/65#issuecomment-6484275332). Reviewed parent: `290066c5cf8a542473f7e4feb3d70fd4ad4f7eb2`; unchanged comparison baseline: `72e5f90786288f02371da18139e1e834d8d13f64`. This is author correction evidence, not independent QA approval. Keep the PR draft and stop for fresh independent review.

## Correction and safety policy

The npm lifecycle audit loads CRA's own production dotenv configuration, including expansion and shell precedence. It resolves the selected output from the project root, rather than a caller's cwd. Default `build/`, relative `BUILD_PATH`, and absolute `BUILD_PATH` (including a dedicated directory outside the project) are supported. It reports the directories actually scanned.

Empty/whitespace values, the repository root or its ancestors, overlap with source/public/docs/scripts/tests/dependencies/Git metadata/development staging, symlinked path components, and special files are rejected. Canonical absolute paths are required: a symlink alias such as macOS `/tmp` is intentionally rejected. Prebuild validates destination safety before CRA can empty it, while allowing a not-yet-created output; it still audits `src` and `public`. Postbuild requires an existing directory and a regular nonempty `index.html`, audits `src`/`public` and the selected output, and fails on missing trees. A stale default build never substitutes for a custom output.

Hash, model-signature, extension and forbidden shipping-text checks remain in place. No runtime, art gate, staging, fallback, anchor, camera, gameplay or session implementation changed. No public assets were added. The four correction paths have zero overlap with the live 90-file PR #54 inventory checked during this correction; `MazePage.js` and its tests remain untouched.

## Entry-point regression evidence

`npm run test:art`: **11 passed, 0 failed** (six audit cases plus the five existing staging/middleware cases). Every fixture invokes the unchanged package's real `npm run postbuild` or `npm run prebuild` script in an isolated temporary project. The fixture copies only the audit dependencies and one manifest-known PNG. Temporary projects own their directories and cleanup; developer build directories are never renamed, emptied or removed.

| Payload in selected output | Default | Relative | Absolute external |
| --- | --- | --- | --- |
| Known Meshy PNG renamed `renamed.dat` | exit 1, Forbidden | exit 1, Forbidden | exit 1, Forbidden |
| GLB signature renamed `geometry.dat` | exit 1, Forbidden | exit 1, Forbidden | exit 1, Forbidden |
| Blender signature renamed `scene.dat` | exit 1, Forbidden | exit 1, Forbidden | exit 1, Forbidden |
| Version-3 `main.js.map` with forbidden URL in `sourcesContent` | exit 1, Forbidden | exit 1, Forbidden | exit 1, Forbidden |

For each mode, clean output passes before/after injection, missing selected output fails, and an existing default-build sentinel remains unchanged. Custom tests leave a clean stale default build present. Additional cases cover production dotenv expansion/precedence, npm invocation from outside the project, source/public preflight and postbuild rejection, empty/unsafe destinations in both hooks, symlinked output/ancestor/file, and missing/empty/symlinked entry points.

## Production and other validation

Executor: macOS 26.2 (25C56), Node 24.7.0, npm 11.5.1, Playwright 1.62.1, installed Google Chrome **156.0.8078.49**. The Chrome version matches the original engineering run; the original recorded Node was 26.12.1, so this is not an identical Node toolchain. Baseline and corrected head use the same current toolchain.

- `CI=true npm test -- --watchAll=false --runInBand`: **163 passed / 15 suites**.
- `node --test docs/visual-integration/source/geometry.test.mjs docs/art/batch-02/source/selection.test.mjs`: **6 passed**.
- Default production: `REACT_APP_API_URL=/api REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=boy npm run build`, with boy's eight validated layers staged: **PASS**.
- Relative integrated production: `BUILD_PATH=.local/production-integrated REACT_APP_API_URL=/api REACT_APP_MAZE_VISUAL_INTEGRATION=true REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=girl npm run build`, with girl's eight validated layers staged: **PASS**.
- Absolute external production: `BUILD_PATH="$PWD/../absolute-production" REACT_APP_API_URL=/api REACT_APP_MAZE_CHARACTER_ART=meshy-local REACT_APP_MAZE_CHARACTER_SOURCE=girl npm run build`, with girl's validated layers staged: **PASS**.
- Each actual output: **200 files / 5 source maps**, no forbidden hash/signature/local URL; postbuild reports **449 source/public/output files and 98 prohibited hashes**. The development `game/characterArt` resolver is absent from all five maps in each output. Default baseline/head main CSS is byte-identical.
- Existing `e2e/shipping-art.spec.js`, run against each of the three optimized outputs in Chrome with query/storage/local preferences: **1 passed each**. Integrated production decodes pilot layers; no local-art/model requests.
- `git diff --check`: **PASS**. Development staging is cleaned after validation. Logs, traces and browser captures stay outside Git; no new screenshots or binaries are published.

## Controlled macOS / Chrome comparison

Fresh baseline and corrected-head optimized default builds, identical Node/dependencies, the same Chrome executable, headless mode, DPR1, mobile/touch enabled, fresh browser contexts, blocked remote fonts, synthetic identity/API fixtures, and serial execution (one worker, zero retries). No real backend/database writes. Test assertions and timeouts are unchanged.

The existing responsive test was run unmodified once per revision at each requested viewport. A private instrumented copy preserving every assertion was then run three times per revision/viewport, adding only geometry/scroll/dialog logging. Thus each viewport has four observed failures per revision: one unmodified plus three measured trials. No passing full responsive-suite claim is made.

| Observation | Baseline | Corrected head | Result |
| --- | --- | --- | --- |
| 1280×800 initial Play bounds | x440, y669.75, w400, h54; bottom **723.75** | identical in 3/3 measured trials | FAIL both |
| Navigation top / overlap | **717 / 6.75px** | identical in 3/3 | FAIL both |
| 320×568 outside gesture start | **(160,0)**, hit timer, initial scrollY **33** | identical in 3/3 | matched |
| After outside swipe | scrollY **33→33**, Controls dialog visible | identical in 3/3 | FAIL both |
| Existing assertion failure | expected scrollY >33, received 33 | identical | 5s poll expires both |

The outside-maze point is computed by the original test from `.field-meta` after its calendar swipe/navigation; it is not moved to manufacture a passing gesture. The gesture uses the unchanged ten CDP touch moves with 20ms waits. The unmodified desktop test also reports 723.75 versus 717 on both revisions; the unmodified phone test fails the same scroll assertion. At that point later D-pad/quit/navigation steps have not run, so this check does not certify those later steps.

These matched observations reproduce the original author's desktop geometry and phone Controls/scroll symptoms on the requested browser platform, including on the unchanged baseline. They do not establish the cause, frequency outside these conditions, physical-device behavior, or that either UI issue is fixed. The independent Linux QA measurements (708.75/717 and scroll 0→8 without Controls) remain valid observations from a different platform; this run does not erase them.

Retain the earlier independent QA's initial 60s mouse-surface timeout and two concurrent native-timer assertion failures, followed by isolated passing comparisons. Those timing suites were not rerun for this focused audit correction and are not reclassified as green or attributed to this PR. No timeout was increased and no test was suppressed.

## Handoff

Fresh independent QA should rerun configured-output negative cases, shipping exclusions and the platform-specific comparisons at the newly pushed exact SHA recorded in the PR comment. The deterministic audit defect is corrected; the two matched UI failures remain reported. No merge, deployment, production activation, server change, new model generation or screenshot publication is authorized by this record.
