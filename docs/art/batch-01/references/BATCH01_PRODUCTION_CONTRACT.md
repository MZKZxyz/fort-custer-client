# Fort Custer Maze — Batch 01 Asset Pipeline

**Status:** Production kickoff specification. These uploaded references are **NOT** shipping gameplay sprites. This packet does not alter the repository, launch Blender or enable the feature-flagged renderer.

## What we learned from the uploaded images

- Four attractive open-topped pallet-cube studies show warm wood grain, corner blocks, metal bolts and distinct plank/weathering treatments. Keep them as **material and construction** references, not four independently aligned production camera renders.
- Source files are 1254 × 1254 **RGBA with actual transparency**. Opaque subjects have margins, but extremely faint fringe pixels reach some canvas edges. Inspect the yellow/red-looking halos on light and dark backgrounds.
- The four cubes use a diagonal three-quarter/isometric-like view. Our current integrated game renderer is an **orthographic 58° elevation, 0° yaw, grid-aligned view**. Resizing the pictures will not repair inconsistent camera/pivot/lighting.
- The daylight / lantern-evening comparison is a **mood target**. Treat geometry and camera as unchanged between lighting passes; show amber pools from *scene-located* lamps instead of random warm glows baked into all walls.

## Locked pilot rendering geometry (not yet a final art bible)

These exact values come from `docs/visual-integration/assets/manifest.json`, `src/game/palletProjection.js` and `PalletMaze.js` in the client repository as reviewed on 2026-10-26:

| Property | Baseline |
|---|---|
| Projection | Orthographic, camera elevation 58° **above ground plane**, yaw 0° (grid-aligned) |
| Cell | 224 authoring px per square world cell |
| Pixel map | x = padding + (column + .5)t; y = padding + (row + .5)t sin58 − z t cos58 |
| Row pitch | 189.9628 px at t=224 |
| Height-rise scale | 118.7019 px per world-unit at t=224 |
| Body | 256 × 352 straight-alpha RGBA, anchor at (128,208) |
| Shadow | 256 × 256 RGBA, anchor at (128,150), authored on 112 px/cell after downsampling |
| Production display | 36–48 px logical cell width on prototype mobile |
| Render source | One controlled procedural/Blender 4.3+ scene, same geometry/camera across day/dusk |

**Important:** game-world x points right and maze row advances *down the screen*. Because yaw is 0°, the isolated uploaded box images' diagonal wall edges are NOT a valid replacement for the current pilot wall sprites. Keep the open-top design, re-render it from a consistent Blender rig. Do not rotate individual images 2D; reconstruct or adapt geometry instead.

## Recommended first asset (only one structural master)

1. Start from the repository's existing procedural wall mesh, not a new unrelated camera. Replace/refine the material, nails, corner caps and plank profiles using the four image references. The 3D physical cube stays exactly one logical blocking cell (all weathering variants must preserve the same footprint, top opening, outer height, anchor and occlusion geometry).
2. Render **one** representative wall at approved 58°/yaw 0°. Export wall body and separate shadow for daylight and dusk. Keep the mesh source `.blend` or procedural Python source, camera/lighting config, a source SHA, palette/material definitions, and resulting PNG SHA.
3. Put it in a real 13×17 maze fixture with ground, explorer, fire, extinguisher, one tipi and ambient prairie details. Test lone cell, wall corridor, corner, T junction, cross, 2×2 block and maze boundary. Never infer collision or grid from rendered art.
4. Inspect on actual mobile crop (320×568 and 390×844), DPR 1/2 and logical tile size 36/48. Walls must be distinct, openings obvious, pathways unambiguous and silhouettes legible. All 15 transparent-pixel body/shadow boundaries should remain clean on white/black/checkerboard and on the actual scene.
5. Approve the one wall, camera, shadow and lighting before creating variants. Four variants should be *surface/slat wear* of the same master mesh, chosen deterministically from `(row,column,mazeSeed)`. They should not imply new paths.

## Batch 01 P0 handoff order

- **Gate 01 – lock projection:** one wall master + packed-earth ground + matched shadow, 2 moods, 2 viewports, adjacency bench.
- **Gate 02 – complete gameplay silhouettes:** explorer 4 cardinal facings, red extinguisher, blocked fire, **one painted tipi** (no E marker/finish arch), prairie clumps/flowers, lantern prop. Keep all sprites same camera and anchor rules.
- **Gate 03 – day/dusk lighting:** fixed key/fill and neutral material source; separate lantern light pools and emissive prop so lighting can be positioned by the game instead of baked into each independent cell. Keep fire light visually distinct from lantern light.
- **Gate 04 – production packaging:** preserve editable model/material/light source, one manifest of scale/anchors/alpha bounds/version/sha/licensing, fixed icon/sprite role names, automated QA, replay and screenshots. Existing React/CSS renderer remains reversible; no obligatory Three.js runtime.

## No-go conditions

- Render angle changed between items, diagonal source perspective reused unchanged, inconsistent source scale/anchor/footprint, clipped alpha, or weird RGB fringe.
- Palette/day/night independently generated into different plank arrangements or shadow directions.
- Isolated assets look fine but a wall run/2×2/maze boundary leaks false passages or occludes the player.
- Tiny-screen 36px symbols do not clearly distinguish `X`, `F`, and the tipi; one-cell camera reveals ambiguous walls.
- The sprite or preview changes collision, maze logic, touch/keyboard input, time/reward semantics or fog rules.

## Suggested agent contract

**Art/Technical Artist (Blender):** produce the wall master source, locked camera/material/lighting rigs, body and shadow sprites in two moods, QA manifest and repeated tile bench. **Rendering Engineer:** confirm the exact baseline source hash and projection, build reversible test viewer, check mobile/alpha/occlusion. **Independent Art/QA:** visually review real native-size PNGs, adjacency, palette, goal/hazard legibility and performance before owner signoff. This asset task should not overlap the pending server publisher PR.

References included in `references/` are the user's source concepts and lighting study. Their creative content is not an exact geometry, gameplay or camera specification.
