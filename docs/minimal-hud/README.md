# Sprint 1.4D — minimal Field strip

Issue #45, handoff 6427728652; owner functional decisions 6418161663,6418280262 and6418367995. Starting main `8664c4f2026e8ec4857b31f40e51e5a7e1ce3b97`. The design study `1db11d0b2f08f5dc116e483df2c565c8b1564f8b` was read as a reference; no overlay/runtime code was imported. The later owner decisions supersede its persistent objective and reserved status line.

## Player-facing result and element inventory

| Element | Purpose / treatment |
| --- | --- |
| Date, provisional elapsed, single Kit | Essential live information in one wrapping strip. Client monotonic clock/scoring source unchanged; timer is not live-announced each frame. |
| Back, Help, Controls | Discoverable native buttons with 48px minimum targets. Quit/save dialogs retain action focus; Help initially focuses its heading, then restores the invoking control on close/Escape. Opening dialogs cancels movement. |
| Maze, player, tipi, fog/clouds | Essential unchanged classic world and geometry. No camera/58°/input preview/old visual flag in acceptance build. |
| Direction buttons | Initially absent. Controls → Show/Hide direction buttons;60px existing targets, keyboard/native touch/assistive activation preserved. `mazeDirectionButtons` local preference is per device; unavailable preference persistence does not prevent revealing/using buttons. Preference is not tutorial history. |
| Help objective/instructions | Tipi goal, dragging, arrows, fire/equipment and direction-button discovery. No permanent visible objective or movement lesson. Existing nonvisual maze description is retained. |
| Significant feedback | Pickup briefly appears, then clears after 5s or a subsequent step. Fire blocked/queued fire and stationary clear remain visible until a meaningful change. Clear explicitly requires release/fresh input. Routine moves, collisions and queued/expired turns do not narrate or reserve space. |
| Accessible announcements | One polite meaningful-event source during play; visual notice and fire bubble are aria-hidden mirrors. Save errors use their actionable alert dialog with the ordinary live status cleared. Recovery uses its separate existing alert flow. No duplicate routine narration. |
| Saving, errors, recovery | Existing completion lock, UUID persistence and retry payload retained. Loading failure is actionable in-page rather than an unhelpful dismissed browser alert. No save error is auto-dismissed or hidden in Help. |
| Visual notices | Only rendered for significant events; no reserved blank line. Non-intercepting overlay tracks revealed D-pad's top edge so guidance cannot consume its pointer input. It can cover a small part of the maze during critical exceptions. |
| Development controls | Existing explicit input-preview flag remains OFF; no selector, debug position, phase label, fixture picker, speed control or research toolbar in production frame. |
| Integrated fallback | Existing local opt-in renderer remains independently gated. Its permanent objective was removed; orientation stays nonvisual and classic fallback remains operable. No activation or geometry change. |
| Decorative banner | Oversized header removed; existing backdrop/art retained. Functional styling is restrained; visual/art approval is deferred. |

The implementation changes presentation and modal/input interruption guards, not canonical movement, controller/coordinator, cadence 400/180, 48px trailing anchor, two-cell/540ms buffer, grid/scene/camera, classic fog radius, rewards, server APIs or save identity. No server-v2 recorder/readiness logic, tutorial, new progression or production setting was added.

## Inspect complete production captures

The gallery below links **full native viewport and full-page PNGs**, not cropped fragments or injected overlays. Every screenshot uses the actual optimized app with synthetic intercepted start/complete responses; fixture React props/components are not used. No live account or backend is accessed. Baseline MazePage source in the retained optimized bundle was verified against pinned main. Current primary build explicitly unsets all four maze preview/renderer/camera flags. Sources/bundle and image hashes are in [validation.json](validation.json).

<!-- capture-gallery -->

| State | 320x568 | 390x844 | 844x390 | 1280x800 |
| --- | --- | --- | --- | --- |
| before | [window](evidence/320x568-before-window.png) / [page](evidence/320x568-before-page.png) | [window](evidence/390x844-before-window.png) / [page](evidence/390x844-before-page.png) | [window](evidence/844x390-before-window.png) / [page](evidence/844x390-before-page.png) | [window](evidence/1280x800-before-window.png) / [page](evidence/1280x800-before-page.png) |
| initial | [window](evidence/320x568-initial-window.png) / [page](evidence/320x568-initial-page.png) | [window](evidence/390x844-initial-window.png) / [page](evidence/390x844-initial-page.png) | [window](evidence/844x390-initial-window.png) / [page](evidence/844x390-initial-page.png) | [window](evidence/1280x800-initial-window.png) / [page](evidence/1280x800-initial-page.png) |
| moving | [window](evidence/320x568-moving-window.png) / [page](evidence/320x568-moving-page.png) | [window](evidence/390x844-moving-window.png) / [page](evidence/390x844-moving-page.png) | [window](evidence/844x390-moving-window.png) / [page](evidence/844x390-moving-page.png) | [window](evidence/1280x800-moving-window.png) / [page](evidence/1280x800-moving-page.png) |
| help | [window](evidence/320x568-help-window.png) / [page](evidence/320x568-help-page.png) | [window](evidence/390x844-help-window.png) / [page](evidence/390x844-help-page.png) | [window](evidence/844x390-help-window.png) / [page](evidence/844x390-help-page.png) | [window](evidence/1280x800-help-window.png) / [page](evidence/1280x800-help-page.png) |
| directions | [window](evidence/320x568-directions-window.png) / [page](evidence/320x568-directions-page.png) | [window](evidence/390x844-directions-window.png) / [page](evidence/390x844-directions-page.png) | [window](evidence/844x390-directions-window.png) / [page](evidence/844x390-directions-page.png) | [window](evidence/1280x800-directions-window.png) / [page](evidence/1280x800-directions-page.png) |
| quit | [window](evidence/320x568-quit-window.png) / [page](evidence/320x568-quit-page.png) | [window](evidence/390x844-quit-window.png) / [page](evidence/390x844-quit-page.png) | [window](evidence/844x390-quit-window.png) / [page](evidence/844x390-quit-page.png) | [window](evidence/1280x800-quit-window.png) / [page](evidence/1280x800-quit-page.png) |
| fire-blocked | [window](evidence/320x568-fire-blocked-window.png) / [page](evidence/320x568-fire-blocked-page.png) | [window](evidence/390x844-fire-blocked-window.png) / [page](evidence/390x844-fire-blocked-page.png) | [window](evidence/844x390-fire-blocked-window.png) / [page](evidence/844x390-fire-blocked-page.png) | [window](evidence/1280x800-fire-blocked-window.png) / [page](evidence/1280x800-fire-blocked-page.png) |
| equipment | [window](evidence/320x568-equipment-window.png) / [page](evidence/320x568-equipment-page.png) | [window](evidence/390x844-equipment-window.png) / [page](evidence/390x844-equipment-page.png) | [window](evidence/844x390-equipment-window.png) / [page](evidence/844x390-equipment-page.png) | [window](evidence/1280x800-equipment-window.png) / [page](evidence/1280x800-equipment-page.png) |
| fire-cleared | [window](evidence/320x568-fire-cleared-window.png) / [page](evidence/320x568-fire-cleared-page.png) | [window](evidence/390x844-fire-cleared-window.png) / [page](evidence/390x844-fire-cleared-page.png) | [window](evidence/844x390-fire-cleared-window.png) / [page](evidence/844x390-fire-cleared-page.png) | [window](evidence/1280x800-fire-cleared-window.png) / [page](evidence/1280x800-fire-cleared-page.png) |
| fire-cleared-directions | [window](evidence/320x568-fire-cleared-directions-window.png) / [page](evidence/320x568-fire-cleared-directions-page.png) | [window](evidence/390x844-fire-cleared-directions-window.png) / [page](evidence/390x844-fire-cleared-directions-page.png) | [window](evidence/844x390-fire-cleared-directions-window.png) / [page](evidence/844x390-fire-cleared-directions-page.png) | [window](evidence/1280x800-fire-cleared-directions-window.png) / [page](evidence/1280x800-fire-cleared-directions-page.png) |
| saving | [window](evidence/320x568-saving-window.png) / [page](evidence/320x568-saving-page.png) | [window](evidence/390x844-saving-window.png) / [page](evidence/390x844-saving-page.png) | [window](evidence/844x390-saving-window.png) / [page](evidence/844x390-saving-page.png) | [window](evidence/1280x800-saving-window.png) / [page](evidence/1280x800-saving-page.png) |
| save-error | [window](evidence/320x568-save-error-window.png) / [page](evidence/320x568-save-error-page.png) | [window](evidence/390x844-save-error-window.png) / [page](evidence/390x844-save-error-page.png) | [window](evidence/844x390-save-error-window.png) / [page](evidence/844x390-save-error-page.png) | [window](evidence/1280x800-save-error-window.png) / [page](evidence/1280x800-save-error-page.png) |
| recovery | [window](evidence/320x568-recovery-window.png) / [page](evidence/320x568-recovery-page.png) | [window](evidence/390x844-recovery-window.png) / [page](evidence/390x844-recovery-page.png) | [window](evidence/844x390-recovery-window.png) / [page](evidence/844x390-recovery-page.png) | [window](evidence/1280x800-recovery-window.png) / [page](evidence/1280x800-recovery-page.png) |
| retry-saving | [window](evidence/320x568-retry-saving-window.png) / [page](evidence/320x568-retry-saving-page.png) | [window](evidence/390x844-retry-saving-window.png) / [page](evidence/390x844-retry-saving-page.png) | [window](evidence/844x390-retry-saving-window.png) / [page](evidence/844x390-retry-saving-page.png) | [window](evidence/1280x800-retry-saving-window.png) / [page](evidence/1280x800-retry-saving-page.png) |
| text200 | [window](evidence/320x568-text200-window.png) / [page](evidence/320x568-text200-page.png) | [window](evidence/390x844-text200-window.png) / [page](evidence/390x844-text200-page.png) | [window](evidence/844x390-text200-window.png) / [page](evidence/844x390-text200-page.png) | [window](evidence/1280x800-text200-window.png) / [page](evidence/1280x800-text200-page.png) |
| help200 | [window](evidence/320x568-help200-window.png) / [page](evidence/320x568-help200-page.png) | [window](evidence/390x844-help200-window.png) / [page](evidence/390x844-help200-page.png) | [window](evidence/844x390-help200-window.png) / [page](evidence/844x390-help200-page.png) | [window](evidence/1280x800-help200-window.png) / [page](evidence/1280x800-help200-page.png) |

<!-- /capture-gallery -->

Normal full-page heights on this 13×17 fixture:320×568 baseline 803px →568px;390×844 remains 844px minimum page height;844×390 baseline 1071px →737px;1280×800 baseline 1387px →1054px. The board is not stretched, reprojected or zoomed to fill remaining space. Larger classic boards/short screens still require scrolling; expanded controls and 200% text may also require scrolling. Full-page captures expose that limitation. Study A's earlier figures are reference-only; these images come from the final implementation.

## Local acceptance and reproduction

```sh
env -u REACT_APP_MAZE_CAMERA -u REACT_APP_MAZE_VISUAL_INTEGRATION -u REACT_APP_MAZE_INPUT_PREVIEW -u REACT_APP_MAZE_VISUALS REACT_APP_API_URL=/api BUILD_PATH=review-build npm run build
FC_BUILD_DIR=review-build FC_HUD_EVIDENCE=docs/minimal-hud/evidence node_modules/.bin/playwright test --config=docs/minimal-hud/playwright.config.cjs
CI=true npm test -- --watchAll=false --runInBand
```

The HUD matrix covers all four sizes, normal/moving state, actual native modal focus/held-input cancellation, preference reload, revealed touch targets and pointer/Enter operation, fire without equipment, pickup, held stationary clear, fresh D-pad entry, pending save, error, refresh recovery without another start, identical retry payload,200% text/Help and CDP native touch/cancellation with stable page offsets. It also checks the absence of preview/legacy panels and preservation of the fog/no-camera classic build. Ordinary safety/timing tests remain separate; older D-pad mechanics tests explicitly select a stored visible preference rather than relying on the obsolete always-visible default. Turn tests inspect phase/positions rather than asserting removed routine text; no command/timing assertion was dropped. Repeated-native diagnostics observe input phase for expiry instead of requiring visible narration.

<!-- final-validation -->

| Final local check | Result |
| --- | --- |
| Jest default / integrated | 115 passed each, 10 suites |
| Optimized classic / integrated | Compiled; final component source maps match |
| matrix browser checks | 4 passed / 0 explicit skips |
| mechanics browser checks | 78 passed / 12 explicit skips |
| responsive browser checks | 7 passed / 0 explicit skips |
| integrated browser checks | 63 passed / 8 explicit skips |
| native browser checks | 2 passed / 0 explicit skips |

<!-- /final-validation -->

Author verification is not independent QA. An early screenshot run failed because a second page did not inherit page-scoped API mocks; context-scoped mocks fixed the harness. Another attempt found a stale local fixture server; it was stopped and the clean run restarted. A broader regression found a **real notice/D-pad pointer interception** and is retained as 77 passes / 1 failure / 12 skips before the fix. The final notice is non-intercepting and positioned above visible controls; the matrix includes a revealed-D-pad fire-clear capture and actual fresh-button entry. Pixel inspection also found initial Help focus scrolling long 200% text to Close; heading focus corrects that without changing Quit/save focus. These are corrections, not suppressed retries.

## Limitations and review gates

Linux Chromium 154 / Playwright 1.62.1; native browser mouse/keyboard and CDP touch emulation only. Google Fonts requests are blocked in the offline harness; screenshots use available system/fallback fonts. The strip inherits the existing body font stack, rather than introducing a new font asset. Physical typography may differ and requires review. The 200% probe doubles root text sizing, not physical browser zoom certification.

Physical iOS Safari, installed iOS PWA, Android Chrome/PWA, notches, browser chrome, pull-to-refresh, assistive touch exploration and actual screen-reader speech remain NOT RUN. Semantic names, focus, one meaningful-event source and large controls are automated checks, not a WCAG audit. The classic board's tiny cells, circular fog, long desktop/landscape page and scrolling to actions/controls are disclosed unchanged limitations. Critical overlays may cover part of the maze; enlarged dialogs scroll. No universal simultaneous board/control visibility or device-performance claim is made.

No production activation, deployment/secret change, merge or CI polling. Existing EG-08/09/11 and server timing/recovery/fairness gates remain open. Independent QA must inspect **both** image forms at every layout, event and enlarged-text state, and owner must approve the final SHA's actual production screenshots before merge. Functional direction is approved; these visuals are not.

Rollback: revert this single implementation commit and rebuild to return to pinned main's HUD. It restores permanent instructions/status and always-visible D-pad; leaving the harmless local preference key does not affect the reverted code. No backend migration, attempt/recovery deletion, reward change or visual flag activation is required. Complete staged binary reverse-apply passed before handoff; no rollback is deployed.

Existing random tipi variants and cloud texture rendering can differ between captures; no asset selection, artwork or fog algorithm was changed. The supplement uses the opt-in renderer locally only; all release/default activation flags remain untouched.
