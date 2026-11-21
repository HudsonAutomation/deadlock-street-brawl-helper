# 10. Data

The app runs offline after the snapshot is built. Players do not need an API key. Do not copy the existing repository's generated tables as the source of truth. Fetch the public sources below and apply the rules in [04-scoring.md](04-scoring.md) and [06-my-picks.md](06-my-picks.md).

Base URL: `https://api.deadlock-api.com`. Item and hero art used to live on a host named `assets.deadlock-api.com`. That host is gone. The same assets are under `/v1/assets`.

The public build browser is the site in front of `https://api.deadlock-api.com/v1/builds`. A build id and version from that site is what Import accepts.

## Sets the app needs

### 1. Heroes

44 playable heroes. Fields the app uses: id, name, class name, images (small and card portraits), the four ability class names in bar order, description, standard level-up upgrades (bullet-damage growth and spirit-power growth), and whether the hero is player-selectable and not disabled.

Source: `GET /v1/assets/heroes`. Keep a hero when `player_selectable` is true and `disabled` is false. Do not drop a hero only because `in_development` is true. The API still flags Baba (id 88) that way while he is playable. Store both the small portrait and the card portrait. The card portrait is what the draft bar shows, and portrait matching uses it.

Required ids that a snapshot must contain or the fetch must stop before writing: 78 Deadman Danny, 84 Rat King, 85 Solomon, 86 Violet, 87 Nurse Harrow, 88 Baba. Also expect the rest of the roster, including Billy 72 and Rem 79.

Hero ids are not a dense sequence. Do not invent ids.

### 2. Abilities

Names, icons, descriptions, and upgrade properties for those heroes, including which properties scale with spirit power or spirit duration.

Source: `GET /v1/assets/items/by-type/ability`, then keep abilities whose hero id is in the hero snapshot. Download icons only for the four abilities on each hero's bar.

### 3. Items

The upgrade catalog. Fields: id, class name, display name, tier, disabled, active-item flag, component items (what it upgrades from), properties (stat name and value), shop image, description.

Source: `GET /v1/assets/items/by-type/upgrade` for the catalog the app stores. Import also loads `GET /v1/assets/items` when it needs a name for an id the catalog does not already know.

Draftable filter: not disabled, tier at least 1, name does not start with `upgrade_` or `Disabled`. The November 2026 snapshot has 250 items in the file and about 172 that appear in Street Brawl stats. Counts will move. The filter is the requirement.

Images: download the webp the API points at and store them in the app so advice and the tier list need no network. Item icons, hero portraits, ability icons.

### 4. Street Brawl mode config

Per round: re-rolls (1), ability points (6, 6, 5, 5, 10, also published as the round's AP field), and for each of the three choices the normal tier and the rare tier. Tier-1 draft bucket 40 normal / 60 good. The outcome-weight tables are stored but are not the per-card rare or enhanced rate while [04-scoring.md](04-scoring.md) fixes those at 4/27 and 3/27.

Source: `GET /v1/assets/generic-data`, and take the `street_brawl` object. It publishes the per-round draft tiers, the re-roll counts, the ability-point field, and the tier buckets. The same ability-point schedule is described on the Deadlock wiki page for Street Brawl. If a fresh API pull and the wiki disagree, record both dates and follow the API pull from the same week as the match sample.

### 5. Per-hero Street Brawl analytics

One file per hero id. Game mode `street_brawl`. There is no rank filter. The API returns 400 if a badge filter is sent.

For each hero:

- Match count.
- Item rows: item id, wins, losses, matches. (Players, buy time, and sells may be stored. Scoring uses wins and matches.)
- Pair rows, combination size 2: two item ids, wins, losses, matches. Keep the 600 most-played pairs. Pairs under 20 matches are ignored.
- Versus each other hero: the same item rows filtered by enemy hero id. Rows under 50 matches are ignored.
- Ability-order rows: the sequence of ability ids, wins, matches. Sequences under 100 matches do not decide a step.

Source:

- `GET /v1/analytics/item-stats` with game mode, hero id, and the unix window.
- `GET /v1/analytics/item-permutation-stats` with combination size 2 and the same filters.
- The same item-stats route with `enemy_hero_ids`.
- `GET /v1/analytics/ability-order-stats` with the same hero, mode, and window, and `min_matches=5`. Keep the 200 sequences with the most matches. The ability order then applies the 100-match step rule to that list. Keeping fewer than those 200 can change the standard order.
- `GET /v1/analytics/hero-stats` for the roster totals.

Window: both ends pinned, so a later rebuild cannot mix hero-games the item files never saw. The shipping snapshot starts at the 2026-10-30 patch (`min_unix_timestamp` 1793318400) and was fetched 2026-11-03. A rewrite that wants parity with published scores uses that same window. A rewrite that wants current advice uses a new window and will not match old scores. Say which one the build is.

A hero under 2000 matches in the window fails the fetch before anything is written. Rate limit is about 200 requests a minute. A full pull is on the order of 1400 requests. Support continuing a rate-limited run in the same window.

### 6. Tier-list totals

Hero rows (id, wins, losses, matches) and item rows summed across heroes, plus `hero_games` and the same window. One hero-stats call plus a sum of the per-hero files, not a second long crawl. Item usage divides by `hero_games`.

### 7. Builds for My Picks

Not a bulk download at runtime. The bundled ids and versions are listed in [06-my-picks.md](06-my-picks.md). Fetch each from `/v1/builds` when building the snapshot, and again when the player presses Import.

The Deadlock build browser is the public UI for those ids. Any public build id and version must import. Account ids in the spec (oses 1840902834, and the two extra authors) are public build authors, not the player's account. Do not call a private or authenticated builds route.

### 8. Icon index for portraits and the inventory grid

Built from the item and hero images: a small normalised patch per icon, circle mask, top-right corner masked out because a tier numeral sits there. This is derived data. Rebuild it from the images. Do not treat a checked-in index as an independent source.

Card identity does not use this index. Inventory and hero portraits do.

## Original policy that is not on the API

These are specified in this folder so an implementer can rebuild them without reading the old program. They do not exist as public tables.

| Policy | Where it is specified | Why it is not a download |
| --- | --- | --- |
| Score weights, shrink constants, active cap, legendary weight 4 | 04 | Editorial, tuned for Street Brawl |
| Rare 4/27 and enhanced 3/27 | 04 | Counted from sample cards, contradicts a naive reading of the config |
| Enhanced stat multiplier 1.25 | 04 | Not published. Assumed |
| Souls-per-unit table | 04 | Editorial prices |
| Infernus kit multipliers and 0.2 weapon use | 04 | Hand-tuned for one hero |
| Ricochet's enhancement boosts weapon power only | 04 | From a player's description, not the API |
| Scarlet category-to-tier map | 06 | Editorial. Other builds use the optional flag |
| Which build id is the default for each hero | 06 | A chosen public build, not "the" build |
| Layout anchors and digit templates | 03 | Measured from the game UI. Round 5's digit template has no photo |
| Grade cuts 1.15 / 0.35 / −0.6 and the 70/30 mix | 07 | Editorial |
| Tier-1 good bucket applied via popularity | 04 | The API does not list which items are in the good bucket |

Nothing else the app advises from is private. If a number is not in this spec and not on the API, do not invent it. Ask for a measurement.

## Manifest

Record fetch time, the window's two unix timestamps, hero count, and matches per hero. The tier list and the advisor read this to show age. A snapshot that dropped a required hero must not be published.

## What "do not copy the fork" means

- Do not vendor the existing JSON, webp, or icon index into the new program as the data pipeline.
- Do use the public API, the wiki's mode rules, and the build browser.
- Sample screenshots in the existing repository are test inputs. Their paths are in [11-acceptance.md](11-acceptance.md). Using a screenshot as a test image is allowed. Tracing the old recogniser and pasting it is not.
- The bundled build *membership* must match a fresh fetch of those ids. If the API has changed a version, pin the version numbers in [06-my-picks.md](06-my-picks.md) and record the difference. Do not silently retarget to "latest".
