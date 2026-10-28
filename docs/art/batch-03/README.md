# Fort Custer · Batch 03 teenage explorer master study

Issue [#57](https://github.com/MZKZxyz/fort-custer-client/issues/57), based on requested main **`afece64170a46d01c0c4123f4ffd9084d4f671db`**. Main matched exactly before authoring. Two original, consistent 3D character masters with four cardinal facings and matched day/evening sprites. **Proposed proportions/appearance: independent Art QA and owner visual approval required.** No animation, character selection, gameplay integration, merge or deployment is part of this batch.

## Reference interpretation and identity

The owner-supplied `Fort_Custer_Character_Batch03_References.zip` was actually downloaded, inspected and hashed. Its five PNGs are retained under `references/`; all five supplied image SHA-256 values match. `evidence/references.json` records the ZIP hash, original source names and image purposes. The ZIP's README was read as supporting handoff/reference data; the user's request and issue #57 govern execution. The images are 2D concepts, not supplied 3D geometry or mathematically verified orthographic views. No image-to-3D result, stock model or concept pixels are used as mesh/textures.

| Master | Preserved identifiers | Distinct geometry/outfit |
| --- | --- | --- |
| CHR-BOY-01 | Rust-red swept hair, green irises with pupils/sclera, freckles, brown field hat | Blue rolled-sleeve shirt, compact reddish neckerchief, tan cargo trousers, boots, backpack/bedroll and diagonal utility-satchel strap |
| CHR-GIRL-01 | Blonde hair and one physically interwoven three-strand braid, blue irises, pupils/sclera, freckles | Softer/narrower jaw, narrower shoulders, cream rolled-sleeve shirt, blue-gray scarf, olive cargo trousers, smaller belt pouch and coordinated pack/bedroll |

The individual full-body boy/girl images are primary for clothing and identity. The boy turnaround informs consistent pack, hat and side/rear construction; the girl's detail sheet informs eye color, braid and kit. The joint sheet is supplemental. Perspective/accessory-side discrepancies are regularized into one actual source per character: a single girl braid over the right shoulder, one consistent utility pouch placement and bedroll per master. No alternate costume, expression library or culturally/historically attributed decoration is inferred.

These are lean, stylized teen proportion studies with elongated legs, smaller heads relative to the old pilot explorer, relaxed hands and a modest **10° upward neutral head pose** for face visibility beneath an actual 3D brim. The shared provisional stature is about **1.34235 cells including the hat**, approximately **2.256× the approved .595-cell wall height**, and width .56 cells. This is an explicit author recommendation for owner comparison, not a production-approved stature or a literal adoption of the concept sheet's illustrative “1.7× cell” caption. Both models fit the established body frame from every facing without stretching/cropping.

## Editable and portable sources

Each `characters/boy|girl/source/character-master.blend` retains separately named/parented body, head, hair, eyes, hat, hands, boots, pack and gear. Local component origins are centered under a clean **feet-root (0,0,0)**. Packed source UV charts exist; materials remain editable procedural PBR without external image dependencies. A consistent FIXED/CLIP triangulation modifier preserves the same evaluated surface between Blender rendering and glTF while leaving underlying quad lofts editable. These are unrigged neutral masters; no armature, action, animation or deformation claim is supplied.

Each `assets/character-master.glb` is self-contained glTF 2.0, one identity root/mesh, embedded **1024² base-color and tangent-normal PNGs**, with original scalar roughness/metallic values. Each has **22 material primitives**; measured triangle counts/bytes are in the manifest. Independent source components remain in `.blend`; the portable mesh is joined for archival/instancing. It excludes cameras, studio lights/background, ground/shadow receiver and animation.

Right-handed source: **+X right, −Y forward/south/increasing maze row, +Z up**. glTF conversion is **(X,Y,Z) → (X,Z,−Y)**, with +Y up and +Z forward. One source unit/glTF metre corresponds to one logical cell. Root/mesh scales are identity; logical player occupancy remains one cell and is not inferred from visual height or gear. Exact measured bounds, root/pivot, source and model hashes are recorded. The gameplay sprite camera is not baked into model geometry.

The SHA-pinned approved Batch 01 exporter is reused through a bounded AST adapter: output paths, role names and character/provenance metadata change; the established evaluated-geometry, source-normal preservation, UV packing, PBR baking and tangent-normalization algorithms remain. The adapter fails on an upstream hash change. Base Color is baked via a temporary EMIT surface, excluding studio illumination/AO/AgX display grade. Original component Generated coordinates survive the join; procedural bump becomes a tangent-space map. The original `.blend` remains fully procedural and editable.

**Representation limits:** finite 8-bit/1024² atlases and filtering approximate continuous surface detail; Blender-specific shader/IOR behavior may differ in another engine. Tiny freckles/irises are particularly sensitive to atlas resolution. The GLB is an archival master, not a final skinned/deforming or device-certified runtime LOD. Retopology, facial topology, UV refinement, rigging, material consolidation and animation require later authorization after proportion/appearance approval.

## Four facings and sprite contract

All sixteen body images (two characters × four directions × two moods) are actual renders of the source geometry. **Only the character root rotates:** south/front 0°, east/right +90°, north/back 180°, west/left −90° around +Z. Camera, scale, lighting positions and feet anchor remain fixed. No independently generated views, mirrored/rotated 2D images or direction-specific body proportions are used. All **sixteen shadows** are separately rendered because braid, satchel, stance and pack are asymmetric.

Official camera: orthographic **58° elevation / yaw 0°**, **224 authoring px/cell**; row pitch **189.962773539px**, height rise **118.701915188px/unit**. Bodies: **256×352 straight RGBA8**, anchor **(128,208)**. Shadows: 512² rendered at 224px/cell, then uniform 2:1 downsample to **256²**, anchor **(128,150)**, **112px/cell**. Cycles CPU, 32 fixed samples, seed 30, no denoiser, AgX Medium High Contrast → sRGB. Day/evening use the approved wall key/fill and actual World shader; no scene-position light gradient is painted into albedo.

Every body retains at least **15 completely transparent outer pixels**, with all hats/boots/packs visible and no alpha masking or post-render rescaling. Some taller-character cast-shadow tails have **measured margins below 15px**, recorded individually in `manifest.json → marginExceptions`; each has a wholly zero-alpha outer edge. Those normalized soft tails are preserved at the existing shadow canvas/anchor/scale rather than cropped to make a false 15px claim. The issue permits measurable margins where feasible; independent QA/owner should review these declared exceptions. The approved 32/255 catcher-noise remap and two-pixel RGB-only dilation are used consistently. No body-frame contract change is proposed.

The neutral **full-body front/right/back/left turnarounds** and close-up portraits use separately labeled studio cameras and a face-fill softbox to inspect anatomy, eyes and gear. They are views of the same masters, not alternate runtime projections. All hats/boots are included in the full-body turnarounds; face-detail images are explicitly close-ups. Fine iris hues/freckles are verifiable in models/portraits but **not reliably identifiable at 36px**; clothing, hair, hat and pack silhouettes carry game-scale identity.

## Read-only comparison page

Serve repository root:

```sh
python3 -m http.server 8057 --bind 127.0.0.1
# http://127.0.0.1:8057/docs/art/batch-03/
```

Both characters are always shown side by side in day and evening; there is **no character selector**. Compare facings, 36/48px cells, a one-cell corridor with nearby extinguisher/fire and one painted tipi, foreground/rear wall probes, corners, a dense 13×17 maze and a worst-case goal overlap fixture. Wall finishes reuse approved v01–v04 sprites through the existing seeded art selector. All scenes use the current projected DOM sprite conventions and shared feet anchors, with ground → shadows → row/column/role sorted bodies. Page controls only change art inspection; no game input, attempts, API/user data, timer, persistence or production feature flags are involved.

The goal overlap probe deliberately draws a posed character and tipi at one anchor to expose occlusion; it does not redefine the production arrival renderer/policy. Multiple explorer probes in rear/front tests are art subjects, not a new multi-player rule. Existing extinguisher/fire/tipi and terrain are reused without edits or new badges/E markers. Native scroll/pinch/keyboard focus remain available, and reduced effects/grayscale can be inspected. The renderer, game logic and approved pallet assets remain unchanged.

Evening inherits the approved cool field rig with separate fixed amber **ground-only** scene pools. Full warm lantern relighting of vertical walls/characters, repeated-ground seams and final atmosphere remain separate environment/lighting work; these images do not claim that pass is complete. Physical-device perception/performance, Safari/Firefox, assistive technology and ranked camera fairness remain unverified/open.

## Rebuild and validate

Authoring tools: existing Blender **4.3.2**, Python Pillow/NumPy, Node, repository Playwright and `/usr/bin/chromium`. No new app package/runtime dependency or production build.

```sh
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-03/source/build.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-03/source/render.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-03/source/portable.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-03/source/audit-source.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-03/source/audit-glb.py
python3 docs/art/batch-03/source/finish.py
python3 docs/art/batch-03/source/validate.py
node docs/art/batch-03/source/fixtures.test.mjs
node docs/visual-integration/source/geometry.test.mjs
CI=true npm test -- --watchAll=false --runInBand
# With the local static server above running:
node docs/art/batch-03/source/capture.cjs
python3 docs/art/batch-03/source/package-evidence.py
```

Build/render/portable commands accept `-- boy` or `-- girl` for a bounded rebuild; build optionally accepts `--preview` before `--` for workbench snapshots. Re-render fresh raw shadows before changing sampler/light settings. Finishing is idempotent after downsampling. `python3 docs/art/batch-03/source/repeat-portable.py` optionally repeats both GLB/atlas exports and compares same-environment bytes without touching sprites or sources. Refresh finish/validation/index after any source/artifact change. Cross-platform Blender/PNG byte identity is not guaranteed; committed hashes identify the review artifacts.

`audit-source.py` reopens both `.blend` files, tests explicit irises/sclera/pupils/braid, source UVs, feet roots, no animation, and measured fits under a single camera for every facing. `audit-glb.py` parses actual binary/image/PBR/accessor data, factory-resets Blender, then imports a GLB-only copy from an otherwise empty temporary directory with no source/external textures. It checks identity transforms, position/normal/winding/area/bounds fidelity and renders source/import comparisons under identical official and face-detail rigs. `validate.py` checks all 32 PNGs, anchors, borders/dilation, per-facing day/evening alpha equality, model/texture/source hashes and complete Batch 01/02/production isolation.

## Handoff and approval boundary

[Start the review here](evidence/review.md) for linked native comparisons, paired source/clean-import renders, measured results and declared exceptions. [manifest.json](manifest.json) includes source/model/PBR/PNG SHA-256, dimensions/anchors/alpha bounds, camera, material/provenance/license, measured stature and geometry scale. [evidence/index.json](evidence/index.json) indexes native captures and reports. The supplied reference manifest is retained unchanged. These original meshes/materials follow repository contribution terms; reference concepts are not a claim of licensed editable geometry or historical/cultural authenticity.

All 32 sprite layers occupy **9.5 MiB decoded RGBA** across two characters/four facings/two moods, before reused walls/props/browser copies. A single character/facing/mood body+shadow pair is **.59375 MiB**. GLB/PBR texture sizes and triangle/material counts are reported per character; two RGBA8 1024² maps imply roughly **8 MiB per model before mipmaps**, independent of compressed GLB size. Browser cache/GPU residency and physical-device budgets are not certified. The sprite viewer does not load the GLBs.

Stop for **independent Art QA and owner approval of both proportions/appearance** before merge, animation or any further character work. No character selection, movement animation, new costume/skin/unlock, gameplay or production integration is implemented. No deployment, production-data access or GitHub CI polling. Remove this directory to roll back this art-only study; approved walls and current React/CSS/classic fallback are byte-identical to the starting commit.
