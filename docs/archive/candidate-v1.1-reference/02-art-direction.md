> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 02 — Art Direction, World Geometry and Asset Production Contract

**Candidate canonical v1.1 · 24 October 2026 · Owner: Art & Assets · Approval: PENDING**

**Scope:** Visual identity, world props, sprites, geometry appearance, material language and source-asset constraints. Gameplay collision belongs to 01; compositor/renderer choice to 05; HUD ergonomics to 06; historical/cultural portrayal to 03.

## 1. Creative north star (DIRECTION)

Fort Custer should resemble a miniature, handmade frontier fort diorama photographed from a near-overhead angle: slightly imperfect wooden pallet cubes, readable earth corridors, small explorer figurine, prairie grasses and wildflowers, warm lantern light against evening blue shadows. The emotional target is inviting and nostalgic, not a grim dungeon or realistic violence.

**Strong exclusions:** glossy/plastic rendering; dense evergreen forest within corridors; generic crate or solid fence walls substituted for pallet cubes; random scatter that contradicts orthogonal layout; elaborate postprocessing that obscures navigation; unapproved background HUD elements (hearts, minimap, extra pockets).

## 2. The one-cell wall art contract

`ART-01` Each logical `#` is visually a **distinct square open-top box** built from horizontal wooden slats and corner framing, with visible hollow well from near overhead. Minor misalignments, slat/weather variants and ground decorations are permitted only if the traversability boundary remains exact.

`ART-02` A sprite/mesh must define a nominal **one-cell collision footprint** supplied by the gameplay grid; perspective, cast shadows and decorative overlap may extend beyond but may not imply a passable walkway. Adjoining wall cubes must read as separate construction units without visible walkable gaps between impassable cells.

`ART-03` Adopt one common orthographic/elevation angle, horizon assumption, shadow direction and tile-anchor convention for the **entire prototype pack**. Record these in `assets/reference/sprite-metadata.md` before producing a large library. Do not infer them from a mockup.

`ART-04` Maintain z-order plan: ground → ground decals → wall shadow → wall body → in-world item/goal → explorer → allowed overhead decoration → atmospheric overlay; rendering agent may refine but must prove unambiguous occlusion and no blocked input.

## 3. Environment and lighting

- **Dirt/path:** warm compacted surface with quiet grain, sparse stones, small flowers clustered near pallet bases; path material distinguishable from walls at native mobile scale.
- **Prairie:** grasses and wildflowers at perimeter or around nonblocking bases, never blocking fire/exit icon or entering the center of a clear corridor.
- **Evening signature:** cool blue/violet ambient, amber lantern pools, subdued shadow; preserve practical visibility outside lit pools. Daylight is a **single palette/overlay comparator** using identical geometry, not a second independent game.
- **Clouds and tilt-shift:** strictly noninteractive decoration and not a visibility game rule. High blur near current path is prohibited; reduced-effects mode should suppress heavy filters.
- **Large identity elements:** bridge/ramp, corner watchtowers, palisade, gateways as perimeter/title/expedition set pieces, not default traversal geometry. Do not introduce bridge movement without 01 sign-off.

## 4. Characters and interactables

**Explorer:** approachable matte clay figurine with broad/floppy hat, small backpack, blue accent top or similarly distinctive color. Silhouette and direction must work at actual cropped phone resolution. Pose states are presentational; coordinate and travel timing belong to 01 and 05.

**Fire:** clear orange hazard, distinguish from decorative lantern light. **Extinguisher:** recognizable red shape with hose/lever, not a generic potion. **Goal:** preserve existing compact teepee visual for compatibility during Slice 01, but historical naming/portrayal review remains under 03; do not replace silently. **Reward crate:** results/reveal motif, not a map obstacle by default.

Art agents may design item visuals but cannot declare them collectible, mechanically active or historically authenticated without 04 and 03 review.

## 5. Prototype asset package and metadata

Before commissioned asset expansion, create one **small test pack** in an isolated branch or design directory:

| Asset | Minimum prototype | Acceptance observation |
|---|---|---|
| Pallet cubes | 2–4 variants | Distinct cells / seamless layout / perceived open top |
| Ground | 2 restrained variations | No false passages or high-frequency noise |
| Explorer | 4 directions or states | Identifiable heading on 320 px phone |
| Interactive | Fire, extinguisher, goal | All recognizable with different shapes and not only color |
| Environment | One lantern, 2 prairie clumps/flowers | Noninteractive and subordinate to collision |
| Mood | Same scene, day vs evening | Visibility preserved; no new gameplay mechanic |

For each asset record a **source/licensing statement**, file ID, intended role, transparency, native resolution, scale, cell anchor, art perspective, overlap bounds, light origin, semantic alt-name, and approved/prototype status. Do not import a concept render as a game tile without pixel-fit verification.

**Reference limitation:** The draft Art PDF names two original-architecture reference images from its authoring conversation. The PDFs uploaded for this audit do not themselves supply those image files. They must be attached/referenced before art sign-off; this clean copy does not fabricate them.

## 6. Rendering and production realism

Default hypothesis: pre-rendered transparent 2.5D assets, potentially composed by DOM or Canvas. Offline 3D authoring may be used to generate consistent sprites without committing to a 3D runtime. The final renderer decision belongs to 05 and should be based on identical maze fixtures and mobile performance, not theoretical fidelity.

Avoid oversized texture uploads, depth-of-field passes, sprite atlases with accidental bleed, per-frame CSS blur for many wall tiles, and a full four-season redraw before base art proves legible.

## 7. Acceptance and review package

`A-01` Contact sheet includes unambiguous sample pallet rows, character and hazard/goal on 13×17 fixture; no impossible openings.

`A-02` Screenshots from 320×568, 390×844, landscape and desktop capture identical world coordinates; document cropping/clamping and perceived cell size.

`A-03` Two lighting treatments of identical scene preserve readable adjacent routes; no decorative fog over critical near-field items.

`A-04` Color, shape and silhouette tests verify hazard/item recognition in high-contrast or reduced-effects treatments. Art QA reports visible artifact seams and any sprite occlusion that could mislead a player.

`A-05` Metadata and source-rights sheet accompanies deliverable. Art approval must identify the *actual asset set* by file hashes/version; mood reference approval is not asset approval.

**Open decisions:** D-01, D-02, D-04, D-05, D-19. **Original draft:** uploaded Art Direction & World Design pp1–4.
