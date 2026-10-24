# Focused second pass — v0.2 candidate deltas

**Direction retained; final art and camera approval pending.** Owner authority: [focused second-pass comment](https://github.com/MZKZxyz/fort-custer-client/issues/30#issuecomment-6390478720). Existing v0.1 source, images and contract below remain the baseline.

- Revised authoring source: `iteration-2/source/render.py`; original `source/render.py` is unchanged. Wall construction AST and authored fixture are checked against the original. All props remain within the original cell in world X/Y; logical row/column and ground/feet-center anchors are unchanged.
- Two **unapproved** camera candidates share identical revised geometry, orthographic scale 14.3 and 1400×1400 output: 70.1° control and 58° alternative, zero yaw, radius 25, target origin. Camera position formula `(0, −25 cos(elevation), 25 sin(elevation))`. Ground depth is `sin(elevation)` times cell width; positive height projects upward by `cos(elevation)` times its world height. Light/material recipes remain the original daylight/dusk pair.
- Explorer: broader indigo coat, spread arms, separated boots, forward face/nose and a smaller rear-set hat; maximum height 1.195 cells. X: cylinder leaning away from the camera, broad lever, looped hose and raised nozzle; maximum height .800. F: three pointed orange tongues with raised golden core, crossed dark logs; maximum height 1.120. E: provisional neutral/fictional canvas A-frame with a real entrance opening and ridge; maximum height 1.063. This is not a historical/cultural portrayal claim.
- Revised masters contain **no baked S/X/F/E letters**. Browser badges stay an accessible redundant-cue default; badge-off removes the annotations entirely. Browser badge ground offset is (+.20, −.17), projected at z=.06. These art-study labels are not a production UI implementation.
- Measured source projections/ray intersections: [geometry checks](iteration-2/previews/geometry-checks.json). Browser CSS pitch, target bounds and viewport cropping: [framing checks](iteration-2/previews/framing-checks.json). Geometry checks are finite, parallel orthographic rays; they do not certify human recognition or every possible occlusion.
- The proposed **256×352 RGBA canvas / (128,208) ground-center anchor / 224 px cell width** is retained for evaluation. [Calculated body bounds](iteration-2/previews/export-bounds.json) check the revised meshes against that canvas at both elevations. Actual transparent sprites, alpha halos, shadows, atlases and DOM sorting are **not produced or validated**. Recheck all of those with Engineering before production; do not derive collision from art overlap.
- Source filenames distinguish `angle-70.1` / `angle-58` and `daylight` / `dusk`. These JPEGs are review masters, not runtime files. Future PNG naming, alpha handling, separated shadows and migration/rollback requirements in the original recipe remain proposals. No sprite library or additional explorer headings are commissioned here.

Owner chooses the reference; Engineering validates cell-center/projection/export compatibility, independent QA reviews native-scale perception and occlusion, and Narrative reviews E. A recommendation in the README does not lock the camera or art bible.

---

# FC-VIS-01 — Proposed source / export contract

**Study v0.1 · proposal for owner and Engineering review · not a binding art bible.**
Authority: issue [#30](https://github.com/MZKZxyz/fort-custer-client/issues/30) and its Sprint 1 kickoff; OD-01/02/03/19/20/21. Base: `a9394631661a9e654bb3cb9b9e6dbce14b9491fa`. These measurements describe the included authoring source. Sprite dimensions below are an **unimplemented export recipe**, not evidence of a runtime pack.

## Coordinates and camera

Keep logical cells as integer `[row,column]`, origin at the grid's upper left. A source cell is one square world unit. In this 9×11 study: `world x = column − 4`, `world y = 5 − row`, `z = height`. Semantic anchor is always the center of the ground footprint; never the top of the hat or wall.

Orthographic camera `(0,−8.5,23.5)`, target `(0,0,0)`, zero yaw, elevation **70.1° above ground** (19.9° off vertical); no perspective convergence or horizon. Orthographic scale 14.3, square 1400×1400 output. One world unit projects to ~97.90 horizontal pixels and ~92.07 vertical pixels at ground level. Positive height projects upward on screen. All geometry and camera transforms are identical between lighting treatments.

Responsive study framing: the mobile review crops the existing render to **~9.0 columns**, rather than shrinking a whole production maze. At 320 px: scene width 288 CSS px, render width 457.92 CSS px; one cell ~32.02 CSS px. Vertical ground pitch ~30.1 CSS px. Desktop shows the entire 9×11 diorama. This is a composition comparison, **not** a scrolling camera, clamp, movement or device-performance implementation.

## Inventory and source measurements

All objects are authored in `source/render.py`; exact authored positions and tokens are in `source/fixture.json`. No production images are imported. Material variations are deterministic (`random.seed(30)`).

| Source ID | Semantic role | Footprint / height in cells | Ground anchor | State / export status |
|---|---|---|---|---|
| pallet-open | `#`, blocked | Continuous 1×1 dark footing; slats span .98; corner posts reach .595 | cell center | Actual procedural mesh; four wood tones, no top lid; sprite unproduced |
| ground-path | walkable ground | 1×1 / .055 | cell center | Actual compacted-earth material |
| ground-prairie | perimeter only | outside playable footprint / .035 | ground surface | Actual loam; not a new tile token |
| explorer-clay | logical player on S | body ~.61×.48 / .90 including hat | feet center | One static facing-camera pose produced; other headings deferred |
| extinguisher | X / pickup | body .26 diameter, hose extends to +.31 x / .515 | cell center | Red cylinder, pale label, hose and lever; static |
| fire | F / obstruction | logs .52×.52 / .80 | cell center | Three bent flame tongues; static, no particles |
| goal-canvas | E / goal | ~.53×.53 / .91 | cell center | Provisional geometric canvas tent; portrayal needs Narrative/owner review |
| lantern | decorative | perimeter only / .91 | post base | Three steady practicals; never F or a navigation rule |
| prairie-clumps | decorative | perimeter only / .28 | stem base | Sage/straw blades and five-petal violet flowers |
| field-plaque | optional fictional detail | outside grid / .13 | plaque center | “KEARNY / FIELD No. 01”; no historical claim or required cue |
| semantic-medallion | redundant identification | .32 diameter / .055 | offset (+.27,−.24) | S/X/F/E letters on pale disks; retained in both moods; browser review adds 15 CSS px letter annotations at the same projected anchors |

## Collision and occlusion

Each `#` has a continuous, exact **1×1 blocked footing**. Hollow wells are visibly recessed *inside* the cube and do not represent a walkable cell. Neighboring footings meet edge to edge; individual slat seams are narrow construction joints, never corridor-width openings. No decorative grass, stone, sign or lantern is placed in a walkable cell center. All walkable cells use the same quiet, light earth surface; no route is privileged by paint or lamps.

Suggested neutral compositor order: ground → ground details → nonsemantic soft shadows → bodies sorted by projected ground anchor → semantic medallions and object cues. Tall foreground decoration must never hide a neighboring path or X/F/E. Separate shadow and body layers in a future export; do not bake adjacent cells into individual wall sprites. If runtime occlusion cannot preserve a readable neighboring cell, revise camera/height before approving the pack. This offline scene uses physical depth and **does not prove DOM sprite sorting**.

## Unimplemented transparent sprite recipe

1. Keep each asset centered at its semantic ground anchor with the exact study camera rotation. Render one asset at a time; exclude the studio, neighboring objects and unrelated ecology.
2. Proposed common body canvas **256×352 px**, ground-center anchor **(128,208)**. Nominal cell width 224 px; ground depth ~210.6 px. Ground footprint corners occupy x=16…240, y≈102.7…313.3; the tallest source object remains inside this canvas. Validate rendered bounds before any batch export.
3. Export RGBA PNG, straight alpha, sRGB; no matte/background. At least 4 fully transparent outer pixels, plus 2 px color dilation into zero-alpha edge texels for atlas filtering. Preserve original alpha and test on dark/light backgrounds at 1×/2×; no opaque halos. Shadows in a separate RGBA layer with the same anchor and canvas.
4. Produce daylight and dusk from identical camera/geometry. Key position is world (−6,−3,+12); ground shadows extend toward world (+X,+Y), toward the image upper-right. Preserve this direction across future exports. Dusk cool fill must preserve the whole viewport; amber pools are decorative, not fog/reveal. No moving flame, bloom, camera shake or depth of field is required to read anything.
5. Name `fc_<role>_<variant>_<heading>_<mood>_v001.png`; e.g. `fc_wall_open-a_fixed_daylight_v001.png`. These are naming examples, **not existing files**. Metadata must include role, token, units, anchor, footprint polygon, visual bounds, shadow bounds, heading, camera rotation, palette, source SHA/hash, license/provenance and approval state.
6. Engineering should map the immutable logical model to these dimensions in a disposable renderer adapter; never persist art pixels into gameplay coordinates. Existing `public/images`, `public/textures`, `src/pages/MazePage.js` and reducer remain the fallback. Production integration belongs to VIS-04 after owner approval and independent QA.

## Palette and finish

UI palette (actual sRGB CSS): paper `#f2eedf`, ink `#253c34`, secondary `#576158`, accent `#8b4a2e`. UI contrast is checked independently of rendered materials. Source material RGB values in Blender are **linear**, then AgX tone-mapped; do not copy them directly as UI hex colors.

Matte, gently rounded clay and weathered honey wood; restrained surface bump, no gloss, blur or atmospheric occlusion. Indigo explorer with broad ochre hat and backpack; extinguisher has a cylinder/lever/hose; fire has tall bent tips; goal has a triangular opening. Letters reinforce these silhouettes. Daylight uses warm broad key/cool sky fill. Dusk uses readable blue ambient and fixed amber lantern light; it is intentionally an early, well-lit dusk rather than darkness.

## Promotion gates

Owner must approve the actual image hashes in `manifest.json` before any art-bible lock. Engineering consult should validate projected anchors, adjacency and transparent-body export. Independent QA-01 must check perception at native 320 px, grayscale/color-vision variants, UI focus/contrast, and device behavior after integration. Narrative/owner must review the provisional E silhouette. This authoring deliverable supplies evidence for those reviews and does not claim their signoff.

Rollback: delete/revert this study directory or revert its sole publication commit. It has no runtime imports, routes, dependency additions or production asset references. Existing source and asset hashes are unaffected by the proposed tree additions.
