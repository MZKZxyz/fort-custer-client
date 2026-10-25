# VIS-04A · The Pallet Garden

An isolated, playable **58° React/CSS sprite composition pilot**, based on client main `344b43159fbbe6276787ab45977cf9e40a3799e8`. Authorized by [issue #33's latest kickoff](https://github.com/MZKZxyz/fort-custer-client/issues/33#issuecomment-6391330653), following merged Art #38 and Camera #39. This is a draft for independent QA and owner review, not a production integration or release signoff.

## Open the review

From the repository root, using the existing checkout and dependencies:

```sh
python3 -m http.server 8034 --bind 127.0.0.1 --directory docs
```

Open **http://127.0.0.1:8034/visual-integration/**. The committed optimized bundle runs without an API, account, CDN, installation, or build step. Serve the **docs directory**, so the linked approved reference images and sources remain available. Ordinary page scroll and browser zoom remain enabled. The D-pad follows the scene on short screens; scroll down to reach it or presentation controls. All controls work by keyboard. There is no animation or automatic repeat.

Start at S. Right picks up X. Right again clears F, consumes the extinguisher and **stays on the X cell**. Right again enters the cleared cell. Six more Right actions reach E. Completion stops movement. Reset starts the same deterministic local fixture. Nothing writes local/session storage, calls a server, starts an attempt, or awards an item.

The review includes daylight/dusk, badge and shadow switches, grayscale, real projected/square presentation switching without resetting logical state, 13×17/21×21 stress fixtures, an open-edge fixture, an alpha bench and four explorer facings. The **58°/70.1° image comparison is explicitly static reference imagery**, not a second playable projection. The square fallback reuses PR #39's exact `createCamera()` geometry and simple DOM cells on the identical logical fixture; it is not a byte-identical recreation of production artwork/HUD/fog.

## Geometry and composition

The untouched `move()` and immutable `createMazeScene()` are imported from `src/game/`; the prototype owns only presentation, fixtures and local state. Heading updates only after actual displacement, not after blocked commands or stationary fire clearing.

At tile width `t`, padding `p=t`, ground row `r`, column `c`, height `z`:

```text
x = p + (c + 0.5)t
y = p + (r + 0.5)t sin(58°) − zt cos(58°)
sin(58°) = 0.8480480962; cos(58°) = 0.5299192642
```

Ground and collision remain square world units. Images keep their native aspect ratios and use measured ground/foot anchors; there is no blanket image stretch or tile transform. `projectedCamera()` wraps the unchanged square camera in projected units and adds one cell of filled art padding. A single world translation retains fractional CSS pixels instead of integer-rounded scrolling. Bounds are finite and clamped; a small world is framed in a centered letterbox. There is no free pan.

One world context paints continuous earth → repeated ground planes → separate ray-traced contact/cast shadows → all wall/prop/explorer bodies sorted by `(row,column,role)` → independent cues. No per-cell z-index or transform isolates bodies. At the same anchor E renders before the explorer; its E cue remains visible on arrival. No universal CSS blur, drop shadow, persistent animation, or rendering engine dependency is used. A quiet footing covers every blocked square, including wall runs, T junctions, corners and 2×2 blocks. The alpha bench deliberately replaces the terrain with light/dark/checker to make edge artifacts inspectable.

At equal clip height the projected view exposes **17.918% more ground rows** than square geometry, before art padding/world-size clamps. This is information asymmetry, not gameplay neutrality. Actual extents at every measured size are in [report.json](evidence/report.json). EG-09 ranked fairness remains open; this fixture cannot enable the production camera.

## Real export kit and provenance

[Manifest](assets/manifest.json) records every image's exact dimensions, alpha bounds, anchor, transparent border, bytes, decoded cost and SHA-256, plus source hashes and lighting/color settings. The source is the approved refined procedural Blender construction at `docs/art/reference-scene/iteration-2/source/render.py`; the exporter evaluates its materials/mesh builders without running or modifying its full-scene renders. There is one wall, one ground, X/F/E and four independently rendered explorer facings per mood. No JPEG has been repurposed as a sprite.

- **34 straight-alpha RGBA PNGs; 10.1875 MiB decoded** (one shared URL per role, not a buffer per tile). Daylight kit **720,061 bytes**, dusk **680,962 bytes**; both meet the ≤40 / ≤13.75 MiB / ≤2 MiB active-mood targets. Browser/GPU copies and retaining both moods after switching can cost more than raw RGBA totals; these are not measured device memory guarantees.
- Blender 4.3.2, Cycles CPU, 32 samples, no denoiser, AgX to sRGB. Zero-yaw orthographic 58°. Source softboxes remain fixed while the explorer mesh turns about its feet. Daylight is warm key/cool fill; dusk uses the source cool key/fill without position-dependent lantern pools. No paid tools, external artwork, stock assets, or art dependencies. Original procedural geometry follows repository contribution terms; this does not assert a new public license. Bundled React's notice is retained in `app.js.LICENSE.txt`.
- Bodies: **256×352**, anchor **(128,208)**, 224 px per world cell. Ground pitch **189.9628 px**, height rise **118.7019 px per unit**. Ground uses the approved path material on a continuous z=0 plane, avoiding exposed beveled tile sides. Pallet/prop/explorer meshes are retained.
- Shadows: independently rendered Cycles shadow catcher on **512×512**, anchor **(256,300)** at 224 px/cell, uniformly downsampled to **256×256**, anchor **(128,150)** at 112 px/cell. The documented 32/255 catcher alpha noise floor is smoothly remapped to zero; this is a small pilot shadow treatment, not a final lighting bible. All exported layers have **at least 15 completely transparent outer pixels** after processing. Two pixels of RGB dilation extend into zero alpha without increasing alpha; no matte is introduced.

Rebuild the kit and optimized browser bundle:

```sh
blender -b -t 2 --python docs/visual-integration/source/export.py
python3 docs/visual-integration/source/finish.py
node docs/visual-integration/build.cjs
```

Requires the existing Blender/Python Pillow+NumPy authoring tools and repository webpack/Babel dependencies; none are runtime dependencies or added to package manifests. A clean render takes several minutes. Numeric parameters and hashes are reproducible; ray-traced PNG byte identity can vary by Blender/platform. The current manifest is the reviewed artifact identity. `--shadows-only` / `--ground-only` after `--` are optional authoring shortcuts, followed by `finish.py`. Do not rerender the full production library from this pilot.

## Local validation

```sh
node docs/visual-integration/source/geometry.test.mjs
node docs/visual-integration/source/check.cjs
CI=true npm test -- --watch=false --runInBand
REACT_APP_MAZE_CAMERA=true CI=true npm test -- --watch=false --runInBand
REACT_APP_API_URL=/api BUILD_PATH=/tmp/vis04a-production-build npm run build
CI=true PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2 --output=/tmp/vis04a-legacy-e2e
```

Keep the static server running for `check.cjs`. It records native screenshots and objective measurements at **320×568, 390×844, 844×390 and 1280×800, DPR 1 and 2**, tests both presentation traces, pickup/stationary-clear/entry/completion, all world edges, depth permutations, default controls, keyboard Enter/Space, focus outlines, zoom, reduced motion, alpha backgrounds and no persistence/network writes. The pure suite exhausts every cell of 9×11, 13×17 and 21×21 at four clip sizes. `VIS04A_EVIDENCE=/tmp/...` redirects captures; `VIS04A_SKIP_PERF=1` omits the serial 30-second comparison runs.

Recorded results: **3/3 geometry tests, 40/40 unit tests in each production mode, normal build PASS, legacy browsers 32 PASS / 2 intentional camera-only skips**. Existing completion/recovery, retry UUID, pointer/D-pad and responsive regressions pass without editing production tests. Existing toolchain emits Browserslist/deprecation notices. [Production isolation evidence](evidence/production-isolation.json) pins protected source hashes and verifies the compiled normal build excludes the prototype. Production camera opt-in semantics are unchanged.

[Browser report](evidence/report.json) contains per-screen anchor/pitch errors and serial optimized 30-second p50/p95/worst frame intervals, input-to-updated-frame samples, observed long tasks, DOM counts and JS heap snapshots on a named cloud CPU/Chromium. The square comparison uses the identical stress fixture, clip and command stream. These rAF samples estimate browser presentation pacing; they do not measure physical display scanout, and JS heap is not decoded/GPU memory. See [review notes](evidence/review.md) for the measured results, native evidence index and perception limits.

## Accessibility, remaining gates and rollback

Badges default ON with S/X/F/E and a legend; silhouettes, explicit equipment status, position and neighbor descriptions supplement color. Decorative sprites are hidden from assistive technology. Arrow keys and native 44–48px D-pad buttons invoke the same movement function; a polite status announces pickup, stationary clear, blocked direction and goal. Selects/checkboxes retain keyboard behavior, focus is visible, page scrolling/pinch are enabled and there is no required motion. This does not claim full WCAG or screen-reader certification. The baseline production quit-dialog limitation is explicitly deferred by this kickoff, and `MazePage` remains untouched.

**Still unverified/pending:** named physical-phone perception/performance and pinch behavior (EG-08/11), Safari/Firefox, assistive technology, independent QA, owner integrated visual approval, Narrative's provisional E decision and Gameplay/owner EG-09 fairness. A human reviewer must check the native alpha/adjacency/overlap captures; author evidence is not independent signoff. Do not mark Ready, expand the sprite library, or integrate into production until those gates are resolved.

Author role: Rendering & Visual Integration Engineering. Review owners: independent QA for invariants/readability/accessibility; Gameplay for reveal/viewport; Art and owner MZKZxyz for composition; Narrative for E. Baseline source and affected paths are pinned here and in isolation evidence. Only `docs/visual-integration/**` is added. No production route/build flag/import, server behavior, CI/deployment setting, gameplay, completion protocol or data migration changes.

**Rollback:** delete this directory or revert the single prototype commit. The existing production legacy renderer, exact-`true` camera opt-in, assets, attempt state and persistence remain byte-identical to the base. Within the review, select **Square camera · fallback** to continue the same logical game immediately. Closing the page discards the fixture. No merge, deployment, public publishing or GitHub CI waiting/polling is part of this work.
