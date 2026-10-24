> **Archived candidate v1.1 reference — not approved canonical policy.** Historical body retained below; conflicting choices are superseded by the [approved OD register](../../design/decisions.md). Audit `D-xx` IDs in this archive correspond to `AUD-Dxx`, not `OD-xx`.

# 03 — Narrative, Kearny Canon and Historical Editorial Contract

**Candidate canonical v1.1 · 24 October 2026 · Owner: Narrative & Worldbuilding · Approval: PENDING**

**Scope:** Setting, story tone, all player-facing lore, signs, historical descriptions and sourcing. Mechanic behavior and reward odds are owned by 01 and 04; any depicted historical object by 02 as well.

## 1. Core canon and historical boundary

The actual Fort Custer family attraction is the inspiration and deserves a respectful portrayal. **Kearny Family Amusement Company is a fictional creation**, not a legal or historical statement about the real operators. Promotional signage and office memorabilia evoke the attraction's modern operating era; the player's maze experience is a stylized, temporally unspecified frontier world. Its transition from office to imaginary miniature does **not** require an explained portal or consistent time-travel physics.

Use two clearly labeled narrative registers:

- `HERITAGE`: documented historical information or carefully attributed family recollection. Fact assertions require source/approval flags and uncertainty language.
- `FICTION`: Kearny advertisements, procedural signage, whimsical objects, and invented microstories. Never portray a fictional detail as documentary evidence.

The original family, the maze's founder and remembrance of deceased relatives are treated plainly and affectionately, not as recurring punchlines.

## 2. Voice and humor rules (DIRECTION)

- Approximately three parts sincerity to one part understated dry humor, *as a guidance ratio*, not a joke-count mandate.
- Matter-of-fact expressions, short sentences, period-neutral idiom, industrious/pragmatic characters. Absurd events are treated as ordinary administrative inconvenience.
- Avoid memes, constant fourth-wall breaks, derision toward participants and contrived “quirky” dialogue.
- Each collectible card should explain **what the object is**, **historical function/context**, and then an **optional** short fictional aside. Heritage/sensitive entries may omit the joke entirely.
- No mandatory dialogue trees; narrative is discoverable through minimal prompts, stamps, signage and expedition framing.

## 3. Authority and named entities

**Current canonical fictional employer:** Kearny Family Amusement Company. It is distinct from the real Kennedy family's inspiration as described by the uploaded narrative draft; family details must be owner-confirmed rather than inferred from corporate history.

**Ranger persona:** sincere maintainer/proprietor, observant, practical, not incompetent. Other characters and names are not locked. “Wetlands park” may appear as a one-line future attraction tease without promising another game.

**Historical period:** deliberately vague frontier aesthetic. Do not assert that all objects originate in the same century or that an imaginary fort is a factual reconstruction. Avoid anachronism as an *unexplained historic fact*; creative mixed-era Americana may be presented honestly as a themed attraction.

## 4. Editorial taxonomy and metadata

Every proposed entry or line submitted for review should carry:

```yaml
content_id: "NARR-..."
placement: "field-journal | signage | expedition | onboarding | dedication"
register: "HERITAGE | FICTION"
short_text: ""
extended_text: ""
factual_claims: []
source_references: []
family_approval_needed: true
cultural_sensitivity: "none | requires review | restricted"
asset_reference: ""
item_id_or_level_id: ""  # only if verified / owned by another domain
status: "draft | sourced | approved | rejected"
```

The schema above is an **offline editorial format**, not a proposed MongoDB migration. Existing RewardItem schema contains no provenance/source fields. Engineering may propose a future storage model only if the owner accepts it and migration safeguards are defined.

## 5. Cultural and family-heritage safeguards

- Where cultural objects are mentioned, require specific sourced attribution where possible, including community/nation, context, era and source quality. Do not invent nation or ceremonial function to fill gaps.
- Avoid generic “tribal magic” jokes, sacred/ceremonial objects as power-ups or combat loot, and sensationalized violence.
- The existing `scripts/rewardSeeder.js` contains 112 source records, including generalized ceremonial descriptions. This does **not** make them historically validated. Curate an editorial review queue before rewrites or new publications.
- A grandfather/founder dedication or real artifact photo needs explicit family approval and rights confirmation, plus a quieter tone than amusement copy.
- Military/frontier artifacts may be discussed as material culture without implying endorsement of violence or introducing combat.

## 6. Example voice (noncanonical until approved)

**Welcome signage:** “A Kearny Family Attraction. You'll Find Your Way.”

**Lost visitor sign:** “YOU ARE HERE. PROBABLY.”

**Brass register aside:** “Management considered the bell an essential part of accounting.”

**Gate-key expedition framing:** “Management has misplaced the key to the north gate. The spare is currently supporting the search effort.”

These are illustrative language tests. They do not prove a particular item exists in the production catalog, nor authorize key/door gameplay. For each example, a narrative owner should confirm line length, factual claim classification and placement.

## 7. Narrative and UX integration

Narrative must be **optional** in the daily loop. Use brief skippable notices, bounded text in mobile journal cards, no timed reading blockers while gameplay runs, and accessible labels for interactive prose. Do not insert lore into server-required start/complete flow or gate play behind a cinematic.

Narrative changes proposing a new collectible ID, item role, reward, gate or level unlock require 04/01/05 approval. For environmental art and depicted objects, consult 02; for line length, focus and read-aloud behavior, consult 06.

## 8. Acceptance review

`N-01` Every HERITAGE statement lists evidence and approval status or uncertainty; no verified assertions are invented.

`N-02` Each sample contains plain object context before optional humor; cultural items are reviewed, not automatically tagged funny.

`N-03` Mobile editorial preview fits without truncated crucial facts and can be skipped/read by assistive technology.

`N-04` The Kearny fiction is clearly distinguishable from real family recollections; memorial content does not have a punchline.

**Open decisions:** D-18, D-19 and associated item sourcing in D-14. **Original draft:** uploaded Narrative & Worldbuilding pp1–4.
