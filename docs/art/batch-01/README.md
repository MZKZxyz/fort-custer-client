# Fort Custer · Batch 01 wall-master approval gate

Issue [#51](https://github.com/MZKZxyz/fort-custer-client/issues/51). One structural wall master with daylight/dusk bodies and separate cast/contact shadows, plus matching packed earth. **Awaiting owner approval and independent QA.** No remaining sprite library, production imports, camera activation, deployment, or gameplay changes.

Serve the repository root, then open the isolated art review:

```sh
python3 -m http.server 8051 --bind 127.0.0.1
# http://127.0.0.1:8051/docs/art/batch-01/
```

The viewer uses the existing projection helper and DOM sprite conventions. Day/evening share the exact same authored layout and synchronized scrolling. Select single wall, horizontal/vertical runs, corner, T, cross, 2×2 block, open edges, occlusion probes or the 13×17 stress maze. Choose an exact 36px or 48px logical cell, alpha background, shadows, scene lantern pools and grayscale. Tab/arrow keys and native touch scrolling inspect the world; there is no API, timer, attempt, persistence or gameplay simulation. The production React/CSS renderer and classic fallback remain unchanged.

The maze topology reuses the prior visual integration stress bench. Two explorer probes in that fixture intentionally exercise different overlaps; these are art test subjects, not additional gameplay characters. A separate overlap fixture places explorers behind/in front of walls. Explorer, extinguisher and fire are existing pilot PNGs; the one goal uses the existing painted `public/images/teepee_01.png`, with the production tipi placement and no E marker. Its existing contact shadow is retained. These preview props are not new or approved final Batch 01 assets.

## Source and construction

Open [source/wall-master.blend](source/wall-master.blend) directly in Blender 4.3.2, or rebuild it from [source/render.py](source/render.py). Individual planks, corner posts, recessed floor, battens, bolts, procedural materials, lights and camera remain editable. All textures are procedural; no external image/material dependency or generated-concept pixels are baked into the model.

The builder evaluates the approved `iteration-2/source/render.py` material definitions and one-cell wall construction without running its full-scene script or altering its fixture. Seed 30 preserves the pilot's plank assignments. The original 1×1 continuous blocked footing, three slat courses, .98-cell span, corner locations and **.595-cell outer height** remain. A .094-cell-high recessed floor, interior battens, end-grain caps and inset iron hardware refine the construction. The old two protruding pegs are replaced by inset bolts to keep evaluated geometry within the collision square. There are no structural variants, lids, holes through the footing or new passage types.

All four uploaded concepts were inspected. Actual file hashes match the uploaded ZIP entries; **all five image hashes in the supplied reference manifest differ from those entries**. The original manifest is preserved unchanged; declared and actual values are recorded separately in validation evidence:

| Reference | Influence on this one master |
| --- | --- |
| `wall_concept_01.png` | Primary honey-wood palette, capped posts and rounded inset fasteners |
| `wall_concept_02.png` | Restrained plank-to-plank tone changes and inner support battens |
| `wall_concept_03.png` | Dark recessed grain and iron patina, restrained for phone contrast |
| `wall_concept_04.png` | Longitudinal grain and narrow slat seams; wear does not change outer geometry |
| `lighting_daylight_vs_lantern_evening.png` | Warm daylight vs readable cool evening with localized amber ground pools |

Original uploaded images are retained under `references/` as **reference-only** evidence, not shipping sprites, editable geometry, a camera specification or a new license grant. The ZIP SHA-256 is recorded in [evidence/reference-package.json](evidence/reference-package.json). Its kickoff document was read as supporting material; the user's scope and issue #51 govern this work. The package does not contain the separate 46-item inventory; no missing inventory details were invented and no expansion was attempted. Existing owner reference pack, OD-20 and art/visual-integration sources were also inspected.

## Portable 3D preservation · PR #52 correction

[assets/wall-master.glb](assets/wall-master.glb) is a self-contained **glTF 2.0 GLB**, exported from the accepted `.blend` without altering it or the six reviewed sprite PNGs. Only the 48 wall components are evaluated, joined and triangulated for export: one reusable mesh under one identity root. No walkable ground plane, shadow catcher, camera, light, studio background, animation or baked lighting is included. The dark continuous blocked footing is part of the wall itself. Material identities are preserved across 13 mesh primitives; this is one model, not additional crate variants.

The right-handed source basis is **+X right/column, −Y forward/increasing maze row, +Z up**. glTF uses **+X right/column, +Z forward/increasing row, +Y up**. The deterministic conversion is `(X,Y,Z) → (X,Z,−Y)`. One Blender unit / glTF metre is **one logical cell**. Source bounds are X/Y **[−.5,+.5]**, Z **[0,.595]**; native glTF bounds are X/Z **[−.5,+.5]**, Y **[0,.595]**. Root and mesh have identity transforms and a **(0,0,0) ground-center pivot**. The 58° viewpoint belongs only to the sprite/QA camera and is not encoded into the model.

The GLB freezes the evaluated bevel geometry and explicitly preserves the source split/weighted corner normals through the join. A shared non-overlapping **1024² UV atlas** carries unlit sRGB base color and non-color tangent-space normal PNGs. Each original component's local Generated coordinates are retained through a temporary attribute before joining, preventing the wood grain from stretching over the entire wall during baking. Actual Principled Base Color is baked through a temporary **EMIT surface**, excluding lighting/AO and avoiding diffuse-pass darkening of metal; normal baking captures procedural bump, without lighting. Original roughness and metallic scalars are retained per material. Export finishing restores unit/orthogonal tangent frames after Blender's four-decimal tangent conversion, preserving handedness. PNGs are embedded in the GLB and also supplied separately for checksum/audit; the GLB loads with no adjacent files.

**Representation differences:** grain/bump become finite-resolution 8-bit textures, so very fine detail and filtering can differ at close range. Editable shader graphs and modifiers stay in `.blend`; portable core metallic/roughness PBR omits Blender-specific specular/IOR behavior and other render engines can shade it differently. Exact source/import image differences are recorded in `evidence/glb-render-checks.json`, with direct same-camera day/dusk comparisons in [evidence/glb-comparison.html](evidence/glb-comparison.html). These are QA captures, not replacements for the accepted sprites.

The export has **11,824 triangles / 6,008 pre-split vertices**, one atlas pair shared by the 13 material groups and one root suitable for model instancing. glTF adds vertex splits at UV/material/normal seams. This is the preserved evaluated master, not a device-certified runtime LOD. A later authorized runtime pass can consolidate identical materials, use a smaller atlas and dissolve coplanar/decimate interior detail, while retaining the cell footing, height, cap/well silhouettes and verifying the same bounds/normal/readability tests. No LFS, hosting, runtime loader or Three.js dependency is added now.

The clean-import audit parses the binary container and embedded image hashes, validates PBR/UV/tangent data, opens the source for reference geometry, then factory-resets Blender and imports a **GLB-only copy in an otherwise empty temporary directory**. It checks an identity root/mesh, exact bounds and triangles, two-way position agreement, source split-normal agreement, upward floor winding, embedded textures and absence of lights/cameras before adding QA-only lookdev. It renders both the original and imported model at the official camera in both moods. This is author evidence for independent QA, not independent signoff.

For this portable-model correction alone (no sprite rebuild):

```sh
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/export-glb.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/audit-glb.py
python3 docs/art/batch-01/source/check-glb-renders.py --require-accepted
python3 docs/art/batch-01/source/finish.py
python3 docs/art/batch-01/source/validate.py
python3 docs/art/batch-01/source/package-evidence.py
```

For the native source/import comparison screenshot, serve the repository root on port 8052, then run `node docs/art/batch-01/source/capture-glb.cjs`. The [portable model review](evidence/glb-review.md) explains measured geometry/material differences and the actual source World shader used for matched lookdev.

`python3 docs/art/batch-01/source/check-glb-repeat.py` optionally repeats the portable export and verifies identical GLB/atlas bytes on this Blender/platform; it does not rerender sprites. After any source/evidence update, refresh `finish.py`, `validate.py` and `package-evidence.py` in that order so all hashes remain current.

`--require-accepted` additionally proves `.blend`, `render.py` and all six sprite PNGs still equal accepted commit `8b2aa6e406adec28ddd21c6cf8caabe6c93ac609`; omit that switch when intentionally rebuilding new source art after a later approval. `assets/manifest.json` includes the GLB/texture hashes, source `.blend` hash, export command/configuration, coordinate contract, material treatment, provenance and license. The pinned upstream procedural builder hash is checked by `validate.py`; AST extraction remains an authoring dependency that must be reviewed if that upstream script changes.

## Locked export and lighting

Orthographic **58° elevation above ground / yaw 0°**. One world unit equals 224 authoring pixels; row pitch is **189.962773539px**, height rise **118.701915188px/unit**. Bodies are **256×352, anchor (128,208)**. Shadows render at 512²/224px per cell, then uniformly downsample to **256², anchor (128,150), 112px per cell**. Ground uses the body convention. There is no cropping, silhouette scaling or anchor adjustment between moods.

Cycles CPU, 32 fixed samples, seed 30, no denoiser; AgX / Medium High Contrast → sRGB straight RGBA8. Material inputs are linear Blender RGB; the editable node graphs contain low-contrast directional noise for grain. `assets/manifest.json` records the evaluated bounds, mesh hash, camera samples, lights, per-layer dimensions/anchors/alpha bounds/borders/hashes, source/authority/reference hashes, and reused preview asset provenance.

The camera-left key remains at **(−6,−3,12)** and sky fill at **(4,6,10)** in both moods. Cast direction is toward world +X/+Y, screen upper-right. Evening changes key/fill energy/color and ambient only. Two static amber radial pools are independent world-positioned ground overlays, controlled separately; they never appear inside a wall PNG. Their deliberately bounded scope does not simulate dynamic relighting of vertical wall faces. Fire remains the existing pointed orange pilot silhouette. No darkness, motion, fog, bloom or badges are required to locate paths.

All six exports have **at least 15 entirely zero-alpha border pixels**. Finishing removes the existing pilot's 32/255 shadow-catcher noise floor, then extends RGB two pixels into zero alpha without changing the silhouette. A border assertion fails rather than cutting alpha to hide clipping.

## Reproduce and inspect

Existing Blender 4.3.2, Python Pillow/NumPy, repository Playwright and `/usr/bin/chromium` are authoring tools only. No package/dependency changes or application build are needed.

```sh
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/render.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/export-glb.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/audit-glb.py
python3 docs/art/batch-01/source/finish.py
blender -b -t 2 --python-exit-code 1 --python docs/art/batch-01/source/audit-blend.py
python3 docs/art/batch-01/source/validate.py
python3 docs/art/batch-01/source/check-glb-renders.py
# With the static server above running:
node docs/art/batch-01/source/capture.cjs
node docs/visual-integration/source/geometry.test.mjs
python3 docs/art/batch-01/source/package-evidence.py
```

`finish.py` is idempotent on finalized assets; always rerender before changing the sampler, geometry or lighting. Rebuild numeric parameters, geometry and anchors deterministically. Blender/platform differences can change ray-traced PNG bytes or `.blend` serialization; committed SHA-256 values identify the exact review artifacts rather than promising cross-platform byte identity. A clean export takes several minutes on the cloud CPU.

Evidence includes complete native-scale day/evening assembly pairs at 36/48px, 320×568 and 390×844 crops at DPR 1/2, landscape and desktop supplements, white/black/checker alpha, grayscale and reduced-effects overlaps. `browser.json` records measured DOM anchor error, layer/depth order, same-mood layouts, keyboard scrolling, image loading and page bounds. `blender.json` inspects the delivered `.blend`, tests the camera and casts a ray through the actual open top to the recessed floor. `validation.json` verifies six RGBA exports, borders/dilation, same silhouettes, reference/source hashes and production isolation against baseline `ea952aa6b1eafed45143607753210abf23f60867`. See [evidence/review.md](evidence/review.md) for the visual assessment and remaining limits.

## Approval boundary

Owner review must approve **camera alignment, construction details and lighting using these exact artifact hashes** before any wall variants or remaining P0 library production. Independent Art/QA must review native phone readability, occlusion and shadow/alpha edges. EG-08/09/11 and issue #33's release gate remain open; author evidence does not supply their signoff. Physical devices, Safari/Firefox, assistive technology and device performance remain unverified. No production build, camera opt-in flag, CI configuration, live data, merge or deployment was changed. Remove this directory to roll back the entire art study.
