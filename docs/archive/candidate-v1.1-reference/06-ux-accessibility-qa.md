> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 06 — UX, Accessibility and Gameplay Validation Contract

**Candidate canonical v1.1 · 24 October 2026 · Owner: UX & QA · Approval: PENDING**

**Scope:** User journey, HUD, controls ergonomics, feedback, accessible alternatives, device test acceptance, Playwright strategy. Movement outcomes belong to 01; runtime rendering and timing to 05; item policy to 04.

## 1. Experience promise and information hierarchy

Fort Custer should feel like a miniature prairie diorama one can navigate confidently, not a distant full-board spreadsheet. The maze occupies the dominant available screen area. The daily loop is: select dated maze → load/enter → orient → explore and interact with fire/extinguisher → exit → save/recover → inspect result → optional collection or leaderboard. Narrative is optional and never interrupts a frequent timed daily play.

**HUD minimum:** selected date, precise *visual elapsed display*, one extinguisher slot, accessible back/quit and feedback region. Do not promise it is identical to the server's competitive duration: current code uses different start/end clocks; the authoritative recorded duration is displayed after save. Do not add HP, a minimap, coins or extra inventory fields by implication.

## 2. Current and future input behavior

| Input | Current source | Prototype contract / acceptance |
|---|---|---|
| Arrow keys | CURRENT | One logical cardinal step; no scrolling interception inside active game when focused; no stealing arrows from form fields |
| D-pad | CURRENT | Semantic labeled buttons, keyboard/tab reachable, visible on request, equivalent reducer transitions |
| Touch swipe | PROPOSED | Leading candidate one cell/gesture, maze-surface only, axis lock/threshold; page scroll, pinch and assistive gestures remain functional |
| Pointer/click | CURRENT in UI | Tap targets must have button semantics, names and double-submit prevention |
| Reduced motion | TARGET | Suppress camera ease, flashing and reveal animation while retaining state correctness |

One continuous swipe must not cause multiple unintended steps or consume interactive objects by accident. The gesture test is a controlled UX decision (`D-06`) rather than a proof that a global listener is acceptable.

## 3. Camera, viewport and path legibility

The camera keeps the explorer near the viewport center when space permits, clamps to world bounds, and preserves integer positions. The display may animate between logical cells, but collision and item ownership change only through the reducer. Start with a 7–9-column visible-phone hypothesis and confirm by zoom/readability testing (`D-02`); the choice must be responsive to portrait, landscape and desktop.

- Wall and path texture/silhouette must read clearly and reveal no fake gaps created by pallet cube spacing.
- The current 3×3 radius fog and future offscreen-only clipping are distinct information policies; `D-03` cannot be implemented by art alone.
- Cloud/vignette and depth-of-field cannot hide immediate hazard or input, even in evening scene. In high-contrast or subdued-effects treatment essential visuals remain legible.
- Camera may clip offscreen tiles for performance but must not render empty void on border, transition or resize.

## 4. Loading, game state, save and result feedback

**Loading:** readable loading message, disabled movement, no visible claim that stopwatch has started before playable screen. Warn that server attempt begins earlier; official time is server calculated, not UI time.

**Collision:** no move through walls; fire without extinguisher shows concise actionable hint rather than silent confusion. With extinguisher, clearing fire consumes resource **without entering the cell**; player must command movement again.

**Completion:** freeze input immediately; show saving state; do not promise an item before server confirms result. Preserve date and `attemptId` across retry, failure, reload and navigation. On network uncertainty offer clear choices **Retry saving**, **Back to mazes**, and **Dismiss recovery** with distinct consequences.

**Rewards:** item may be null on exhausted catalog. Reward crate animation must be skippable and reduced-motion compatible. Give semantic keyboard-operable reveal action and an accessible reading order for name, object context, category and rarity.

**Currently observed gap:** Field Kit item tiles are clickable divs rather than keyboard-operable semantic buttons; results crate is an image with onClick. Treat accessible replacements as a focused existing-feature improvement (not a new mechanic).

## 5. Accessibility contract

**WCAG 2.2 AA is a target for conventional UI**, not an audit-backed compliance claim. Document game-specific exceptions and tested mitigations; never claim universal screen-reader gameplay without validation.

- Every action is accessible without a swipe: keyboard and appropriately labeled on-screen buttons.
- Focus is visible, modal behavior traps/restores focus appropriately, and focus does not disappear after result/reveal or route changes.
- Text/icons convey rare hazard, inventory and reward states without reliance on hue alone.
- Screen-reader regions announce loading, blocked fire, extinguisher consumed, save outcome and completion while avoiding noisy alerts for every camera frame.
- Honor `prefers-reduced-motion` and provide subdued-effects/high-contrast configurations as needed.
- Respect visual viewport, safe-area insets, zoom, 320×568 portrait and short landscape; no clipped HUD, nav overlap or forced horizontal scroll.
- Use text alternatives that describe item/goal action, not redundant “image” labels.

## 6. Source-aware test strategy

Existing Playwright tests `e2e/responsive.spec.js`, `e2e/dpad.spec.js`, `e2e/completion-recovery.spec.js` exercise real browser interactions and current **full-board** layout assumptions. Renderer work should update presentation-specific assertions only in the same reviewed PR, retaining player-state and recovery parity. Never delete tests merely because a new crop invalidates `.maze-grid` width expectations.

| QA ID | Environment / scenario | Pass criterion |
|---|---|---|
| UX-01 | 320×568, 390×844, 844×390, desktop | Full relevant controls reachable, no overlay intercept or horizontal overflow |
| UX-02 | Keyboard arrows vs D-pad vs swipe prototype | Equivalent single-step reducer outcomes, no accidental multi-step state |
| UX-03 | Wall cluster and item/fire/teepee | Correct path recognition, no false gaps, clear item silhouettes without color alone |
| UX-04 | Maze boundaries, resize, backtracking | Camera clamped, player visible, no void or state desync |
| UX-05 | Reduced motion/high contrast | No essential info lost; no forced animation or blur; state unchanged |
| UX-06 | Keyboard-only, screen reader, focus modals | Enter/leave/play/inspect/recover without inaccessible click-only control |
| UX-07 | Save timeout, replay and reload | One attempt result, no reward reroll or lost recovery key |
| UX-08 | Low-end phone real device | Record input latency, FPS distribution, texture bytes, scroll ease and legibility |

For user research, a small representative on-device playtest should report navigation friction, orientation errors, accidental gestures and legibility; a screenshot-only renderer is insufficient to close input decisions.

## 7. Small deliverable slices

**A — Audit:** verified routes/states, screenshot baseline, accessibility gap tickets, current viewport tests.

**B — Prototype:** off-production clipped player-follow viewport with fixture, no server changes, keyboard/D-pad parity; optional swipe under feature toggle.

**C — Integrate:** approved view and small art kit plus updated Playwright checks, reduced-motion fallback, explicit results/recovery behavior.

**D — Journal/achievements later:** separate approved spec change; do not conflate with camera milestone.

## 8. Ownership / cross-domain sign-off

UX owns flow maps, labels, accessibility criteria and device test evidence. Gameplay must accept input **semantics** and visibility changes. Art owns silhouette/contrast asset design; Engineering owns the rendering implementation and server contract; Progression owns reward eligibility; Narrative owns heritage copy. The UX agent cannot change server timer rules or infer unlock mechanisms from a prototype button.

**Open decisions:** D-02, D-03, D-05, D-06, D-08, D-15, D-20. **Original draft:** uploaded UX, UI & Accessibility pp1–4.
