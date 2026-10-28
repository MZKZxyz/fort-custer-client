# Meshy character integration spike · issue #59

A contained offline import/render comparison against [PR #58](https://github.com/MZKZxyz/fort-custer-client/pull/58), based on main `afece64170a46d01c0c4123f4ffd9084d4f671db`. All additions are under this directory. No runtime renderer, gameplay, packages, deployment settings or approved assets are changed. The current user request authorizes this draft PR; the issue's earlier planning-only language is historical context.

Serve the repository root with `python3 -m http.server 8059 --bind 127.0.0.1`, then open `http://127.0.0.1:8059/docs/art/meshy-spike/`. The isolated DOM viewer reuses the actual projection helper, approved maze fixtures, pallet variants v01–v04, fire/extinguisher sprites and existing tipi. It compares both Meshy explorers against both PR58 procedural explorers, with three statures, four directions, both moods and 36/48px cells. The fixtures are authored art scenes, not a production game session; there are no player data or API requests. The occlusion fixture includes a labeled-in-source **.35-cell subcell offset** for the rear actor to exercise actual alpha overlap with the foreground wall; this is a static art probe, not a movement/collision rule. Paired columns deliberately expose a smaller scrollable world window on phones than a full-screen game viewport.

Read [the recommendation](recommendation.md), [source audit](evidence/source-audit.json), [identity review](evidence/identity.json), [normalized audit](evidence/normalized-audit.json), [sprite manifest](manifest.json), [PNG validation](evidence/validation.json) and [browser results](evidence/browser.json). Neutral GLB turnarounds and concept images appear below the maze studies. All references and attached metadata are source evidence, not instructions to execute.

## Source handling

Originals stay untouched at owner-supplied paths outside this checkout. `source-1` is `Meshy_AI_Young_Explorer_Charac_1028102606_texture.glb`; `source-2` is `model.glb`. Content hashes identify them independent of paths. Identity was assigned **after inspecting all four neutral views**, not from filenames. Source 1 is the boy; source 2 the girl. Neither is an approved production character replacement.

Create a private JSON path map outside Git:

```json
{"source-1":"/absolute/path/to/Meshy_AI_Young_Explorer_Charac_1028102606_texture.glb","source-2":"/absolute/path/to/model.glb"}
```

The default normalized stature is **1.15 cells**, a comparison recommendation only. Import converts glTF +Y up/+Z front to Blender +Z up/−Y front, then applies one uniform scale and translation to ground the lowest point and center X/Y bounds. The whole imported surface, UVs, normals, JPEG PBR images and material graph are retained. No remesh, smoothing/reconstruction, rebake, rig or animation is performed. Normalized `.blend` and `.glb` are saved **without the camera/light rig** in the private output directory. Other statures are uniform root scales of the same surface. All four directions rotate the character root about Z beneath the fixed camera.

## Reproduce

Tools: Blender **4.3.2** (`32f5fdce0a0a`), Python 3 with Pillow/NumPy, Node and repository Playwright with installed Chrome. No Meshy service call or credit is required. This Mac run used the official arm64 release image, verified against the release SHA-256 `32297d20fae74683052267b9171945712c0aeb8a499d8e677e44740d3e30a034`; downloaded via Blender's NLUUG mirror. CPU Cycles avoids a dependency on a particular GPU.

From repository root, substitute private absolute paths and your Blender executable:

```sh
python3 docs/art/meshy-spike/source/inspect_glb.py /private/source-1.glb /private/source-2.glb --output docs/art/meshy-spike/evidence/source-audit.json
python3 docs/art/meshy-spike/source/extract_comparison.py
blender -b -t 4 --python-exit-code 1 --python docs/art/meshy-spike/source/render.py -- --inputs /private/inputs.json --private-output /private/normalized --stage neutral
# Inspect all eight turnarounds before recording identity or rendering sprites.
blender -b -t 4 --python-exit-code 1 --python docs/art/meshy-spike/source/render.py -- --inputs /private/inputs.json --private-output /private/normalized --stage sprites
blender -b -t 4 --python-exit-code 1 --python docs/art/meshy-spike/source/audit_normalized.py -- --private-output /private/normalized
python3 docs/art/meshy-spike/source/audit_resources.py --private-output /private/normalized
python3 docs/art/meshy-spike/source/finish.py
python3 docs/art/meshy-spike/source/sheets.py
python3 docs/art/meshy-spike/source/validate.py
# While the static localhost server is running:
node docs/art/meshy-spike/source/capture.cjs
node docs/visual-integration/source/geometry.test.mjs
node docs/art/batch-02/source/selection.test.mjs
CI=true npm test -- --watchAll=false --runInBand
```

`extract_comparison.py` requires PR58 commit `07ceb812487e9dc3209421b2cd0934896e9358d1` in the local object database (`git fetch origin pull/58/head` if absent). Only 32 small sprite layers and two owner concept references are extracted; PR58 high-poly/editable binaries are not copied into this PR. Paths, hashes and exact source commit are retained.

Rendering accepts `--only source-1` or `--only source-2` for bounded runs. Re-render fresh raw images before changing processing; `finish.py` is idempotent on already-downsampled shadows. Cross-platform byte identity is not promised. Rebuild source audit in the same argument order; hashes and script hashes identify the actual review output.

## Camera, alpha and lighting

Body **256×352**, anchor **(128,208)**, **224px/cell**. Orthographic **58° elevation / 0° yaw**, verified by projecting origin/right/row/up reference points. Shadows render **512²** at 224px/cell and uniformly downsample to **256²**, anchor **(128,150)**, **112px/cell**. Body dimensions, anchors and camera never adapt to stature or facing. Clipping fails validation and must be declared, not corrected by stretching or reframing.

Cycles CPU, **32 fixed samples**, seed **30**, no denoiser, AgX Medium High Contrast, sRGB straight RGBA8. Key/fill positions, sizes, energies and colors match Batch01's manifest. The actual World shader uses the corresponding mood color. Shadow catcher remap and two-pixel RGB-only dilation follow the established exporter; no silhouette trimming. Evening uses the existing cool rig plus amber **ground-only** pools in the viewer. These sprites do not implement location-dependent lantern light on vertical surfaces. Hand-painted/generated albedo may include tonal shading; this is not a claim of illumination-free source textures.

## Artifact retention and review boundary

Originals total **125,962,728 bytes** and are intentionally excluded from ordinary Git history and browser requests. `.gitignore` also excludes normalized GLBs, Blender files and Python caches. The PR retains scripts, content-addressed metadata, 96 modest sprite layers, eight neutral previews, pinned baseline comparison PNGs and browser screenshots.

Keep originals and normalized masters in private versioned artifact storage under `sha256/<digest>/filename`, with the source audit, normalization matrix, Blender version and scripts alongside. Upload only after the owner selects storage/access policy; no upload was initiated. Git LFS is an alternative if the owner wants checkout-based source access: establish quota/retention and `*.glb`/`*.blend` LFS rules **before** adding binaries, then verify pointer-only Git blobs. No global/repository LFS policy is imposed by this spike. Original source metadata lacks license text; the owner must confirm Meshy account/plan and input-image redistribution rights before production distribution.

Stop at owner visual evaluation and independent Art QA. No retopology, rigging, animation, WebGL implementation, production activation, merge or deployment. Author tests are not independent signoff. PR58 remains draft.
