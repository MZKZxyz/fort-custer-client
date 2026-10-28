# Decision: keep the sprite pipeline; review source art before animation

**Visual gate only — owner and independent Art QA pending.** Meshy-to-sprite rendering preserves enough visible material, silhouette and costume detail to continue with the current React/CSS approach. This evidence does **not** justify a Three.js experiment yet. The largest remaining face-readability problem is geometric occlusion by the hat under the locked 58° view; the same model/camera in WebGL would have that problem too.

## What the actual sources establish

Neutral front/side/back renders identify **source-1 as the boy** and **source-2 as the girl**. Both have substantially richer anatomy, folds, boots and pack detail than PR58's procedural mannequins. The girl closely carries the blonde braid, cream shirt, blue scarf and olive trousers. The boy has brown/russet hair, a blue shirt and tan trousers, but lacks the concept's red neckerchief and bedroll. Both can read younger than teenagers, especially the boy's round face/closed fists. These differences need owner disposition; this spike does not silently correct them.

| Source | Geometry | Embedded maps | Original bytes |
|---|---:|---|---:|
| Boy / source-1 | 1,544,406 triangles; 827,169 vertices; 1 material | base color / metallic-roughness / normal, all 2048² JPEG | 53,774,852 |
| Girl / source-2 | 1,658,196 triangles; 888,494 vertices; 1 material | 4096² base color + normal; 2048² metallic-roughness JPEG | 72,187,876 |

Both have one UV set, finite unit normals, no zero-area triangles, no external resources, skeletons, animation or morph targets. Four-sided visual inspection found no obvious hollow back, missing limb or large texture hole. This is not a manifold/deformation certification. JPEG normal maps and painted tonal shading merit later material QA; metallic factors are 1 but the blue metallic-map channels average only 1.85/255 and .61/255, so these are not uniformly metallic surfaces. Licensing/task provenance limits and full source hashes are in [identity.json](evidence/identity.json) and [source-audit.json](evidence/source-audit.json).

## Native game presentation

[36px directions](evidence/native-facings-36.png) · [48px directions](evidence/native-facings-48.png) · [320×568 comparison](evidence/phone-320-36-1.15-day.png) · [390×844 comparison](evidence/phone-390-48-1.15-day.png) · [foreground occlusion](evidence/occlusion-48.png).

| Stature including hat | Relative to .595 wall | Assessment |
|---|---:|---|
| .95 cells | 1.60× | Compact; weakest costume/heading separation at 36px; little benefit from high-detail source. |
| **1.15 cells** | **1.93×** | Recommended review starting point: useful clothing/pack silhouette without adopting mannequin stature. |
| 1.34 cells | 2.25× | Strongest silhouette/detail, more overlap with props/walls; still fits, with reduced margins. |

At 1.15 cells, front bodies occupy roughly **28–30px vertically at 36px cells**, **38–41px at 48px**. Color blocks and gear carry identity; freckles/iris hues do not survive. Hat brims largely conceal faces at 58°; source portrait personality is not fully available in gameplay. Side/rear profiles distinguish pack and braid more effectively. Evening retains the costume distinction but darkens small cues. It uses the accepted cool rig and amber ground pools; position-dependent lantern lighting on characters remains absent.

The isolated DOM scenes show both explorers, all four pallet finishes, narrow corridors, foreground/rear wall order, fire, extinguisher and one tipi. Row/column sorting and foot anchors work without a renderer change. Foreground walls can hide substantial character area as expected; character/prop overlap remains an art/readability review concern. Paired phone review columns intentionally have narrow scrollable windows; these are not claims about production framing. Existing terrain seams remain visible.

## Cost and next gate

All three stature sets total **3,057,343 compressed bytes / 28.5 MiB decoded RGBA**. One chosen stature needs **32 layers / 9.5 MiB**, and the recommended 1.15 set transfers **1,017,459 bytes**. One character/facing/mood body+shadow pair is **.59375 MiB**. The viewer never loads the high-poly GLBs. For n walk frames, two characters × four directions × two moods × n frames require **16n bodies + 16n shadows**, approximately **9.5n MiB decoded** before idle states, caches or atlasing. Eight frames would be 256 layers / 76 MiB; loading strategy and frame count need a later budget.

Direct runtime use of these originals would start near **89 MiB of geometry attributes/indices plus 192 MiB RGBA8 textures** for both, before renderer overhead; texture mipmaps raise that combined lower estimate to about **345 MiB**. These estimates are not device measurements. Each character has one material primitive, but millions of triangles still need deliberate runtime optimization. No physical-phone FPS, GPU residency, Safari or thermal certification is claimed.

Local checks: **159 client tests**, **3 projection tests**, **3 selector/fixture tests**, **144 Chrome viewport/stature/facing/fixture cases**, all 96 PNGs, private Blender reopening and GLB-only imports passed. Re-import alpha differences: **zero pixels**; visible RGB mean absolute differences .0031/.0062 on an 8-bit scale, maxima 4/9. Minimum body/shadow margins are 13/9px, with clear outer edges; three below-15px cases are listed in validation.

**Owner decision requested at this gate:** choose stature and disposition the age/outfit/hat-occlusion differences. Any approved subsequent motion stage should assess hands, limb/garment separation, joint topology, UV/normal stability, then build a lower-density deformation mesh, transfer textures, skin a humanoid rig and validate walk contacts/turns plus eight-mood-direction export costs. Do not assume automatic rigging will repair the current dense fused surfaces. Meshy rigging is an option for a later bounded trial, not a prerequisite for these static exports. Only reconsider an isolated Three.js comparison if approved requirements demand continuous lighting, free turns or motion that the budgeted sprite workflow cannot meet. No rigging, retopology or WebGL work started.
