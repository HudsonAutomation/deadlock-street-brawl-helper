# 07. Street Brawl Tier List

A second tab. It grades heroes and draftable items S, A, B, or C from the Street Brawl snapshot. It does not affect the draft advice, except that the same grade cut is reused inside scoring to decide which items are "S" for a rare-slot re-roll ([04-scoring.md](04-scoring.md)).

## Header

The subtitle is the fixed sentence `Heroes and items graded by win rate and usage, data from the 30 days to <YYYY-MM-DD>`, plus `(<n> day old)` or `(<n> days old)`. The date and the age use the snapshot's fetch time. Older than 14 days, the age is styled as stale. The words "30 days" in that subtitle are fixed. They do not change when the file's window is shorter. The shipped brawl snapshot is the patch dated 2026-10-30 and its tier-list file records a window of a few days. The footer, not this subtitle, is where the file's real window is shown. Saying the real window in the subtitle is an upgrade, not parity.

## Controls

Two tabs: `Heroes` and `Items`. They stay where the player left them while the main tab is hidden.

Heroes help: `Every hero graded against the rest of the roster. Win rate counts for 70% of the grade, how often the hero is picked for 30%.`

Items: a filter `All tiers` and `Tier I` through `Tier V` in roman numerals for tiers that exist. Help: `Each item is graded against the other items of its own draft tier, because the tier decides which round it can be offered in. Win rate counts for 70% of the grade, how often the item is drafted for 30%.`

## Board

Four rows, S then A then B then C. Each row shows the letter, the count, and the entries. An empty row says `Nothing lands here.` or, when an item tier filter is on, `No tier <roman> item lands here.`

A hero cell: portrait, name, win rate, usage. An item cell: item art, win rate, usage. Both percentages to one decimal. Usage is the share of hero-games.

Footer: `Percentages under each entry are its win rate and its usage, the share of hero-games it appeared in. Based on <n> hero-games of Street Brawl over the <days> days to <date>, all ranks.`

Loading: `Loading Street Brawl tier list…`

## The grade

One population at a time. Heroes are one population. Items are one population per draft tier. Disabled items, tier below 1, and rows with no matches are left out.

1. Shrunk win rate: `(wins + 500 × population win rate) / (matches + 500)`. The prior of 500 matters only for a thin sample. Current rows have thousands of games.
2. Usage: `log(max(1, matches) / hero-games)`.
3. Standardise each of those two columns (subtract the mean, divide by the population standard deviation). A column with no spread, or fewer than 2 rows, is all zeros.
4. Mix: `0.7 × win z + 0.3 × usage z`. Standardise that mix again.
5. Cut the combined z-score: S at or above 1.15, A at or above 0.35, B at or above −0.6, otherwise C. That is about 13 percent S, 25 percent A, and 35 percent B on a normal population. It is not a quota. Do not force those percents.
6. Sort by the combined score, highest first.

Hero-games is the denominator published with the snapshot, the same window as the hero rows and the item rows. If those windows differ, usage is wrong. Rebuild them together.
