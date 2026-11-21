# 04. Scoring and re-roll

The advice is a pure function of the hero, the item catalog, the Street Brawl snapshot, the mode's draft layout, and the current draft state (round, the cards on screen, owned item ids, enemy hero ids). It never reads a player's account. Everything in the draft is free, so there is no price term and no "buy it later" term.

A command-line check must be able to print the same advice for a hero, a round, and three item names, without a screen. Two labelled calls are part of parity: a recorded re-roll, and a recorded take of Burst Fire. See [11-acceptance.md](11-acceptance.md).

## Draft shape

Street Brawl has 5 rounds and 3 choices each round, one re-roll per round. Each choice shows 3 cards. The mode config names, for each choice, a normal tier and a rare tier. The snapshot shipped with 0.6.0 uses:

| Round | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 1 | tier 1, rare 2 | tier 2, rare 3 | tier 3, rare 4 |
| 2 | tier 2, rare 3 | tier 3, rare 4 | tier 3, rare 4 |
| 3 | tier 2, rare 3 | tier 3, rare 4 | tier 4, rare 5 |
| 4 | tier 3, rare 4 | tier 3, rare 4 | tier 4, rare 5 |
| 5 | tier 4, rare 5 | tier 4, rare 5 | tier 4, rare 5 |

A rare card is one whose tier is above the choice's normal tier. Re-rolling keeps each slot's rare flag and enhanced flag. Only the item changes.

Ability points per round are 6, 6, 5, 5, 10. That is used by the ability picture, not by the item score.

## Weights

These numbers are the scoring policy. They are not published by the API. Changing one of them changes advice and fails parity.

| Name | Value | Role |
| --- | ---: | --- |
| Popularity | 1.0 | Square root of within-tier pick rate |
| Win lift | 1.0 | Shrunk win rate versus the hero's average, times 10, times pick rate |
| Kit | 0.15 | Tiebreaker from how the item's stats match the hero. Was 0.3 before 0.6.0 |
| Tier | 1.0 | One full point per tier above 1. A median tier-3 card beats the best tier-2 card. Only a useless tier-3 loses to a top tier-2 |
| Counter | 0.5 | Better or worse against the known enemies |
| Synergy | 0.5 | Better or worse beside items already owned, and between the cards of one set |
| Active | 0 | Flat bonus for an active item. Was 0.1 before 0.6.0. The overflow penalty below stays |
| Upgrade | 0.15 | This card builds from an item the player already holds |
| Enhanced | 0.6 | Flat enhanced bonus, times pick rate, times the hero factor |
| Enhanced carry | 0.15 | Extra because the enhancement survives the upgrade |
| Enhanced, tier 1 | 0.9 | Tier-1 (800-soul) cards use this instead of 0.6 |
| Enhanced carry, tier 1 | 0.6 | Tier-1 cards use this instead of 0.15 |
| Duplicate | 1.0 | Minus one point if the player already holds this item. The same item twice inside one set is also minus one |
| Legendary S | 4 | A fresh draw of a rare slot weights the hero's S-grade items of that tier 4 times the others |
| Active overflow | 0.5 | A fifth active item scores 0.5 lower. It is not forbidden. The cap is 4 |
| Re-roll threshold | 0 | Re-roll when expected gain is above 0 and above the value of holding the re-roll |

Other constants:

- Win-rate shrink K is the maximum of 200 and 5 percent of the most-picked item in that tier.
- A pair needs at least 20 matches. A versus-enemy row needs at least 50.
- Enhanced stats are assumed to be 1.25 times the plain stats. The API does not publish enhanced numbers. This 1.25 is an assumption, called out in [10-data.md](10-data.md) and [UPGRADES.md](UPGRADES.md).
- Rare chance per card is 4/27. Enhanced chance per card is 3/27. Both were counted on the fixture cards, not taken from the mode config. The config's outcome tables, read as a per-card rate, are far too high and must not be used while these fractions are set. If a future measurement clears them, falling back to the config is defined below.
- Tier-1 draws are not uniform. The mode config splits tier 1 into a normal bucket of 40 and a good bucket of 60. The good share is spread by popularity. Other tiers are uniform. The config's other bucket splits are not applied.

## Who can be drafted

An item is draftable when it is not disabled, its tier is at least 1, and its name does not start with `upgrade_` or `Disabled`.

## Per-item base, before the current cards

For each draftable item, using that hero's Street Brawl rows:

1. Popularity `pop` is the item's matches divided by the most-picked item of the same tier. No row means 0.
2. Hero mean win rate is total wins over total matches across items with a row, or 0.5 if there are none.
3. Win lift is `(shrunk win rate − hero mean) × 10 × pop`. Shrunk win rate is `(wins + K × mean) / (matches + K)`.
4. Counter, only for enemies that have a versus table: for each enemy with at least 50 matches on this item, take the shrunk lift against that enemy's own mean, minus the lift against the field, times 10, times pop. Average across those enemies. No such enemy means 0.
5. Kit is specified in the next section. It is normalised within the tier: divide by the tier median of positive kit values, cap at 2, then divide by 2. An item with no priced stats uses the tier median, so its kit term is neutral. A tier with no median scores 0.5.
6. Base is `popularity × sqrt(pop) + winLift × win lift + kit × kitNorm + tier × (item tier − 1) + active × (1 if the item is active else 0)`.

S grades: within each tier, grade the hero's items with the same formula as the tier list ([07-tier-list.md](07-tier-list.md)), using this hero's wins and matches. An item graded S is a top-grade item. Only S matters. It changes the rare-slot re-roll weights, not the on-screen score directly.

Upgrade carry: walk every item this one builds into, directly or through another upgrade. Carry is the maximum of `(their tier − this tier) × sqrt(their pop)`, ignoring negatives. Remember which item produced it.

## Kit value

Each priced stat on an item contributes `abs(numeric value) × souls per unit × the hero's multiplier for that stat`. Unpriced stats contribute nothing.

Souls per unit:

| Stat | Souls |
| --- | ---: |
| BaseAttackDamagePercent | 55 |
| BonusFireRate | 60 |
| BonusClipSizePercent | 20 |
| BulletLifestealPercent | 45 |
| BonusBulletSpeedPercent | 8 |
| BulletArmorReduction | 45 |
| NonPlayerBonusWeaponPower | 12 |
| TechPower | 60 |
| TechPowerPercent | 50 |
| SpiritPower | 60 |
| BonusSpirit | 60 |
| AbilityLifestealPercentHero | 45 |
| CooldownReduction | 70 |
| TechRangeMultiplier | 40 |
| TechRadiusMultiplier | 30 |
| BonusAbilityDurationPercent | 50 |
| MagicResistReduction | 45 |
| TechPowerReduction | 30 |
| BonusHealth | 6 |
| BulletResist | 55 |
| TechResist | 55 |
| OutOfCombatHealthRegen | 30 |
| BonusHealthRegen | 60 |
| BonusMoveSpeed | 350 |
| BonusSprintSpeed | 150 |
| Stamina | 250 |
| StatusResistancePercent | 25 |
| SlowResistancePercent | 15 |
| BonusMeleeDamagePercent | 12 |
| MeleeResistPercent | 15 |
| CombatBarrier | 4 |

Hero multipliers start at 1 and then add:

- Spirit power and spirit power percent: `min(0.6, 0.08 × how many of the hero's abilities scale with spirit power)`.
- Ability duration: `min(0.3, 0.05 × how many scale with spirit duration)`.
- Fire rate and weapon damage percent: `min(0.5, 0.15 × how many ability descriptions mention bullet, weapon, fire rate, gun, shoot, or ammo)`.
- From level-up growth: weapon damage percent adds `min(0.4, 3 × bullet-damage growth)`. Spirit power adds `min(0.4, 0.2 × spirit-power growth)`.

Then apply the hand table. Only Infernus (hero id 1) has one. These replace the computed multipliers, they do not add:

| Stat | Multiplier |
| --- | ---: |
| TechPower | 1.6 |
| TechPowerPercent | 1.5 |
| BonusFireRate | 1.5 |
| BulletLifestealPercent | 1.3 |
| BonusAbilityDurationPercent | 1.4 |
| AbilityLifestealPercentHero | 1.3 |
| CooldownReduction | 1.2 |
| BonusMoveSpeed | 1.2 |

### How much of an enhancement this hero keeps

Weapon-damage stats are `WeaponPower` and `BaseAttackDamagePercent`. Infernus uses 0.2 of weapon damage. Every other hero uses 1.

The stats an enhancement is assumed to boost:

- Ricochet (`upgrade_ricochet`): weapon power only. The bounce is the same enhanced or not.
- Every other item: all of its own priced stats except weapon damage.

If that list is empty, the factor is 0.5 and the note is `boosted stats unknown`. If every boosted stat is weapon damage, the factor is the hero's weapon use (0.2 for Infernus, else 1). Otherwise the factor is 1. Clamp to 0..1. If the factor is below 0.95 the note is `weapon stats, little use for <hero name>`.

## Score of one card

Parts, then the score is their sum. `b` is the base row. A missing row contributes zeros except tier, active, upgrade, duplicate, and a plain enhanced bonus of 0.6.

| Part | Formula |
| --- | --- |
| Pick rate | `1.0 × sqrt(pop)` |
| Win rate | `1.0 × win lift` |
| Hero fit | `0.15 × kitNorm`, and if enhanced multiply by `1 + 0.25 × hero factor` |
| Item tier | `1.0 × (tier − 1)` |
| Vs enemy team | `0.5 × counter` |
| With your items | `0.5 × average pair lift against owned ids` |
| Active items | the active weight (0) plus −0.5 if this is an active and the player already holds 4 or more actives |
| Upgrade | 0.15 if any owned item is a component of this one, else 0 |
| Enhanced | 0 if not enhanced. If enhanced: `hero factor × pop × (tier-1 bonus or ordinary bonus)`, where the tier-1 bonus is `0.9 + 0.6 × carry` and the ordinary bonus is `0.6 + 0.15 × carry`. An item with no base row uses 0.6 |
| Duplicate | −1 if already owned, else 0 |

Pair lift is `(pair wins / pair matches − hero mean) × 10`, stored both ways, and only for pairs with at least 20 matches. Synergy is the average of the pair lifts against the owned ids that have a pair. No pairs means 0.

The enhanced bonus shown to the player is the enhanced part plus the extra kit the 1.25 multiplier added (`0.15 × kitNorm × 0.25 × hero factor`). The plate's `Enhanced +n` uses that bonus. The tooltip's Enhanced row equals it, and the Hero fit row is reduced by the kit portion so the rows still sum to the score.

Sort a set by score descending, then by item id ascending.

### Reasons shown under a card

Include a reason when the condition holds. Wording:

- No row: `no Street Brawl data for this item yet`
- Rare: `rare: a tier-<n> card in a tier-<normal> set` (this one is first)
- pop above 0.5: `picked in <percent> of <hero> brawls (relative to the top tier-<n> pick)`
- win lift above 0.1 or below −0.1: `+<n>% win rate vs <hero> average` or the same without the plus, using `win lift × 10` to one decimal
- kitNorm above 0.7: `scales <hero>'s kit`
- counter above 0.1 or below −0.1: `wins more against this enemy team` or `wins less against this enemy team`
- synergy above 0.2 or below −0.2: `wins more alongside items you already hold` or `wins less alongside items you already hold`
- upgrade: `upgrades <item>, which you already hold`
- overflow: `you already hold <n> active items`
- enhanced, carry above 0.5 and a named upgrade: `enhanced version, and it stays enhanced when upgraded into <item>`
- enhanced otherwise: `enhanced version`
- duplicate: `you already hold this item`

## One set on screen

The live app advises the set that is on screen, not a plan across future choices. The joint picker below still runs so a set of three is ranked as a combination: add the three scores, add pairwise synergy between them divided by `max(1, count − 1)`, and subtract 1 for each repeated item. The combination with the highest total is the pick list. With one set of three cards, the card to take is the one with the highest score, unless a re-roll is called.

## Re-roll

If this round has no re-roll left in the mode config, do not call one. The shipped config gives one per round. The reader also tracks whether this choice has already spent it.

For each choice that has cards:

1. Expected best of a fresh draw of those same slots (rare flags and enhanced flags kept).
2. Current best on the pool's scale: the best card's score minus its synergy, counter, and upgrade parts. Those three depend on the current draft and are not in the pool model.
3. Gain is expected best minus that current best.

The value of still holding the re-roll when a later choice appears:

- A choice that is on screen is worth the maximum of its gain and the hold value of the choice after it.
- A choice that is not on screen yet is worth the expected value of `max(its draw's gain, the later hold)`, where its best card is drawn from the distribution below and the enhanced and rare flags are not yet known.

Call a re-roll on the on-screen choice with the largest gain, if that gain is above 0 and strictly above the hold value of saving it. A set that still has an unread card never calls a re-roll.

### Distribution of a fresh card

For a slot, probability of the rare tier is 1 if the slot is rare, 0 if it is known normal, or 4/27 if unknown. Probability of enhanced is 1, 0, or 3/27 the same way.

Items of that tier are weighted uniformly, except tier 1: fraction `60/100` of the weight follows popularity and the rest is even. On a rare tier that differs from the normal tier, multiply top-grade (S) items by 4 and renormalise.

Each item contributes its plain score `base + active penalty` and, when enhancement is possible, `plain + enhanced extra`. Enhanced extra is the enhanced part plus the extra kit from the 1.25 multiplier.

The set's score is the maximum of three independent slots. Build that distribution from the cumulative: the probability the max equals v is the probability all slots are at most v, minus the same for the next-lower v. The expected best is the mean of that distribution.

If the measured 4/27 or 3/27 is ever cleared, the fallback per-card rate is the config's outcome table for that round: sum of `count × weight` over sum of weights, divided by the number of cards in the round (choices times 3), capped at 1.

## Unknown ceiling

When a card could not be read, a sure card is only worth taking if it beats every draftable item of this choice's normal tier and rare tier, scored both plain and enhanced, against the current owned list and enemies. That maximum is the ceiling.

## Tooltip rows

Rows, in this order, omitting any part that rounds to 0.00:

Win rate, Pick rate, Hero fit, Vs enemy team, With your items, Item tier, Active items, Upgrade, Enhanced, Duplicate.

Show values in hundredths, with a leading plus or a minus sign (the minus is the Unicode minus, not a hyphen). The rows must sum exactly to the score rounded to hundredths. Put the rounding remainder on the largest row, except do not adjust a pinned Enhanced row. If the item has no Street Brawl row, the only line is `No Street Brawl data`.

If the enhanced note is non-empty, it follows the Enhanced row.

## What My Picks does not do

A Main or Secondary highlight does not change any part, the sort, the take, or the re-roll. It is drawn on top. See [06-my-picks.md](06-my-picks.md).
