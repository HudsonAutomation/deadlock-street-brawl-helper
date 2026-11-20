# Deadlock Street Brawl Helper 🃏

<p align="center">
  <img alt="One real Street Brawl draft at normal speed: it shows the Reading sign, then score plates on the cards with the advised one marked in teal" src="docs/brawl-overlay.gif">
</p>

A draft advisor for [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/)'s Street Brawl mode. It reads the draft screen while you play, ranks the three cards you're offered, and says whether the set is worth a re-roll. The advice is drawn over the draft screen. Scores are built from Street Brawl matches since the 2026-10-30 patch from [deadlock-api.com](https://deadlock-api.com), for all 44 heroes.

## Quickstart 🚀

Requires Windows. Get the app from the [latest release](https://github.com/Gidntsquia/deadlock-street-brawl-helper/releases/latest): a portable `.exe` and an installer.

1. In Deadlock's Video settings, set Display Mode to Borderless Windowed.
2. Run the app. It finds the Deadlock window on its own.
3. Play a Street Brawl draft. The advice shows up over the draft screen.

IMPORTANT: the files aren't code-signed, so Windows SmartScreen will warn you. Click More info, then Run anyway.

Press F8 to read the draft right away if the app hasn't picked it up. With no game running, pick First-run check in the tray menu and press Show me to try the overlay on a real draft screenshot. The app finds a window titled exactly Deadlock on its own. There is no separate debug screen-watcher. The debug panel (Ctrl+Shift+D) is in development and release-candidate builds only.

To work on it (needs [Node.js](https://nodejs.org) 20 or newer):

```
npm install
npm run dev                                # Browser version, for development only
npm run brawl -- --hero 1 --round 2 --set "Improved Spirit,Enchanter's Emblem,Swift Striker"   # Advice without the screen reader
npm run fetch-data -- --since 2026-10-30   # Refreshes the Street Brawl snapshot (~1400 requests, ~9 min)
npm run win:dev                            # From WSL: runs the Windows app from a synced copy
npm run check                              # Lint, typecheck, formatting and tests
```

## Features 🔬

- Reads the three cards, the round, the enemy team and the items you've already picked from the screen. Nothing is sent to the game.
- Ranks the cards for your hero using pick rate, win rate and how well each item scales that hero's abilities, and shifts the ranking toward items that do well against the enemy heroes.
- Says when a re-roll is the better call and moves the box to the Use Re-Roll button.
- Reads your hero from the loading screen and keeps it for the whole match. If the app starts mid-match it guesses from the scoreboard, marks the guess, and lets you pick the hero by hand.
- Shows a picture of the ability points panel for about 15 seconds after the draft closes, with this round's points highlighted.
- Lets you set your own ability upgrade order per hero by clicking a copy of that panel, with the abilities labelled 1 to 4.
- Grades every hero and draftable item S, A, B or C on a second tab.
- Tells you to switch to Borderless Windowed if the capture has been black for 10 seconds.
- Has a test mode that opens a dummy Deadlock window with a real draft screenshot.
- Highlights your own My Picks on the draft. Main items get a gold ring and a MY PICK tag. Secondary items get a dimmer ring and an ALT tag. The teal circle, the scores and the re-roll call stay as they are.

## My Picks

Open the My Picks tab to turn the highlights on or off, add and remove items, and move them between Main and Secondary. Each hero has its own list. While the app has read your hero, it uses that hero's list. When it has not, it uses the hero selected on the tab, which starts as Violet.

Violet starts on Scarlet 9X v2 (build 998571, updated 2026-11-17 18:42 UTC). oses's Violet build (897240 v19) is saved beside it, and the other oses heroes start on one oses build each. Mo & Krill, Viscous, Dynamo and Kelvin had no oses row, so their bundled lists are the 2bStron9er and Lockbuilds builds in `src/brawl/defaultBuilds.ts`. The hero selector on the tab starts at Violet. You can import any public build by its id and version. That download runs only when you press Import, from api.deadlock-api.com, and the lists still work with no network. Optional categories land in Secondary and the rest in Main, except the bundled Scarlet list, which uses its own category map. Nothing is sent to the game.

The recogniser's layout reference is 2560x1440, and other 16:9 sizes scale from it. A check at 2560x1440 with Windows display scaling at 100% did not need a retune. 1920x1080 is the size of the test-mode dummy window, not a second layout.

Regenerate the bundled lists with `node scripts/import-default-builds.mjs`. The build table, flags, and what is still untested are in [docs/SESSION-2026-11-20.md](docs/SESSION-2026-11-20.md).

## Documentation 📚

More details in the
[wiki](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki):

- [Street Brawl Advisor](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Street-Brawl-Advisor) — the mode's rules, card scoring, re-roll maths
- [Screen Reader](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Screen-Reader) — how cards, tiers, labels, your picks and your hero are recognised
- [Name Reader](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Name-Reader) — how card names are read with Windows OCR
- [Overlay](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Overlay) — screen capture and the always-on-top window
- [Windows App](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Windows-App) — the packaged app, first run, test mode, developing from WSL
- [Tier List](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Tier-List) — how the S/A/B/C grades are worked out
- [Data Pipeline](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Data-Pipeline) — what fetch-data downloads and the data window
- [Development](https://github.com/Gidntsquia/deadlock-street-brawl-helper/wiki/Development) — code layout, scripts, checks

## License 📄

[MIT](LICENSE). The original author is Jaxon Lee. This fork keeps that license and the copyright notice.
Match data and item art come from [deadlock-api.com](https://deadlock-api.com);
Deadlock is Valve's. The original project is
[Gidntsquia/deadlock-street-brawl-helper](https://github.com/Gidntsquia/deadlock-street-brawl-helper).
