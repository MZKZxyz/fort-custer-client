# Fort Custer Maze — Approved Art Reference Pack

Prepared October 24, 2026. Visual design references for specialized Art, UX, Rendering and Gameplay agents.

## Authority and precedence

**01_Final_Direction** contains the most recently favored look. The nearest-overhead gameplay concept is the best current framing reference; the lantern-lit prairie concept is the strongest mood and material reference. The comparison board illustrates a feasible pre-rendered 2.5D path rather than an approved engine choice. The scrolling-maze board is supplemental.

**02_Real_Maze_Architecture_References** contains user-provided stylized renders of the real maze architecture: open-topped individual pallet-box cubes; timber bridges, railings, watchtowers/gatehouse, fence and outdoor prairie context. These are architectural source references, not exact gameplay maps or an asset license declaration.

**03_Development_Explorations** contains superseded/intermediate concepts for optional consultation, NOT authoritative layout or mechanics.

## Agreed design principles
- Simplified claymation / handcrafted tabletop 2.5D aesthetic; nearly overhead camera with just enough depth to show pallet-cube sides and open tops.
- Regular rows and columns of **individual** pallet-box cubes, with mild nonuniformity and believable navigable dirt/prairie pathways.
- Prairie grass and wildflowers rather than random evergreen trees scattered inside the maze.
- Lantern-lit evening as the favorite mood; additional times of day and weather are future environment variations.
- Zoomed player-following scrolling camera; mostly stationary player near center; offscreen terrain supplies exploration mystery, subtle cloud atmosphere at screen edges.
- Compact HUD with date, precise timer, **one** extinguisher inventory slot; touch swipe preferred, optional accessible direction controls.
- Preserve existing server gameplay and collision semantics until explicitly changed.

## Concept-art caveats
These are **not** pixel-perfect implementation specifications. Image generation sometimes shows incorrect maze topology, inconsistent cube spacing, oversized props, incorrect visibility/fog, invented UI elements or unreachable paths. Agents MUST NOT infer gameplay mechanics, object positions, collision logic, pause functions, minimaps, or reward rules from the images. Refer to the approved gameplay, art, technical, and UX documents and verify against repository code.

## Practical art constraints
A production tile set must use one consistent top-down orthographic-ish camera angle, transparent assets, repeatable grid alignment, coherent shadow direction, fixed pivot points, controlled overdraw, and validation at mobile tile scales. Do not start bulk asset generation or rewrite rendering based solely on these reference images.

## Current project decisions override older reference captions
- 58-degree miniature rendering direction has been provisionally accepted for the engineering prototypes; source visuals are inspiration, not mechanically correct geometry or a mandate to change the camera.
- The normal maze endpoint is ONE painted miniature tipi, without a visible E marker or finish arch. Keep the logical internal E tile; existing `public/images/teepee_01.png` to `teepee_09.png` are important game-identity references.
- Engineering/gameplay and accessible control integration take precedence over another art-production pass. Preserve existing collectibles; defer AI-artifact cleanup and lantern-dusk ambient lighting polish.
- The pack's lantern-lit reference remains the desired future mood, not evidence that the current blue dusk prototype has achieved it.
- When an art agent resumes production, inspect these **actual images**, prior scene prototypes, in-game assets, and approved art decisions **before generating assets**. Review provenance and culturally sensitive symbols rather than inferring authenticity.
