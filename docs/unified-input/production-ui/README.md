# Production UI cleanup — PR #44

Addresses comment 6412926351. Normal gameplay no longer exposes the three-mode steering comparison. `REACT_APP_MAZE_INPUT_PREVIEW=true` explicitly restores it for local owner/UX comparisons; unset or any other value leaves it absent. Preferred trailing-anchor mode remains the controller's unchanged default.

The integrated row/column/four-neighbor description is visually hidden and attached to the maze region with `aria-describedby`, preserving assistive orientation information. Real movement instructions, equipment/fire guidance, queued-turn/blocked feedback, and the state-preserving classic fallback remain player-facing. No movement controller, geometry, cadence, expiry, payload or persistence implementation changed.

Validation uses optimized default builds (visual/camera flags unset), integrated opt-in builds, and an explicit input-preview build. Across 320×568, 390×844, 844×390 and 1280×800, tests assert selector absence in normal gameplay, instructions, hidden diagnostic styling/accessible description, visible fallback, trailing behavior, fire/completion, cancellation and preserved comparison functionality in preview. Unit tests:112 passed; three optimized builds compiled. Final browser results are recorded below after local completion.

To compare locally, rebuild with `REACT_APP_MAZE_INPUT_PREVIEW=true` and use the existing synthetic interactive playtest instructions. Keep this flag OFF in normal production settings. No environment setting was changed. Existing physical-device, Art/accessibility and ranked gates remain open. Before any merge, owner review of deployment branch tracking and production variables remains external to this change; no account-specific deployment settings were inspected or changed.

Rollback: revert this cleanup commit and rebuild; this restores the previously visible comparison/diagnostics. No migration or recovery-data deletion is required. Independent focused review remains required; no merge, deployment or CI polling.

Final browser results: default **31 passed /5 explicit skips**, integrated **31 passed /5 explicit skips**, preview UI/comparison **8 passed**. Production skips are the four deliberately preview-only comparisons and desktop CDP touch; production UI assertions run at every layout. No local failures. Revertibility is checked by reverse-applying the complete staged diff without executing rollback.
