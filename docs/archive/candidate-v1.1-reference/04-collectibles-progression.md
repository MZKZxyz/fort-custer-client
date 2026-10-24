> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 04 — Collectibles, Reward Contracts and Progression

**Candidate canonical v1.1 · 24 October 2026 · Owner: Progression/Systems · Approval: PENDING**

**Scope:** Reward assignment, item taxonomy, ownership, discovery, ranking, achievements, collections, assistance. Historical descriptions and provenance belong to 03; API/data migration to 05; Field Kit interaction to 06.

## 1. Verified current system (CURRENT, source as of reviewed server HEAD)

**Reward item schema** (`models/RewardItem.js`): stable logical `id`, `name`, image file, description, enum `category` (`trophy`, `tool`, `consumable`, `artifact`, `weapon`, `gear`, `goods`), enum `rarity` (`common`, `uncommon`, `rare`, `legendary`), numeric `marketValue`. Neither rarity nor value is presently a weight, shop currency, power or historical authenticity indicator.

**Ownership** (`models/User.js`): each subprofile's `rewards` map stores `{itemId: quantity}`. Attempt result is separately snapshotted and `sub.progress[date]` is updated upon save.

**Award on complete** (`services/completions.js`): for a *successfully completing attempt* with no prior saved result, load `RewardItem.find({})`; filter to IDs not present in the subprofile reward map; choose one uniformly from that unseen set using `Math.random()`; award and snapshot it in the same version-checked user save. If no unseen item remains, reward is null. Repeated calls to the *same completed attempt* return its snapshot and do not reroll. This logic is **not** rarity-weighted, fixed for a calendar date, or inherently limited to one award per date across multiple different attempts.

**Displayed collection:** `CollectionPage.js` shows per-subprofile owned items, categories, quantity counts, 12-slot pages; `ResultsPage.js` reveals reward or a collection-exhausted message. Client's local best-time record differs from server daily progress policy (see D-09).

### Major source correction: canonical seeder located

`scripts/rewardSeeder.js` contains **112 unique static item IDs**, with categories: artifact 48, tool 19, weapon 15, gear 13, trophy 11, goods 5, consumable 1. Rarity label counts: common 36, uncommon 49, rare 24, legendary 3. This is **seed source inventory**, not evidence that MongoDB has those entries. The script connects using `MONGO_URI` and runs `RewardItem.deleteMany({})` followed by `insertMany(rewards)`; **DO NOT RUN IT IN PRODUCTION AS-IS.** A previously mentioned five-entry `data/rewards.js` is a separate simplified list and is not this seeder.

**Catalog evidence remaining unknown:** deployed DB contents, which entries' images exist and load, any manual post-seeding edits, duplicate malformed existing records, actual item ownership distribution and historical claims. A safe read-only export or approved DB snapshot comparison is required before catalog changes.

## 2. Taxonomy: separate meanings

| Concept | Current/proposed | Contract |
|---|---|---|
| `category` | CURRENT enum | Preserve for old records; narrative curation families are not direct replacements |
| `rarity` | CURRENT label | Descriptive only; never advertise probability implied by enum |
| `marketValue` | CURRENT number, behavior undefined | Do not introduce a shop/trading economy by inference |
| `collectionFamily` | PROPOSED | Editorial grouping such as Fort Office, Tools, Wildlife, Kearny memorabilia |
| `role` | PROPOSED | Curiosity, decoration, utility, authored puzzle object; not derived from rarity |
| `provenance` | PROPOSED editorial source | Sourced historic fact, family recollection, fictional Kearny; no unsourced claims |
| `utilityEffect` | DEFERRED | Would require game, ranked, timing, UI and server contracts |

A collectible that is labeled `weapon` is *not* authorization for combat. A catalog `tool` is *not* automatically usable in the maze. A brass register can be an interesting curio without becoming equipment.

## 3. Eligibility, fairness and exhaustion decisions (OPEN)

`D-10` Decide whether the intended product is *one unseen item for each valid attempt* (existing), one eligible award per date/subprofile, predetermined date reward, or a mixed bonus system. Each path changes replay incentives, completion time fairness and anti-abuse concerns. **Until decided, preserve the code and show UI reflecting actual server response.**

`D-11` Rarity could mean editorial status, collectible scarcity, or odds. Current system only establishes labels; if variable bonus odds are ever approved, publish exact odds and snapshot one roll per authorized eligibility event. No purchases, bought rerolls, or pay-to-win ranking advantages.

**Exhaustion:** Current completion returns `null` once all catalog IDs are owned. Never promise a new item indefinitely; propose a clear “collection complete” message, optional commemorative stamp or cosmetic *only as alternatives*. Duplicate currencies/exchanges need anti-abuse and economic design first.

**Identity:** ownership is per-subprofile in source. Whether an account-wide shared cabinet should exist is a separate migration decision; do not silently pool family members' rewards.

## 4. Editorial Field Journal (PROPOSED, low-risk pilot)

Design a journal that preserves owned-item browsing and filtering, but offers a readable “what it is / when & how used / one useful fact / optional dry Kearny aside” detail view. Contextualize culturally significant or contested objects accurately. Sourced attribution can live in an offline editorial file first; do not require new database columns for the pilot.

**First low-risk deliverables:** read-only inventory of static source vs DB (if approved), catalog/image cross-check, 10 rewritten example entries with source register and 3 proposed collection families, mobile journal prototype with keyboard-operable browsing. Favorites, silhouettes/undiscovered total, set meters, and active equipment require complete catalog and persistence decisions.

**Sensitive content:** Generalized “ceremonial” references, nation-specific textiles and historic objects in the static seeder require narrative/provenance review. No fabricated family ownership claims or magic effects. Existing player inventories retain their IDs through any editorial migration.

## 5. Achievements (DEFERRED until data contract)

Potential explorer/mastery/collector/heritage/expedition achievements are not in the verified schema. A limited initial program of ~12–20 was proposed, not approved. To become actionable, each achievement requires a stable ID, triggering authoritative event, retry rule, deduplication key, retroactivity decision, ownership scope, and visible/hidden display policy. Do not create permanent awards from local UI state or duplicate them when a completion is retried.

Achievements requiring level IDs, known catalog set membership or complete history cannot be shipped from partially known source records. Avoid punitive irreversible streak-loss awards.

## 6. Utility and puzzle object constraints (DEFERRED)

Illustrative ideas include compass hint, lantern visibility preview, temporary map reveal, stopwatch freeze and a decorative display subset. None is approved for real daily rankings.

- **Critical:** server completion seconds are based on stored start and receipt; a client-only “freeze timer” cannot change official time fairly.
- Any assistance effect must identify mode-specific rules and persistent `assisted` status or be excluded from ranked play.
- A rare curio must never gate completion of an authored story puzzle. Puzzle keys/parts should be level-local guaranteed objects with the authored level state managed by 01/05.
- Broad crafting, item exchange, virtual currency, house furnishing and monetized gacha are excluded from the current milestone.

## 7. Migration and data integrity requirements

Before any catalog/reward code change:

1. Obtain a permitted read-only export of actual RewardItems and a versioned source manifest; compare 112 source entries against DB, IDs, image names and owner rewards. Do not run the destructive seeder as a read tool.
2. Record missing/mismatched assets, orphaned references, provenance issues, and entries under active review; preserve stable IDs.
3. Define effect on already-snapshotted reward results and existing subprofile maps; rollback must not delete earned items.
4. If changing award eligibility, add tests for same-attempt retry, concurrent completion, multiple new attempts on same date, exhaustion, legacy results and partial catalog migration.
5. Require an explicitly approved migration and staging backup validation; no silent production write.

## 8. Acceptance tests and responsibilities

`P-01` Replay of a completed attempt always returns same recorded item/no item; no double award.

`P-02` Uniform unseen set and null-on-exhaustion are verified in unchanged behavior tests; rarity does not affect probability.

`P-03` New item editorial pilot covers accuracy, source, no offensive stereotyping, mobile legibility and category compatibility.

`P-04` UI never promises a guaranteed daily prize before authoritative save; accessibility semantics for reveal.

`P-05` Changes to collection tags/roles never alter legacy IDs, reward counts or server attempt snapshots without migration plan.

**Open decisions:** D-09, D-10, D-11, D-14, D-15, D-17, D-19. **Original draft:** uploaded Collectibles & Progression pp1–5.
