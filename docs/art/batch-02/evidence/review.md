# Author comparison · proposed weathering treatments

**Technical author checks pass; v02–v04 need independent Art QA and owner visual approval.** v01 retains the separately approved Batch 01 files. All work is scoped to `docs/art/batch-02/`; there are no edits to Batch 01, game/renderer/public assets, dependencies, CI or deployment settings.

The first comparison confirms a subtle aged amber v02, a distinctly darker matte v03 and a lighter/desaturated v04. Each keeps the same open-well outline, caps, bolts, slat construction, floor and footing. The v02 repair tone is confined to an existing side-plank material; it is deliberately secondary at phone scale. v03 retains lighter corner caps and visible well/floor shading rather than making a dark solid blob. v04 retains warm timber rather than turning into a white navigation cue. Material differences do not mark routes, change passage width or introduce structural damage.

Author inspected the native four-finish strips, mixed runs/corners/dense-maze pairs, mobile 390×844 evening and 320×568 daylight crops, homogeneous dark-finish mazes, all-treatment alpha backgrounds and grayscale/overlap captures. At 36px the four silhouettes stay regular and navigable; grain/bolts remain secondary details. In mixed horizontal/vertical joins, corners, T/cross and 2×2 there is no displaced foot, added height, opening or corridor-sized false gap. Explorer, extinguisher, pointed fire and the existing painted tipi remain distinct without badges; backgrounds and pools can be disabled without changing geometry or layout. This is author perception, not independent or physical-phone signoff.

All four GLBs share identical vertex/UV/tangent/index payload bytes, SHA-256 `70665297cba7b51a4df4d834e757952d0fbcf5132d4c9389be0de2dd7bc85974`. Each new saved `.blend` reopens with the exact approved raw geometry hash, camera, sample settings, key/fill, color management and actual World Background shader. All body alpha arrays equal the approved original byte for byte across both moods. Each new GLB imports alone after a Blender factory reset with no source/external textures loaded: one identity root/mesh, two packed atlases, correct bounds/pivot, visible open well, preserved normals and no lights/cameras/catcher. Source/import positions agree within `5.96046448e-8` cell and minimum corner-normal dot is `0.999997241`. Finite PBR texture/filtering differences are measured per treatment in `validation.json` and remain explicit representation losses.

The repeated portable-export check recreates all three GLBs and six PBR atlases byte-identically on this Blender 4.3.2 environment. It does not promise cross-platform identity. No source/sprite file is altered by that test. Material-only scalar/ramp edits and same sampler/seed also retain exact shared body alpha, footprint and projection, rather than correcting pixels by cropping or silhouette masking.

Browser measurements pass 16 viewport/cell/DPR cases, 20 mixed assembly cases and eight uniform dense-maze cases. Maximum measured anchor error is `0.0147839461` CSS pixels. Both moods use identical role/finish placements; body/shadow choices match, all shadows precede correctly sorted bodies, no page overflow or image errors occur, native scrolling/reset work, seed changes affect only finish IDs, seed round trips restore the layout, and there is no persistence or required animation. Three fixed-selector/fixture tests and three existing projection checks pass. Client code is unchanged; the prior 159-test independent Batch 01 result is historical evidence, not a claim of a new client test run.

**Known limits retained:** faint repeated-ground seams are visible, especially in evening; scene amber pools illuminate only ground, not vertical walls. This batch intentionally leaves both as separate terrain/lighting work. The models remain archival geometry with 13 material groups and 1024² PBR maps, not a runtime LOD. Physical phones, Safari/Firefox, assistive technology, GPU costs and ranked camera fairness remain unverified/open. No gameplay integration, runtime 3D loader, renderer/camera flag, production build, merge, deployment command or CI polling was performed.

Evidence entry points:

- `four-finishes-cell36.png` / `four-finishes-cell48.png`: all four finishes in both moods at actual game cell widths.
- `authoring-four-finishes.png`: full 256×352 authored sprite comparison, explicitly not game scale.
- `mixed-run/corner/T/cross/block/maze-cell36/48-pair.png`: native day/evening mixed adjacency and narrow corridors.
- `uniform-v03-maze-cell36-pair.png` and its 48px pair: darkest treatment's well/route visibility.
- `320x568-cell36-review.png`, `390x844-cell48-review.png`, and DPR scene crops: emulated phone frames.
- `alpha-v01/v02/v03/v04-white/black/checker-pair.png`: per-treatment alpha/fringe review.
- `mixed-overlap-grayscale-pair.png` / `mixed-overlap-reduced-effects-pair.png`: color/effect-independent silhouettes.
- `source-audit.json`, `validation.json`, `repeat-portable.json`, `browser.json`, `index.json`, and each `variants/v0*/evidence/` report: reproducible technical measurements and artifact hashes.
