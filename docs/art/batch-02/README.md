# Fort Custer · Batch 02 pallet weathering proposals

Issue [#55](https://github.com/MZKZxyz/fort-custer-client/issues/55). **Four total wall appearances: unchanged approved v01 plus three new material-only treatments.** v02–v04 await independent Art QA and owner visual approval. No gameplay integration, renderer activation, merge or deployment is authorized by this art batch.

The branch starts at requested client `5732fa78de6398582a7d230fc960fc5dc4fb9856`; remote main matched exactly before authoring. Batch 01's original directory, source `.blend`, GLB/PBR maps, sprites, manifest and evidence are retained without modification. v01 is referenced in place rather than regenerated or duplicated. The original master was accepted after [independent QA](https://github.com/MZKZxyz/fort-custer-client/pull/52#issuecomment-6436122177) and [owner approval](https://github.com/MZKZxyz/fort-custer-client/pull/52#issuecomment-6462083347). This batch does not transfer that signoff to the new finishes.

## Treatments and limits

| Stable ID | Appearance | Material changes |
| --- | --- | --- |
| v01 | Approved honey | Original Batch 01 files and hashes; baseline/fallback |
| v02 | Naturally aged | Restrained amber/wood aging, higher roughness and a slightly fresher tone on the existing `Pallet / honey 1.003` plank material, suggesting repair without new geometry |
| v03 | Dark weathered | Darker, cooler wood, matte iron patina and slightly stronger shader bump; caps/open well stay legible at 36px |
| v04 | Sun-bleached | Reduced chroma, lighter worn timber and softened grain contrast; matte fasteners |

These are editable material proposals. The baseline palette/ramp colors are transformed deterministically, with scalar roughness/metallic and shader bump changes. No geometry, material assignments, modifiers, cap/bolt positions, floor, slat gaps, wall height, UV layout, camera, studio light positions or World shader is redesigned. There are no painted route markers, structural cracks, missing boards, new fasteners or openings. The blocked footing retains its quiet original material. `variants/v0*/assets/manifest.json` records exact material changes and affected component names. No concept/reference image pixels are used as textures.

## Locked structure and exports

Source X/Y bounds **−.5…+.5 cells**, Z **0… .595**, ground pivot **(0,0,0)**, one logical cell per source unit. All 48 component meshes and the open top/recessed floor are identical to the approved master. Both the saved source geometry hash and the GLB **POSITION/NORMAL/TANGENT/TEXCOORD/index accessor payload hash** are identical across all four appearances. Shared portable geometry SHA-256:

```text
70665297cba7b51a4df4d834e757952d0fbcf5132d4c9389be0de2dd7bc85974
```

Each new treatment has its own editable `.blend`, independently loadable wall-only `.glb`, embedded PBR base-color/normal atlases (also supplied separately), and matched day/evening body/shadow sprites. Materials retain stable v02/v03/v04 identities in names, model metadata and the top-level manifest. Geometry is one instancing-compatible design, not three additional high-poly designs. Each standalone GLB includes its own geometry for portability; a future loader can share identical geometry and vary materials/atlases. No runtime loader or Three.js dependency is added here.

The GLBs retain **11,824 triangles / 13 material primitives** under an identity root/mesh, with two embedded **1024²** PNGs each. Source is right-handed **+X right/column, −Y forward/increasing maze row, +Z up**; glTF is **+X right, +Z forward, +Y up**, converted by `(X,Y,Z) → (X,Z,−Y)`. Root and mesh have scale (1,1,1) and ground-center origin. No walkable ground, camera, light, studio background, shadow catcher or baked lighting is included in the GLBs. The dark blocked-cell footing is wall geometry and remains included.

Sprite camera: orthographic **58° elevation, 0° yaw**, 224 authoring px per cell. Ground pitch **189.962773539px**; height rise **118.701915188px/unit**. Body: **256×352, anchor (128,208)**. Shadow: **256², anchor (128,150), 112px/cell**, uniformly downsampled from the approved 512² catcher pass. All layers retain **≥15 completely zero-alpha border pixels**; RGB-only dilation extends two pixels without cutting/changing alpha. All body alpha channels are byte-identical to v01 in both moods.

Cycles CPU / Blender **4.3.2**, 32 fixed sprite samples, seed 30, no denoiser, AgX Medium High Contrast → sRGB straight RGBA8. Day/evening share identical mesh/material/camera and use the approved key/fill settings and actual source World shader. Scene amber pools remain separate, fixed ground overlays; no lighting gradient is painted into the wood.

PBR baking uses the approved pipeline: original component Generated coordinates are retained through the join, evaluated split/weighted normals are explicitly restored, Base Color is baked through a temporary EMIT surface (no studio light/AO), and shader bump is baked into a tangent-space normal atlas. Roughness/metallic remain scalars per material. Tangent frames are normalized/orthogonalized after export. **Finite 1024² / 8-bit maps approximate procedural grain; shader/IOR, filtering and close-up appearance can differ.** Full procedural nodes stay in the `.blend`. Per-treatment source/import image differences and geometry/normal measurements are in the validation report; no cross-render-engine pixel identity is claimed.

## Open the native art comparison

Serve the repository root:

```sh
python3 -m http.server 8055 --bind 127.0.0.1
# http://127.0.0.1:8055/docs/art/batch-02/
```

The isolated DOM viewer uses the approved projection helper and existing fixture/prop assets. Choose a mixed finish layout or any uniform treatment, native **36/48px** cells, single wall, runs, corner, T/cross, 2×2, open edges, overlap, authored dense **13×17 maze**, or the approved stress layout. Both moods show the identical topology and finish choices. Scrolling is synchronized; native keyboard/touch scroll and browser zoom remain available. Advanced seed/alpha/effect controls are collapsed initially to keep mobile scene content visible. There are no gameplay actions, API calls, attempts, timers, persistence, E markers or badges.

v01 ground, explorer, extinguisher, fire and one painted tipi are reused as preview context; they are not new assets. The dense fixture is a fixed art-only layout, never a generator or a stored game maze. Decorative objects are not added to corridor centers. Existing terrain seams and ground-only pools remain visible rather than being hidden by changing the renderer.

`source/selection.mjs` is **preview-only**. Contract `fc-wall-fnv1a32-v1`: UTF-8 bytes of compact JSON `[String(mazeSeed),row,column]`, FNV-1a uint32, high/low-bit avalanche with `0x7feb352d` and `0x846ca68b`, modulo four into stable IDs v01–v04. It does not use `Math.random`, date/time or traversal order. Changing seed changes finishes only; original grid tokens, coordinates and role positions are preserved. Pure tests include fixed independently computed UTF-8 vectors, traversal independence, seed round trips and fixture integrity. Production does not import this selector.

## Reproduce

Use existing Blender 4.3.2, Python Pillow/NumPy, Node, repository Playwright and `/usr/bin/chromium`. These are authoring tools only; no package/dependency changes or app build is required. From repository root:

```sh
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-02/source/render.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-02/source/portable.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-02/source/audit-source.py
python3 docs/art/batch-02/source/finish.py
python3 docs/art/batch-02/source/validate.py
node docs/art/batch-02/source/selection.test.mjs
node docs/visual-integration/source/geometry.test.mjs
# With static server above running:
node docs/art/batch-02/source/capture.cjs
python3 docs/art/batch-02/source/package-evidence.py
```

The render/portable commands also accept `-- v02` (or v03/v04) for a bounded treatment rebuild. `finish.py` expects all three completed treatments and is idempotent for finalized sprites. Always render fresh raw shadows before changing the sampler/lighting. An optional supported-environment repeat check runs:

```sh
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-02/source/repeat-portable.py
```

It re-exports all three GLBs/atlas pairs, checks byte identity, and leaves sprites/source `.blend` files untouched. Refresh finish/validate/evidence-index after any source or artifact update. Cross-platform Blender/PNG/serialization byte identity is not promised; committed SHA-256 values identify exact review artifacts.

The approved exporter and clean-import auditor are reused through **`common.run_approved`**, not copied/forked. Their complete source hashes are pinned in `source/approved-inputs.json`. A small AST adapter changes only the output ROOT and approval/variant metadata, keeping bake, normal preservation, binary export, factory-reset import and render-comparison algorithms verbatim. It fails on an unexpected upstream hash or ROOT shape. This is an explicit authoring dependency: upstream tool changes need review/re-pinning, not silent adaptation. No approved file is edited by the adapter.

## Manifest, tests and performance expectations

[manifest.json](manifest.json) identifies all four treatments, source `.blend`/GLB/PBR/PNG hashes, exact bounds/pivot/camera/color/light settings, material edits, pinned upstream inputs, source hashes, model sizes, licensing and decoded/transfer totals. v01 paths reference the approved Batch 01 directory. Three new `.blend` files and all variant model/texture/sprite assets live in `variants/`; the manifest/index provide one cohesive handoff.

Author evidence includes 16 viewport/cell/DPR cases (320×568, 390×844, 844×390, 1280×800; DPR 1/2; 36/48px), **20 mixed assembly cases**, **eight uniform dense-maze comparisons**, all-treatment white/black/checker views, gray/reduced-effects overlaps, seed-only appearance changes, and two native swatch strips. `authoring-four-finishes.png` is additionally at the **256×352 authoring canvas**, not a 36/48px game-scale claim. `source-audit.json` reopens saved sources; each variant's `glb-reimport.json` verifies isolated GLB import, textures, UVs, normals, geometry, pivot and both official-camera moods. `validation.json` checks all 16 layers, identical body alpha, baseline/production isolation and actual shared portable geometry bytes.

Only **12 sprite PNGs** are new. All four wall appearances require eight unique wall images / **2,490,368 bytes (2.375 MiB)** decoded RGBA in one mood, **4,980,736 bytes (4.75 MiB)** for both moods. Compressed wall PNG totals are recorded separately by mood. Ground/props are additional reused assets. URLs are shared by all wall instances; no per-cell texture files are created. Browser/GPU copies/mipmaps/caches and actual device memory/performance are unmeasured.

The GLBs are archival/instancing masters, **not phone-certified runtime LODs**, and are never fetched by the sprite viewer. Loading all four PBR atlas pairs into a future 3D renderer would be roughly **32 MiB RGBA8 before mipmaps**, plus geometry/renderer overhead; thirteen material groups imply multiple draw calls. A later authorized runtime pass can share geometry, consolidate materials, compress/reduce atlas resolution and build LODs with the same footprint/readability checks. No new infrastructure, LFS policy or runtime optimization is inferred here.

## Approval boundary

Stop for **independent Art QA, then owner visual approval of v02–v04**. Preserve approved v01 as fallback. Do not merge, integrate materials/selector into gameplay, activate the renderer/camera, deploy or continue the remaining sprite library from this batch. Source/production trees, package/CI/deployment settings and gameplay data remain unchanged. EG-08/09/11, real-device/GPU/perception/accessibility and ranked 58° fairness remain separate open gates. Ground seams and lantern relighting of vertical walls are deferred environment/lighting work, not defects to solve by changing this approved geometry.
