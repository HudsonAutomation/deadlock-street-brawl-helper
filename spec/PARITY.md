# Parity matrix

Clean-room build `1.0.0-rc.1` on branch `dia-rewrite`. Automated tests: 35 passing (`npx vitest run`). Windows capture, a real Deadlock client, and Windows.Media.Ocr were not available on this machine.

| Id | Result | Evidence |
| --- | --- | --- |
| A1 | not-verifiable-on-VM | Frameless 32 px strip, title text, minimise and close are in `electron/main.ts` and `src/renderer/App.tsx`. No Windows desktop session ran. |
| A2 | pass | `restoreBounds` in `src/core/acceptance.test.ts`. |
| A3 | not-verifiable-on-VM | Ctrl+Shift+O and the tray entry call the same hide flag. Not pressed on a desktop. |
| A4 | not-verifiable-on-VM | F8 is registered only while a game handle exists. Another program owning F8 is not simulated here. |
| A5 | pass | `devToolsEnabled` treats `1.0.0-rc.1` as a release candidate and `0.6.0` as final. A `--mode final` bundle has zero hits for `debug-toggle`, `test-video`, `Play a video`, `brawlE2E`, and `force-reroll`. |
| A6 | not-verifiable-on-VM | Overlay sets ignore-mouse-events and does not enable forwarding. No click-through probe ran. |
| A7 | not-verifiable-on-VM | `disable-features=CalculateNativeWinOcclusion,AllowWgcWindowCapturer` is set before ready. No capture frame was grabbed. |
| B1 | not-verifiable-on-VM | Needs the Windows find, capture, OCR, advise, and draw path on `choice1.png`. |
| B2 | not-verifiable-on-VM | Same path, `choice2.png`. |
| B3 | not-verifiable-on-VM | Re-roll geometry is specified. The live plate was not drawn on `draft-r2c3-reroll.png`. |
| B4 | not-verifiable-on-VM | `gameplay.png` and `inround-r3.png` were not run through capture. |
| B5 | not-verifiable-on-VM | Two-card frame was not captured. The gate refuses plates until three locks or the fallback. |
| B6 | not-verifiable-on-VM | Loading-name OCR did not run. Cream-pixel detection is unit tested. |
| B7 | not-verifiable-on-VM | Black-pixel detection and the sentence are tested. A 10 s foreground hold was not run. |
| B8 | not-verifiable-on-VM | The too-small sentence is in the problem table. No small window was created. |
| B9 | not-verifiable-on-VM | Card squares scale from 2560 by 1440. Plates were not drawn on the 2000 by 1125 frames. |
| B10 | not-verifiable-on-VM | No 2560 by 1440 capture was taken on this machine. |
| B11 | not-verifiable-on-VM | Loading crops need Windows OCR or the recorded-answer hash. |
| B12 | not-verifiable-on-VM | Guess badge and precedence are tested. The McGinnis portrait was not matched from pixels. |
| B13 | not-verifiable-on-VM | Recorded OCR answers are in the fixtures. The prepare-and-hash lookup is not wired, and Windows OCR is absent. |
| B14 | not-verifiable-on-VM | The 14 stretches were not replayed on a virtual clock. Labelled calls are D2 and D3. |
| B15 | not-verifiable-on-VM | Session folders were not replayed through the reader. |
| B16 | pass | `scripts/fixtures/brawl-cards/labels.json` is 27 cards, 4 rare, 3 enhanced. |
| C1 | pass | Gate holds 100 ms, and 600 ms after a new choice label. |
| C2 | pass | Unknown slot at 1.0 s, replaced when the read lands. |
| C3 | pass | Two empty circles clear advice. |
| C4 | fail | Hover-keeps-lock is implemented and not covered by a test. |
| C5 | pass | `irit` does not lock as Grit. An exact `Grit` does. |
| C6 | fail | A repeated item clears both locks in the gate and is not asserted. |
| C7 | fail | A grid hit marks the set spent and is not asserted. |
| C8 | pass | Round 1 choice 1 clears owned ids. |
| C9 | fail | Resync text is implemented and not asserted against a round jump. |
| C10 | pass | Picture shows after 6 frames or 3 frames over 1.5 s, lasts 15 s, and a draft clears it. |
| C11 | pass | A probe hit inside the 30 s quiet window does not restart capture. A miss clears it. Three non-drafts hold capture off. |
| C12 | not-verifiable-on-VM | Denial sets the Windows-blocked sentence and does not substitute a source. Not executed. |
| C13 | not-verifiable-on-VM | Reader-down status text is specified. The helper cannot be killed here. |
| C14 | pass | Pinned beats loading, loading beats portrait, portrait is marked guessed. |
| D1 | pass | `npm run brawl -- --hero 1 --round 2 --choice 1 --set "Improved Spirit, Enchanter's Emblem, Swift Striker"` runs the same function as the overlay. |
| D2 | fail | Re-roll is correctly not called. With an empty bag, Rapid Recharge scores about 0.009 above Burst Fire (2.999 vs 2.990). The label's card is Burst Fire. The recording does not publish the owned list. Owning Rapid Rounds, the component Burst Fire builds from, makes Burst Fire the take. |
| D3 | pass | Infernus, round 5 choice 2, Lightning Scroll, Ricochet, Runed Gauntlets: re-roll, gain about 0.83, hold about 0.16. |
| D4 | pass | Tooltip cents sum to the rounded score. The Enhanced row equals the enhanced bonus. |
| D5 | pass | Enhanced Ricochet on Infernus uses factor 0.2 and the note `weapon stats, little use for Infernus`. |
| D6 | pass | A fifth active is 0.5 lower than the same card with three actives owned. |
| D7 | pass | An owned copy is 1 point lower and says `you already hold this item`. |
| D8 | pass | A set with one unread card does not re-roll. The unknown ceiling is computed. |
| D9 | pass | Advice has no My Picks input. The same cards score the same. |
| E1 | pass | jsdom renders the three tabs. The last tab is stored under `brawl.tab`. |
| E2 | pass | `pinHero` / `clearPin` and the change / auto-detect controls. |
| E3 | pass | Buy, the 2-point refusal, the overspend sentence, and a complete 32-point order. |
| E4 | pass | Fresh settings show Show me and Got it. Got it hides the panel. |
| E5 | pass | Status, problem, and My Picks sentences match the wording rule. |
| F1 | pass | Defaults are on, fallback hero 86. Snapshot build 998571 version 2 is Violet's first list. 897240 version 19 is also stored. |
| F2 | pass | Infernus active build is 715046 version 10. Match-copy ids are 526641, 513995, and 333337. |
| F3 | pass | Baba, Billy, and Rem are absent from the bundled build table, so both tiers stay empty. |
| F4 | pass | Mo & Krill 805628, Viscous 793000, Dynamo 495688, Kelvin 632883 are the active extra lists. |
| F5 | pass | Storage keeps per-hero edits. Overlay model draws a main ring and an ALT ring. A restarted Windows session was not opened. |
| F6 | pass | Fallback hero defaults to 86. A read hero replaces it. The tab sentence is `This draft highlights <name>.` |
| F7 | not-verifiable-on-VM | Import calls the public builds URL only. The integer rejection string is in the page. No live import was clicked from a packaged app. |
| F8 | pass | Scarlet categories split on the name map. Another build sends only optional categories to Secondary. |
| F9 | pass | Reset drops the hero edit and the bundled list is what remains. |
| F10 | pass | The highlight checkbox defaults on. Scores do not read it. |
| G1 | pass | 44 heroes graded. Draftable items with matches receive S, A, B, or C from the 70/30 cuts. |
| G2 | pass | Age uses `fetchedAt`. Older than 14 days gets the stale style. Footer uses hero-games, the file window, and the end date. |
| G3 | pass | Subtitle keeps `data from the 30 days to` plus the fetch date. |
| H1 | pass | `userData` is forced to `%APPDATA%\deadlock-street-brawl-helper` before ready. Nothing deletes that folder. A second process does not write while the lock pid is alive. |
| H2 | pass | `dist/electron/preload.cjs` starts with `"use strict"` and `require("electron")`. Packaged path is the same file. |
| H3 | pass | Final-mode bundle grep above. The shipped installer is `1.0.0-rc.1`, so debug tooling stays in, which is what a release candidate requires. |
| H4 | pass | NSIS allows a directory choice. README tells the player about SmartScreen, More info, then Run anyway. Workflow: `.github/workflows/release.yml` on `v*` tags. No release was published. |
| H5 | not-verifiable-on-VM | Below-normal priority is scheduled at 3 s on Windows and skipped under the harness. |
| I1 | not-verifiable-on-VM | Needs Borderless Windowed Deadlock. |
| I2 | not-verifiable-on-VM | Needs exclusive fullscreen. |
| I3 | not-verifiable-on-VM | Needs a real desktop scaling check. |
| I4 | not-verifiable-on-VM | Needs one full Street Brawl match. |
| I5 | not-verifiable-on-VM | Needs Import from the installed app. |

## Counts

| Result | Count |
| --- | ---: |
| pass | 48 |
| fail | 5 |
| not-verifiable-on-VM | 32 |
| Total acceptance rows | 85 |

The five fails are C4, C6, C7, C9 (rules are in the gate, without a locking test) and D2 (labelled card, empty bag, 0.009 gap).

## Upgrades shipped

Kept behind defaults when they would change a parity result.

| Id | Shipped | Default |
| --- | --- | --- |
| U1 | Calibration object and a strict 16:9 refusal | Off. Built-in boxes stay in use. |
| U2 | Not a new measurement. Manifest records that 4/27, 3/27, and 1.25 are still the parity constants. | Unchanged. |
| U3 | Not shipped. Covered and dim lines still follow the parity fallback. | |
| U4 | `strictPortrait` refuses a guess that is also in the enemy four | Off, so a portrait guess is still marked guessed. |
| U5 | `assumePicks` can mark a take below 2000 px | Off. |
| U6 | Name reads are allowed to run three at a time (`ocrConcurrency`) | 3. Advice values do not change. Set to 1 for a single queue. |
| U7 | A probe hit with card ink skips the 30 s quiet period | On, as an extra start signal. A digit flicker with no cards still waits. |
| U8 | Real window dates on the advisor and tier list | Off, so the subtitle still says 30 days. |
| U9 | Not shipped. No new per-hero weapon factor was measured. | |
| U10 | Not shipped. | |
| U11 | Build id and version import remains. Save my lists and Load my lists are on the tab. URL paste is not parsed yet. | |
| U12 | Settings section: highlights, ability picture, lobby dot, hotkey reset | Parity keys. |
| U13 | `hideOwnedRings` | On. Scores unchanged. |
| U14 | `Save this draft` writes a json file under the settings folder when dev tools are on | Manual. |
| U15 | `Try the name reader again` restarts the helper after it has failed | Manual. |
| U16 | Not shipped. The black hint is still the 10 s rule. | |
| U17 | The overlay is repositioned when the polled game rectangle changes | On. |
| U18 | The settings folder name is fixed, including if the product title differs. A second live process does not write. | On. |

## Data

Fetched from `https://api.deadlock-api.com` for 2026-10-30 through 2026-11-03. 44 heroes, 250 items, 2,288,600 hero-games. Required heroes 78, 84, 85, 86, 87, and 88 are present. Nothing was copied from another program's tables.

No data set was skipped for lack of a public source. The round-5 digit template is still a hand-drawn grid, as the spec says no photograph exists. Rare and enhanced rates were not re-counted beyond the 27-card fixture.
