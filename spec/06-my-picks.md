# 06. My Picks

My Picks highlights items the player cares about. It does not change scores, the teal take mark, or the re-roll call.

## What the player sees on a card

| Tier | On the overlay | In the advice list |
| --- | --- | --- |
| Main | A gold ring outside the item circle, glowing, and a gold tag `MY PICK` under the card. Gold is `#e6b325`. The ring is a 3 px stroke just outside the circle plus an 8 px stroke at 35 percent opacity further out. The tag is fully opaque, dark text `#1b1408`. | A `MY PICK` tag on the row |
| Secondary | A dimmer ring, colour `#8d7b58`, 2 px, 55 percent opacity, slightly outside the circle, and a tag `ALT` at 70 percent opacity. | An `ALT` tag |

A card can wear a My Picks ring and the teal best-pick circle at the same time. Unknown `?` cards are not highlighted. Highlights follow the item, not the slot.

## Which list is used

Each hero has its own lists. During a draft the app uses the hero it read. When it has not read a hero, it uses the hero selected on this tab. That selector starts at Violet (id 86). If the draft's hero is not the hero being edited, the tab says `This draft highlights <name>.`

The feature is on by default. The checkbox is `Highlight My Picks`. Off means no rings and no tags, anywhere.

## The tab

Intro: `Choose a hero to edit that list. During a draft the app uses the hero it read. When it has not read a hero, it uses the hero chosen here.`

- Hero dropdown, label `Hero`.
- Saved-list dropdown when the hero has at least one list, label `Saved list`. Choosing one makes it active. The label of a list is its build name when it has a source, otherwise a short local name.
- Source line when the list was imported or bundled: `<author>, build <id>, version <n>, updated <date>` when a date exists.
- If the description says the build was created from a match id, or the build id is one of the three match copies below: `match copy, not oses's own build`.
- Optional note and credit lines, and a disclosure `Build description`.

Two groups:

- `Main`. Help: `Strong gold ring and a MY PICK tag.` Then the category names that landed in Main, if any.
- `Secondary`. Help: `Softer ring and an ALT tag.` Then its category names.

Empty group: `No items.` Each row shows the item name, its category in small text, an optional detail, and `Not in Street Brawl` when the name could not be matched to a draftable item. Those rows do not highlight. Buttons: `To secondary` or `To main`, and `Remove`.

Add: a text field `Add an item`, placeholder `Item name`, and a tier select `Main` / `Secondary`. After two normalised letters, show up to 8 draftable items whose names contain the query and that are not already on the list. Clicking one adds it to the selected tier. Adding an item that is already on the list moves it to that tier instead of duplicating it. Added rows use the category `custom`.

Import: heading `Import a build`. Help: `Loads a public build from deadlock-api.com. Optional categories go to Secondary. The rest go to Main. Nothing is sent to the game.` Fields `Build id` and `Version`, button `Import` (label `Importing` while the request runs). Both must be positive integers. Otherwise: `Enter a build id and a version.`

On success the list is saved on the build's hero, made active, and the hero selector moves to that hero. Message: `Imported <list> for <hero>.` If some names are not draftable items: `Imported <list> for <hero>. Not in Street Brawl: <names>.` If the hero id is not in this app: `This build is for hero <id>, which this app does not have.` A failed download uses the error text, or `The build could not be imported.`

`Reset to default` drops the player's edits for that hero and returns to the bundled lists. `Remove this list` deletes the active list and selects another if one remains.

Edits are stored on this machine. A hero with no edit uses the bundled lists. The lists work with no network. The download runs only when the player presses Import.

## How a build becomes two tiers

Fetch `https://api.deadlock-api.com/v1/builds?build_id=<id>&version=<version>` and item names from `https://api.deadlock-api.com/v1/assets/items`. Send `Accept: application/json`. A missing build is a not-found error. A network failure is a download error. Do not send the player's account. Match each mod or item in the build to a draftable catalog item by id, then by normalised name.

Category title: if the name is a `#Citadel_HeroBuilds_...` key, take the suffix and break camel case into words. A blank name stays blank.

Tier rule for every build except the bundled Scarlet list: a category marked optional is Secondary. Every other category, including a missing flag, is Main.

Scarlet 9X uses this map instead, on the category name in lower case:

| Category | Tier |
| --- | --- |
| early spikes | Main |
| midgame | Main |
| late options | Main |
| vs guns | Secondary |
| early options | Secondary |
| hard lane | Secondary |
| counters | Secondary |
| components | Secondary |
| wip | Secondary |

Author label is `oses` when the account id is 1840902834, `unknown` when there is no account, otherwise `account <id>`.

A description that matches "created from match id" is a match copy. These bundled ids are match copies even if the wording differs: 526641 (Abrams), 513995 (Paradox), 333337 (Victor).

If the description contains "always use arcane surge on ult", show that phrase in lower case as the note. If it credits a twitch.tv name and an origin build id, the credit is `based on build <id> by <twitch>`. An origin id alone is `based on build <id>`. The updated date is the UTC calendar day of the API's last-updated timestamp.

## Bundled defaults

Regenerate them from the public API. Do not treat a checked-in JSON dump as the source. The active list is the first one named.

Violet's active list is Scarlet 9X, build 998571, version 2, hero 86. The API timestamp 1794940946 is 2026-11-17 18:42:26 UTC. The description credits twitch.tv/oses and origin build 897240. Beside it, not active, is oses Violet build 897240 version 19.

One oses build per hero below, account 1840902834. Optional categories are Secondary.

| Hero | Id | Build | Version | Notes |
| --- | ---: | ---: | ---: | --- |
| Abrams | 6 | 526641 | 1 | match copy |
| Apollo | 77 | 353960 | 49 | |
| Bebop | 15 | 386845 | 3 | |
| Calico | 16 | 683397 | 1 | |
| Celeste | 81 | 814860 | 76 | |
| Deadman Danny | 78 | 887853 | 1 | |
| Drifter | 64 | 716382 | 3 | |
| Graves | 76 | 546331 | 54 | |
| Grey Talon | 17 | 723432 | 5 | |
| Haze | 13 | 514170 | 115 | |
| Holliday | 14 | 360573 | 8 | |
| Infernus | 1 | 715046 | 10 | |
| Ivy | 20 | 816348 | 21 | |
| Lady Geist | 4 | 749269 | 27 | |
| Lash | 31 | 335499 | 110 | |
| McGinnis | 8 | 981244 | 22 | |
| Mina | 63 | 832489 | 271 | |
| Mirage | 52 | 492664 | 99 | |
| Nurse Harrow | 87 | 933260 | 2 | |
| Paige | 67 | 406689 | 1 | |
| Paradox | 10 | 513995 | 1 | match copy |
| Pocket | 50 | 718792 | 24 | |
| Rat King | 84 | 841603 | 36 | |
| Seven | 2 | 378177 | 68 | |
| Shiv | 19 | 879365 | 14 | |
| Silver | 80 | 589785 | 31 | |
| Sinclair | 60 | 668231 | 7 | |
| Solomon | 85 | 872540 | 9 | |
| The Doorman | 69 | 323949 | 15 | |
| Venator | 65 | 905815 | 138 | |
| Victor | 66 | 333337 | 1 | match copy |
| Vindicta | 3 | 881792 | 1 | |
| Violet | 86 | 897240 | 19 | second list, not active |
| Vyper | 58 | 763021 | 1 | |
| Warden | 25 | 357243 | 132 | |
| Wraith | 7 | 341736 | 129 | |
| Yamato | 27 | 250970 | 31 | ability id 869090587 has no item name, so that slot does not highlight |

Extra lists are stored beside the oses list and do not replace Scarlet or an oses list. These four heroes have no oses row, so the extra list is the active one:

| Hero | Id | Build | Version | Author account | Updated (UTC) |
| --- | ---: | ---: | ---: | ---: | --- |
| Mo & Krill | 18 | 805628 | 7 | 150070196 | 2026-11-02 |
| Viscous | 35 | 793000 | 9 | 150070196 | 2026-09-17 |
| Dynamo | 11 | 495688 | 1 | 150070196 | 2026-02-26 |
| Kelvin | 12 | 632883 | 341 | 489411562 | 2026-11-20 |

Kelvin's API title is the Lockbuilds list "Beam 'em Down". Dynamo's API name is the Hoot Deadlock Aura list. Mo & Krill and Viscous are the 2bStron9er lists from the same account as Dynamo.

Baba (88), Billy (72), and Rem (79) have no bundled list. Their tab starts empty until the player adds or imports.

Item counts move when the API or the catalog moves. Parity is "these build ids and versions, split by the rules above", not a frozen count from November 2026. A name the catalog does not know is kept on the list and marked `Not in Street Brawl`.
