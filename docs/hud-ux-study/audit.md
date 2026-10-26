# Production maze HUD audit and proposed UI contract

Sprint 1.4A, issue #45 / handoff 6416242980. Reviewed current main `8664c4f2026e8ec4857b31f40e51e5a7e1ce3b97`. This document is a proposal for owner review. No application code or production configuration is changed.

## Every visible element has a purpose

E = essential player information/action; G = contextual guidance; A = accessibility support; D = development-only. Decorative branding belongs with optional guidance rather than gameplay data. An element can carry accessibility semantics as well as its primary role.

| Current element / state | Class | Proposed disposition |
| --- | --- | --- |
| Fort Custer image banner, timber background | G / decorative | Keep existing backdrop; replace the large header image with a compact objective in proposals. No game art asset edits. |
| Back button / Quit confirmation / Yes / Cancel | E + A | Keep the original button, handler and native modal. Restyle only; accessible name, Escape, containment and focus restoration remain. |
| Selected maze date and calendar icon | E; icon decorative | Keep selected date in compact metadata; do not confuse it with today's date or change stored date. |
| Elapsed display and stopwatch icon | E; icon decorative | Keep the existing live value. It is the client display, not a new authoritative competitive clock. Do not announce every animation frame. |
| Single equipment slot, empty / extinguisher | E + A | Replace bulky presentation with readable “Kit empty” / “Extinguisher · 1 charge”. No extra slot, HP or resource. Equipment help remains available. |
| Full-width `#maze-input-help` before grid | G + A | Retain its accessible description nonvisually; expose compact input affordance plus keyboard-operable Help. Do not simply delete discoverability. |
| `.pallet-status` initial objective and repeated movement lesson | E objective + G instructions | Show one visible “Reach the tipi” heading. Move detailed instruction to Help; no duplicate persistent lesson. |
| `.pallet-status` “Moved one cell” | A | Keep the original live source nonvisual; do not devote a visible panel to routine steps. The proposal adds no per-frame announcement. |
| Queued turn, expiry, blocked path | G + A | Concise context line: “Turn queued down. Keep holding.” / “Turn unavailable. Steer again.” / “Path blocked. Keep holding and steer away.” Not diagnostics. |
| Fire blocked and thought bubble | E context + A | Keep the visual bubble and concise visible warning. Retain one existing live status; avoid reading both bubble and mirrored status as competing announcements. |
| Extinguisher pickup and stationary fire clear | E context + A | Kit updates immediately. “Fire cleared. Lift, then move in.” persists until a meaningful subsequent event, not a disappearing toast. Help explains arrows/D-pad equivalents. |
| Fog, circular reveal, walls/floor, player and in-view goal | E / gameplay | Preserve current classic renderer, cell dimensions, fog masks, animation preference and radius. They are not test panels. No extra map, reveal, badges or camera activation. |
| D-pad with Up/Left/Down/Right | E + A | Keep original native buttons, labels, input coordinator and handlers. Prototype targets 48×48 CSS px, never gesture-only. |
| Loading maze | E + A | Keep the real loading state. Do not show playable controls before readiness. |
| Tipi arrival / Saving your result | E + A | Retain completion freeze and existing save ownership. Use one compact visible message; do not promise a reward or saved result before acknowledgement. |
| Save error / Retry saving / Back to mazes | E + A | Keep prominent original error dialog and real retry action. Never hide in Help or auto-dismiss. Same attempt payload must survive retry. |
| Pending-save refresh/recovery / Dismiss recovery | E + A | Retain actual recovery UI and its distinct choices. Recovery/results captures are unchanged app UI, not redesigned substitutes. |
| Results route, recorded server time, reward or no reward, next/replay/navigation | E + A; outside maze HUD | Preserve original route. Captured after genuine local save/retry. Do not mix the local elapsed display with the returned server result. |
| Input-preview steering dropdown | D | Already correctly absent when `REACT_APP_MAZE_INPUT_PREVIEW` is unset. Never introduce it into ordinary gameplay. |
| Visible mode selectors, timer/rate controls, event logs, state/row/column debug chips | D | Excluded from game frame. Research comparison controls belong only to the separate review page. No production import or flag from this study. |
| Integrated artwork loading / classic fallback | E conditional | Source-audited, not activated in classic evidence. If an approved sprite build is later reviewed, keep fallback operable and state-preserving. Do not add a fallback control to classic merely for the study. |
| Integrated nonvisual position/neighbour description | A conditional | Not visible in current classic build. Do not delete accessible orientation as “debug” solely because it contains coordinates. Any future change needs accessibility review. |

There is no global bottom navigation on the actual `/maze` route. Navigation seen on `/results` is the original Results shell. This distinction was checked in real rendered pages rather than assumed from shared components.

## Three materially different treatments

**A — Field strip (recommended).** Objective, date, timer, help and one kit state form a compact header. A stable contextual line sits below the untouched maze, followed by D-pad. It is blank and transparent during ordinary movement, so the small input affordance is not repeated in another panel; critical events use the reserved space without shifting controls. Detailed instructions use a native help dialog. Critical messages are visible; the full original polite status remains nonvisual and the visual mirror is not a second live region. This is the clearest balance of comprehension, stable layout and screen space.

**B — Travel card.** A shorter header brings the maze up sooner. Equipment, status and D-pad share one card below it. It feels coherent but separates equipment from the objective and adds vertical space; at 320×568 the final D-pad row needs scrolling.

**C — Guided start.** A dismissible first-use nudge introduces dragging, arrows and D-pad; after the first actual move, only meaningful contextual messages remain visible. Help stays discoverable. Initial content needs some scrolling, the dismissal changes layout and repeat visitors may miss guidance. No persistent onboarding preference or new storage is introduced in this prototype.

Tone: sincere, plain and lightly dry (“One slot. Pack lightly.”). Precision takes precedence around hazards and saving. No jokes during errors, no unexplained F/X jargon, no color-only instruction.

## Measured comparison

On the same deterministic 13×17 sample, at 320×568: baseline page height 803 px, A 568 px, B 610 px, C 585 px. A moves the board top from 290.14 to 150 CSS px; its final D-pad edge is approximately 547.34 px rather than 766.66 px. Board width/height and every fog parameter match baseline at identical game states.

At 390×844 all three initial proposals fit. At 844×390 and 1280×800 the existing full-grid maze remains taller than the viewport; complete page captures show the scrolling required. HUD cleanup does not resolve that separate renderer/visibility decision. The 21×21 queued-turn scenario is separately retained and still scrolls where needed. The claim that A fits 320×568 applies to the documented 13×17 sample, not arbitrary grids or enlarged text.

## Explicit production UI acceptance gate

1. **Build provenance:** pin the final commit and compiled bundle hashes. Enumerate every `REACT_APP_MAZE_*` variable. Main acceptance build must have camera, visual integration, input preview and old visual-preview spelling unset/false. Local synthetic API substitution is allowed for repeatable state coverage and must be disclosed; fixture component props replacing the real application are not acceptance evidence.
2. **Content allowlist:** actual game frame may contain objective/date/time/one kit, Back, Help, maze, D-pad and meaningful contextual/save/error UI. No comparison selector, debug phase, raw event log, timing knobs, visible coordinates or fixture selector. Review both text and pixels; an absent-dropdown assertion alone fails the gate.
3. **Full visual matrix:** owner/designated UX reviewer and independent QA must open full viewport AND full-page captures at 320×568, 390×844, 844×390 and 1280×800. Review initial, moving, wall/turn queue, pickup, unequipped fire, stationary clear, arrival/saving, error/retry/recovery, quit/help and renderer fallback where applicable. Label preview overlays separately from final implementation captures.
4. **Single hierarchy:** one visible objective and one compact contextual treatment. Never ship both explanatory beige panels under a new name. No critical fire/retry/completion instruction hidden only in Help or dismissed on a timer. State changes may wrap and enlarge rather than clip.
5. **Layout:** every action has a ≥44×44 CSS px hit target, visible focus and adequate separation. No horizontal page overflow at the four sizes or 200% text probe. D-pad remains reachable by normal scrolling on larger grids/short screens. No fixed research toolbar or help layer occludes the tactical reveal. Respect safe-area padding, scroll and pinch outside/inside the existing gesture contract.
6. **Accessible feedback:** preserve names, descriptions, keyboard/D-pad and one polite meaningful-event source. Avoid duplicate live mirrors, decorative icon announcements and per-frame timer speech. Fire, queue, cancellation, save error and completion remain understandable without hue. Native modal containment, Escape and focus return must be reproduced. Physical screen-reader announcement usefulness is a required manual check; automated roles are not certification.
7. **Mechanical equivalence:** native one-contact trailing steering, queued corners, repeated collision redirection, protected 400/180 ms cadence, stationary fire clear/fresh contact, equipment consumption, completion lock, modal cancellation and keyboard parity must pass. Compare classic fog mask/radius, cell geometry, reveal and position at identical states. Do not remove legacy visibility during UI cleanup.
8. **Persistence:** one initial arrival request, same attempt on retry/refresh, server-returned time/reward semantics and pending recovery storage preserved. UI must not issue game commands or save requests merely when displaying help/status.
9. **Review evidence:** attach element-by-element inventory and actual final screenshots to the eventual substantial engineering PR. Both independent QA and owner visual acceptance must target its final SHA. Record exceptions and physical-device gaps explicitly; no inherited signoff from the design overlays.
10. **Isolation and rollback:** research assets remain outside production imports/public routes. An approved implementation should ship as one cohesive UX/accessibility correction with an explicit revert path, no dependency/data migration or production flag activation. Preview-only content requires an explicit preview gate and negative production-build checks.

## Evidence limits

Chromium 154 on cloud Linux; the unchanged app’s external Google Fonts import was unavailable, so the existing monospace fallback is visible; final production font delivery needs review; mouse/keyboard and touch-capable browser contexts, synthetic local API. Core real application states, native focus/modal checks, reduced motion, text enlargement, unchanged fog/geometry/outcomes and refresh/retry are exercised. Physical iOS/Android/PWA, real notches, browser chrome/pull-to-refresh, touch exploration, full screen-reader reading order and outdoor readability remain unverified. This is author evidence, not independent QA, WCAG certification or device/performance approval. Classic tiny cells and circular cloud visibility are disclosed baseline limitations, not silently fixed by the HUD.
