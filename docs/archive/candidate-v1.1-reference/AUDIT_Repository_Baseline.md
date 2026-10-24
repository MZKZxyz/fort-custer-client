> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# Repository Verification Baseline

**Read-only inspection:** 24 October 2026. These are reviewed GitHub `main` commits; they are not proof of what is deployed or stored in production MongoDB.

| Repository | Reviewed `main` SHA | Verified focus |
|---|---|---|
| [client](https://github.com/MZKZxyz/fort-custer-client) | `fa3ada6a2cdda4fd455fbc8edc0bfc8c1d140c27` | React PWA and CSS maze, movement reducer, recovery, Field Kit, browser tests |
| [server](https://github.com/MZKZxyz/fort-custer-server) | `d82c272b47486161bf9f37508b69fe3240678655` | Express/Mongoose models, attempt endpoints, completion and reward logic, generation and seeder scripts |
| [automation](https://github.com/MZKZxyz/fort-custer-automation) | `b5cb4dd58410adadf745431a79ea94ddf5bba497` | Custom automation stack; outside core game spec implementation scope; unfinished draft PR #35 not made mandatory |

## Verified code facts

- **Input/movement:** [`src/game/movement.js`](https://github.com/MZKZxyz/fort-custer-client/blob/fa3ada6a2cdda4fd455fbc8edc0bfc8c1d140c27/src/game/movement.js) is a pure `move(state,direction)` transition. It blocks `#`, needs extinguisher for `F`, clears fire without position change, and accepts one extinguisher without stacking. Stateful `X`/`F` edits clone the grid.
- **Current view:** [`src/pages/MazePage.js`](https://github.com/MZKZxyz/fort-custer-client/blob/fa3ada6a2cdda4fd455fbc8edc0bfc8c1d140c27/src/pages/MazePage.js) maps an entire CSS grid, with radius-1 visibility/fog and keyboard/D-pad. Its UI timer begins on playable load; no swipe handler was verified in the reviewed file.
- **Completion:** [`services/completions.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/services/completions.js) measures from attempt.started through receipt, snapshots results, retries optimistic concurrency, and samples uniformly from unseen reward records. Latest completed attempt overwrites `sub.progress[date]`.
- **Attempt routes:** [`routes/mazeRoutes.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/routes/mazeRoutes.js) validates date/profile, starts UUID attempts, and exposes `/maze/rewards/all` without authentication (catalog read, not an instruction to use live API).
- **Schema:** [`models/RewardItem.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/models/RewardItem.js) contains `id`, `name`, `image`, `description`, `category`, `rarity`, `marketValue`. [`models/User.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/models/User.js) stores subprofile progress/reward counts/attempt snapshots.
- **Seeder located:** [`scripts/rewardSeeder.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/scripts/rewardSeeder.js) has **112 statically defined IDs**, no duplicate IDs found in the source inspection, with category counts: artifact 48, tool 19, weapon 15, gear 13, trophy 11, goods 5, consumable 1. Rarity labels: common 36, uncommon 49, rare 24, legendary 3. **These are definitions, not verified DB counts.** Its `deleteMany({})` followed by `insertMany()` is destructive, and the script connects to `MONGO_URI` on invocation. Never execute during read-only audit.
- **Seeder vs catalog:** [`data/rewards.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/data/rewards.js) contains five simple emoji items; it is not the full RewardItem schema seeder. No current production catalog audit was performed.
- **Generator:** [`scripts/generateMazes.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/scripts/generateMazes.js) uses `Math.random()` in grid generation and hardcoded dates 2025-05-26 to 2025-09-01. [`tools/maze-analyzer/generator.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/tools/maze-analyzer/generator.js) injects a deterministic RNG for offline analysis. The production writing script must not be called seed-deterministic without additional proof.
- **Leaderboards:** [`routes/leaderboardRoutes.js`](https://github.com/MZKZxyz/fort-custer-server/blob/d82c272b47486161bf9f37508b69fe3240678655/routes/leaderboardRoutes.js) uses 2025 seasonal bounds for daily/weekly paths and reads aggregated subprofile progress.
- **Field Kit:** [`src/pages/CollectionPage.js`](https://github.com/MZKZxyz/fort-custer-client/blob/fa3ada6a2cdda4fd455fbc8edc0bfc8c1d140c27/src/pages/CollectionPage.js) shows 12-slot pages and category filters; tile selection uses clickable `div`s. [`src/pages/ResultsPage.js`](https://github.com/MZKZxyz/fort-custer-client/blob/fa3ada6a2cdda4fd455fbc8edc0bfc8c1d140c27/src/pages/ResultsPage.js) uses a clickable crate image.
- **Client tests:** `e2e/responsive.spec.js` and `e2e/dpad.spec.js` enforce current full-board presentation; a renderer migration needs companion test updates, preserving behavioral checks.

## Evidence gaps requiring separate read-only work

1. Actual active MongoDB RewardItem records, counts and image existence (the 112 static entries may not match deployed catalog).
2. Actual available maze date range, scheduled generator job, real seeded consistency, and deploy commit identity.
3. On-device performance, text legibility, keyboard and screen-reader playability, network timing distributions.
4. Canonical original-family history and rights/provenance for object photographs and other real references.
5. Two architectural source images referenced by Art Direction PDF but not included in this audit input.

No claim that the live database contains 112 items, that 2026 dates are unavailable, or that any production migration is required is warranted from this code-only review.
