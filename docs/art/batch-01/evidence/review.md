# Author review · wall-master gate only

**Technical checks pass; owner and independent QA approval remain pending.** Review the committed image hashes, not an interpretation of the concept references. No source under `src/`, `public/`, dependency files or CI settings changed. No production build or camera flag was enabled.

The six exports occupy 1,966,080 decoded RGBA bytes (1.875 MiB), 374,766 PNG bytes total. The review reuses existing explorer-down, extinguisher, fire and painted tipi URLs. Assets are shared per role/mood rather than duplicated image buffers per tile. These are file/decoded-byte counts, not measured browser/GPU memory or physical-phone performance.

## Measured evidence

- **Camera/source:** `blender.json` reopens the delivered editable `.blend`, verifies 58° elevation, zero yaw, 224px/cell and (128,208) ground pivot. An actual camera-direction ray reaches the recessed floor through the opening; a separate front ray hits the slat above it. The model's evaluated X/Y bounds are exactly ±.5 cells and its maximum Z is .595 cells. Day/dusk records share one structural mesh SHA.
- **Alpha:** bodies are 256×352 straight RGBA, shadows 256² with uniform 2:1 downsampling. Wall/ground body alpha arrays are **byte-identical across moods**, including every edge texel. Body/ground border is 15 entirely transparent pixels; daylight shadow has 23 and evening shadow 21. RGB-only dilation is verified against actual neighboring surface RGB, including physically black underside pixels. No alpha cutting or silhouette rescaling was used to pass the border check.
- **Light:** fixed key/fill positions in both moods. Weighted shadow-alpha centroids remain upper-right of the shared ground anchor (128,150); exact values are in `validation.json`. Amber ground pools are separate scene overlays. They do not dynamically relight vertical wall faces; a future lighting integration needs its own scope/review.
- **Composition:** `browser.json` covers 16 viewport/cell/DPR cases: 320×568, 390×844, 844×390, 1280×800; DPR 1/2; 36/48px logical cells. Maximum measured sprite anchor error is **0.014784 CSS pixels**. Both moods use identical role positions, every shadow precedes bodies, bodies sort by row/column, page bounds fit the viewport, and all images load without browser errors. Native keyboard scrolling, reset, no persistence and reduced-motion/static rendering were exercised.
- **Adjacency:** 18 complete native-scale pair captures cover nine fixtures at 36/48px: lone wall, horizontal/vertical runs, corner, T, cross, 2×2, open edges, overlap probes and 13×17 maze. Object counts match authored fixture tokens. The static art fixtures do not call or replace gameplay transitions.
- **Regression/isolation:** 159 existing client tests in 13 suites pass; three existing projection/fixture checks pass. `validation.json` pins protected Git objects to task baseline `ea952aa6b1eafed45143607753210abf23f60867`; all production trees are unchanged. No build/deploy/CI polling was performed.

## Visual inspection at native scale

Author inspected day/evening masters, lone wall, runs, 2×2, maze, overlap, white/black alpha and phone captures. The rectangular open well and inset floor read at both 36px and 48px. The footing stays continuous across horizontal and vertical joins, corners and junctions; no corridor-sized slat gap or displaced foot was observed. Foreground walls retain their low pilot height, leaving explorers legible behind/in front. Reused extinguisher cylinder/hose, pointed fire and single painted tipi remain distinct without badges, including the grayscale overlap probes.

Caps and bolts are secondary construction details at phone scale; fine grain is intentionally subordinate to the open-well silhouette. Wood is warm honey in daylight and subdued neutral/cool in evening. No red/yellow alpha fringe was observed on the delivered walls over white/black/checker backgrounds. The cast layer stays separate, soft and consistently directed; scenes can disable shadows and pools without losing wall/path boundaries.

The inherited method of compositing independently lit ground tiles reveals **faint regular tile seams**, most visible in evening at 48px. They are not holes in wall footings or new corridors. They are retained in evidence rather than hidden by changing the production renderer. A later terrain pass should review continuous terrain/edge filtering after this wall is approved. This task does not claim the reference image's complete prairie/lantern finish: grass is restrained perimeter-only CSS context, props are existing preview art, and amber pools illuminate the ground only. No decorative objects occupy corridor centers.

## Provenance discrepancy and pending reviews

The uploaded ZIP passes its CRC integrity check. All five image SHA values in its original `reference_manifest.json` disagree with the actual ZIP image entries. The images in this PR match the ZIP entries byte for byte. The original manifest remains unchanged; `reference-package.json` and `validation.json` record actual and declared values separately. This does not affect the new geometry/export identity, whose hashes were calculated from the delivered files.

Author perception is not independent QA or physical-phone validation. Owner must approve camera alignment, construction details, material balance and day/evening lighting **before variants or any remaining sprite library**. Independent Art/QA must check these native captures and real-device perception/performance; Safari/Firefox, assistive technology and device GPU costs are unverified. EG-08, EG-09, EG-11 and issue #33's release gate remain open. No camera fairness, gameplay, accessibility or release signoff is supplied by this art PR.

## Evidence entry points

- `single-cell36-pair.png`, `single-cell48-pair.png`: silhouette and rear/front explorer probes.
- `run-cell48-pair.png`, `corner-cell36-pair.png`, `T-cell36-pair.png`, `cross-cell48-pair.png`, `block-cell48-pair.png`: contact, seams and layer order.
- `maze-cell36-pair.png`, `maze-cell48-pair.png`: identical complete 13×17 layout across moods.
- `320x568-review.png`, `390x844-review.png`: exact-size mobile browser frames. Corresponding `*-dpr*-cell*-daylight/dusk.png` files are native scene crops within those emulated viewports, with DPR reflected in physical pixel dimensions.
- `alpha-checker-pair.png`, `alpha-white-pair.png`, `alpha-black-pair.png`: fractional display-scale edge review.
- `overlap-grayscale-pair.png`, `overlap-reduced-effects-pair.png`: color/effects-independent silhouettes.
- `index.json`: file dimensions, bytes and SHA-256 for all captures and validation reports.
