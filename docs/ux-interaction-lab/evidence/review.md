# VIS-04B author review — October 24, 2026

**Recommendation:** lead with the large hold-to-repeat D-pad; offer drag as an optional preference. The D-pad exposes four explicit targets and an immediate first step. Drag lets a player steer from a single contact but adds a threshold, axis selection and neutral position to learn. This is a UX hypothesis based on this working prototype, not a measured user-preference result or owner design approval. Both alternatives stop at the same game boundaries.

## Native browser evidence

The images below are actual headless Chromium captures; no rendered mockups or edited image composites. Inspect the full-size PNGs rather than judging small thumbnails. Desktop uses a full-page capture from a 1280×800 viewport; the other images use the exact viewport dimensions, with 390 portrait at DPR 2 (780×1688 image pixels).

| Capture | Actual state and purpose |
| --- | --- |
| [Desktop A / daylight](desktop-hold-clear.png) | 1280×800, DPR 1. Holding Right produced exactly two reducer calls: X pickup, then stationary F clear. Position [2,3], empty equipment, STOPPED, explicit release instruction and log. |
| [320 portrait A](portrait-320-hold.png) | 320×568, DPR 1. Scrolled to controls. Sticky live maze remains above reachable D-pad. The page is allowed to scroll vertically. |
| [390 portrait B / dusk](portrait-390-drag-dusk.png) | 390×844, DPR 2. Real pointer drag, held through fire clear and another 1800 ms; still [2,3], empty equipment, two commands. Release is explicitly required. |
| [Short landscape / garden](landscape-garden.png) | 844×390, DPR 1. Existing 11×9 garden fixture at [10,3]; camera y=264 CSS px; live maze and D-pad shown together after normal page scroll. |

Coordinates above are one-based. [Machine-readable report](report.json) includes exact viewport/cell/control dimensions, input state/log, camera offsets, browser/CPU, source SHA-256 hashes, storage counts, contrast ratios and isolation assertions. `capture.cjs` regenerates both pixels and measurements from the current files. The source baseline is current main `344b43159fbbe6276787ab45977cf9e40a3799e8`, not PR #40.

## Observed results

- Zero horizontal overflow in all four captures; every measured D-pad target is at least **46×46 CSS px** (portrait 50×46, desktop 54×46). Responsive tests also hit-test each target at all four sizes, for both fixtures.
- Both schemes import the same canonical `move()` implementation. The training trace is pickup → stationary fire clear → fresh press enters → tipi/completion. The garden is also completed through X and F, checking actual input state, equipment and player-follow bounds at every step.
- Pointer release/cancel, lost capture, blur, hidden document, modal, resize/orientation, focus loss, timing/scheme change and unmount all stop further commands. Terminal fire/wall states keep the current contact latched stopped, so steering cannot revive them. Old callbacks and foreign releases are rejected, including after a fresh session begins.
- Chromium native CDP touch hold/drag reproduced the stationary clear and native `touchCancel` termination. Pointer/mouse, touch taps, arrows, held-key scheduling, Space activation and semantic click activation share movement rules. Native repeated keydown events do not re-arm a cancelled hold.
- Native dialog plus explicit Tab containment prevented focus reaching controls behind the modal. Escape closes it and restores focus; closing does not resume movement. No production dialog behavior was changed.
- Native touch swipe outside controls scrolls the page. Browser page scale 1.5 is allowed; computed text-size doubling reflows without page-wide horizontal overflow. These are browser probes, not physical pinch or assistive-technology tests.
- Day and dusk both render real palettes. Measured body/heading/secondary-instruction text contrasts are **10.71 / 11.89 / 5.94:1** in daylight and **12.44 / 10.49 / 7.22:1** in dusk. This samples core UI text and is not a full contrast audit of every map mark or focus state. Symbols and text supplement color.
- Zero running animations with reduced motion, zero browser page errors, zero API calls and zero local/session storage entries in fresh capture contexts. Tests prohibit storage writes during interaction.
- All tracked files outside this directory match main. Ordinary production-bundle HTML/JS/CSS/JSON contain no lab markers. Existing production completion/recovery tests pass; local completion only freezes this disposable fixture and performs no save.

## Local validation

| Check | Result |
| --- | --- |
| Deterministic controller/rule checks, Node 24 | 17 passed |
| Scoped Chromium browser tests | 43 passed |
| Existing Jest suites | 6 suites, 40 tests passed |
| Existing default-mode browser regressions | 32 passed; 2 expected opt-in camera skips |
| Normal optimized production build | Compiled successfully; camera default remains OFF |
| Native capture/geometry/contrast/isolation assertions | 4 captures passed |

[Validation summary](validation.json) lists the browser cases and commands. The existing toolchain reports stale Browserslist data and Node/module deprecation notices; dependencies were left unchanged. No GitHub CI wait or polling was performed.

## Limits and next review

Host: **AMD EPYC 9V45, Linux 6.18.55, Chromium 154.0.8037.57**, headless cloud execution. Touch/scale probes use CDP. Visibility, orientation, window blur and unmount cancellation include intentionally dispatched lifecycle events; they demonstrate listener/ownership behavior, not an actual OS backgrounding or rotation certification. Lost capture is exercised through the real capture API, and native touch cancellation is exercised separately. Timing assertions use a controlled browser/fake clock, not physical input-to-photon measurements. **No FPS or real-device performance claim.**

Physical Android/iOS, Safari, Firefox, screen-reader reading order/live-region behavior, assistive touch exploration, device notches/safe areas, pinch during a held contact, browser chrome/keyboard resizing and user preference/accidental-step rates remain **UNVERIFIED**. Text enlargement is a computed-size stress test, not every browser's text-only zoom. Small diagnostic labels still require physical-device readability review. The schematic does not demonstrate final art/occlusion, final tipi export approval or equal ranked tactical visibility. EG-08/11 and EG-09 remain open for production integration.

Independent QA should review the final draft PR SHA, repeat cancellation/hazard tests and play both schemes on real devices. Owner chooses the eventual interaction design after that evidence. No author signoff substitutes for either review. Broader VIS-04, PR #40 rendering QA and production accessibility repairs remain separate. Rollback is deletion of `docs/ux-interaction-lab/` or reverting its commit; no data or environment changes.
