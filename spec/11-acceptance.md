# 11. Acceptance tests

Black-box checks. Each one is given / when / then. A rewrite passes parity when every check in this file passes. Upgrades in [UPGRADES.md](UPGRADES.md) are not required for parity and must not be used to excuse a failure here.

Where a check needs a picture, the picture already exists in this repository. Use it as an input. Do not treat the old program's output as an oracle except where this file says "the advice matches the scoring rules" or names a specific expected item. Re-implement the scoring rules and compare.

## Sample frames

| Path | What it is |
| --- | --- |
| `public/demo/choice1.png` | A full draft choice, the main still used by test mode |
| `public/demo/choice2.png` | A second draft choice |
| `public/demo/draft-r2c3-reroll.png` | Round 2 choice 3 with a re-roll on screen |
| `public/demo/draft-r1c2.png`, `draft-r2c1.png` | Other labelled drafts |
| `public/demo/_choice1-two.png` | Only two cards landed. Harness frame |
| `public/demo/_loading.png` | "Joining the fight as..." name |
| `public/demo/_black.png` | Black probe region, for the fullscreen hint |
| `public/demo/gameplay.png`, `inround-r3.png` | Not a draft. No plates |
| `scripts/fixtures/loading/` | Loading-name crops from recordings, with expected hero text |
| `scripts/fixtures/hero-misread/` | A frame where an enemy portrait was the wrong player |
| `scripts/fixtures/brawl-cards/` | Card samples and the 27-card count behind 4/27 and 3/27 |
| `scripts/fixtures/brawl-screens/` | Wider draft screens |
| `scripts/fixtures/round-banner/` | Round digit crops |
| `scripts/fixtures/ocr-recorded/` | Recorded OCR answers, keyed by the prepared crop. A stand-in when Windows OCR is not available to the test |
| `scripts/fixtures/video-truth/s0` through `s13` | 14 stretches of real 1280 by 720 play, crops plus a label file: items, when the set was on screen, when it was readable, which slots a tooltip covered, and the expected take or re-roll where one was labelled |
| `scripts/fixtures/sessions/` | A handful of drafts that were wrong, fell back to `?`, or changed. Each has an expected result |
| `scripts/win/frames/labels.json` | Hand-measured boxes on the 2000 by 1125 frames that `choice1.png` and `choice2.png` come from |

`screenshots/` is a local reference folder and is not part of the tests. Do not depend on it.

The two OBS recordings that the video-truth stretches were cut from are not in the repository. The crops are enough for the checks below. A live timing run against the recordings is a manual check, not a parity gate for the first build.

## A. Shell and hotkeys

**A1. Title.** Given a normal launch, then the control window is frameless, the strip reads `Deadlock Street Brawl Helper`, and minimise and close work. Close quits.

**A2. Bounds.** Given the window moved to a known place and the app restarted, then it reopens there. Given saved bounds whose title strip is off every display, then it opens 460 by 640 centred on the primary display.

**A3. Overlay toggle.** Given a draft on the dummy, when the player presses Ctrl+Shift+O, then the overlay hides. Pressing it again shows the same plates. The tray entry does the same.

**A4. F8 scope.** Given no Deadlock window, then F8 is not taken by this app. Given the dummy or the game, then F8 starts a detect. Given another program already owns F8, then the problem sentence about F8 is shown and the tray entry still detects.

**A5. Debug shortcut.** Given a final 0.6.0-style build, when Ctrl+Shift+D is pressed, then no debug panel appears and the title strip has no `DEBUG`. Given a development build, then the panel toggles and the strip shows `DEBUG` while it is on.

**A6. Click-through.** Given plates over the dummy, when a click is aimed at a card, then the overlay does not focus and the click reaches the dummy. The process list shows no global mouse hook owned by this app.

**A7. No yellow border.** Given capture of the dummy, then no yellow rectangle is drawn around it by the capturer.

## B. Detection on stills

Run these through the real find / capture / recognise / advise / draw path in test mode, not through a unit test that stubs the reader, except where Windows OCR is replaced by the recorded answers.

**B1. choice1.** Given `public/demo/choice1.png` in the dummy, then within 2.5 s the overlay shows three plates, each with a tier letter and `Score: <n>`, exactly one teal plate and a 3 px teal circle, and the other plates charcoal. The item named on the teal plate is the highest score under the rules in [04-scoring.md](04-scoring.md) for the hero and the three names read. No plate sits on a card that was not offered.

**B2. choice2.** Same, for `choice2.png`.

**B3. Re-roll frame.** Given `draft-r2c3-reroll.png`, then either a teal `RE-ROLL` plate sits on the Use Re-Roll button and every card is grey and veiled, or a teal take mark sits on the card the scorer chooses. The outcome must match a fresh run of the re-roll rule for those three items. It must not mark a take and a re-roll at once.

**B4. Not a draft.** Given `gameplay.png` or `inround-r3.png`, then the overlay draws no plates and no `Reading` sign. The status is the ready sentence if the dummy counts as the game.

**B5. Two cards.** Given `_choice1-two.png`, then no plates are shown for the partial set. `Reading` may show. The third card is not invented.

**B6. Loading name.** Given `_loading.png`, then a hero name is read, the advisor shows that hero with the `auto` tag, and a following choice1 draft is scored for that hero. The log or the test hook records a loading hit and a warm-up before the card names.

**B7. Black hint.** Given `_black.png` held as the foreground target for the shortened test interval (10 s in production), then the sentence `Capture reads black. If Deadlock is in Fullscreen, switch to Borderless Windowed` appears. A non-black frame clears it.

**B8. Small window.** Given a game window below 1280 by 720, then the too-small sentence appears and no advice is shown.

**B9. Boxes.** Given the 2000 by 1125 choice frames and `scripts/win/frames/labels.json`, then each drawn card plate lies on the labelled card circle, scaled by `captured width / 2000`. A 1 or 2 px DPI difference is allowed. A plate on the wrong card is not.

**B10. 1440 reference.** Given a 2560 by 1440 frame of the same draft at 100 percent scaling, then the anchors need no extra offset. This was checked once and is the layout contract.

**B11. Loading fixtures.** Given each crop in `scripts/fixtures/loading/` and its expected file, then the hero match agrees.

**B12. Misread fixture.** Given `scripts/fixtures/hero-misread/`, then a portrait-only read may guess the wrong hero, and the UI marks it `guessed` with the status sentence. A loading read in the same match replaces it and clears the guess.

**B13. Recorded names.** Given the demo frames at three sizes, the loading frame, and the caption fixtures, then the names and the re-roll digit match the recorded OCR answers. With a live Windows reader, the same frames still match.

**B14. Video truth.** Given each labelled set in `scripts/fixtures/video-truth/s0` through `s13`, replayed on a virtual clock that charges the recorded OCR time, then:

- The advised items equal a labelled set that was on screen.
- A set readable for at least 1 s is advised within 1.0 s of becoming readable.
- Advice does not disappear while the set stays readable.
- No advice is shown when no set is on screen.
- Where a label names an expected take or re-roll, the scorer agrees.
- A slot marked covered may be `?`.

**B15. Session fixtures.** Given each folder in `scripts/fixtures/sessions/`, then the replay matches that folder's expected file.

**B16. Card count.** Given `scripts/fixtures/brawl-cards/`, then 4 of 27 cards are rare and 3 of 27 are enhanced, which is why the rates in [04-scoring.md](04-scoring.md) are 4/27 and 3/27.

## C. Timing and state

**C1. Settle.** Given three stable names and stable labels, then plates appear no earlier than 100 ms after they agree. Given the same cards under a new choice label, then plates wait 600 ms from the first frame that names all three.

**C2. Fallback.** Given one card that never reads, then at 1.0 s the readable cards have scores and the unread slot is a grey `?`. A read that arrives at 1.1 s replaces the `?` without waiting.

**C3. Empty circles.** Given two card circles with no content, then advice drops and the fallback does not fire.

**C4. Hover.** Given a tooltip covering a neighbour's name after the set is advised, then the lock and the plates stay. Given the same change within 600 ms of a re-roll, then the slot is re-read.

**C5. Short name.** Given a five-or-fewer-letter read that is one edit from a short item (the "irit" / Grit case), then it does not lock.

**C6. Duplicate offer.** Given two slots reading the same item, then neither lock is trusted and both are read again.

**C7. Spent set.** Given the taken card appearing in the inventory grid, then that set is not advised again.

**C8. Round 1 choice 1.** Given that label, then the owned list is empty.

**C9. Resync.** Given the tracker believes round 1 and the frame shows round 3 choice 2, then the status becomes `Resynced to round 3 choice 2` for about 5 s and advice uses round 3.

**C10. Ability picture.** Given the draft leaving the screen, then the ability picture appears and is gone 15 s later. Given a draft returning at 5 s, then the picture disappears at once.

**C11. Capture idle.** Given a real game (not the harness policy) and 4 s with no draft and no ability picture, then capture stops. It does not start again from a stale probe hit inside 30 s unless the probe has missed in between.

**C12. Denial.** Given the capture request denied, then the status problem is the Windows-blocked sentence, no other window is captured, and a later request is still attempted within 2 s while the game rectangle exists.

**C13. Reader down.** Given the helper killed so it will not restart, then the state is failed, the status says `Name reader not running`, and a choice frame shows three `?` plates or the fallback, with no uncaught error.

**C14. Hero precedence.** Given a pinned hero, then portraits and the loading screen do not replace it until auto-detect. Given a loading read, then a portrait does not replace it. Given only a portrait, then the guess badge, the status sentence, and the 5 s overlay note all appear.

## D. Scoring

**D1. CLI.** Given hero 1, round 2, and the three names `Improved Spirit`, `Enchanter's Emblem`, `Swift Striker`, then the printed ranking and the re-roll call match the formulas in [04-scoring.md](04-scoring.md). This is the example command in the readme.

**D2. Burst Fire.** Given the labelled take of Burst Fire (video-truth stretch s7, draft d023), then the advice is to take it, not to re-roll.

**D3. Labelled re-roll.** Given the labelled re-roll (stretch s2, draft d007), then the advice is to re-roll.

**D4. Breakdown.** Given any advised card, then the tooltip rows sum to the plate score at two decimals, and an enhanced card's Enhanced row equals the plate's `Enhanced +n` (or `Enh +n`).

**D5. Infernus Ricochet.** Given enhanced Ricochet on Infernus, then the enhanced bonus is about a fifth of a full weapon-damage enhancement (factor 0.2) and the tooltip note says weapon stats are of little use for Infernus.

**D6. Fifth active.** Given four active items owned and a fifth active offered, then that card is 0.5 below the same card with three actives owned. It is still offered, not hidden.

**D7. Duplicate.** Given the offered item already owned, then its score is 1 lower and the reason says the player already holds it.

**D8. Unknown ceiling.** Given two sure cards and one `?`, then a re-roll is not called. A take is called only when the best sure score beats every possible card of that choice's tiers.

**D9. My Picks do not move the score.** Given the same three cards with highlights off and on, then the scores, the teal card, and the re-roll call are identical.

## E. Advisor UI

**E1. Tabs.** Given the three tabs, then each shows its title, the advisor keeps capture running while hidden, and the selected tab is restored after a restart.

**E2. Change hero.** Given an auto hero, when the player presses `change` and picks another name, then that hero is pinned and `auto-detect` returns. Auto-detect lets the next loading read win.

**E3. Ability editor.** Given a click on an unbought 1-point pill in round 1, then it shows `R1`. Given a click on a 2-point pill first, then the refusal says the 2 point upgrade comes before the one under it. Given more points than the rounds have handed out, then the round sentence names the spent and the cap. Given a complete valid order, then the overlay picture uses it and says `Your order`. Given Reset, then the standard order returns.

**E4. First run.** Given a fresh settings folder, then the three lines and `Show me` / `Got it` appear. `Got it` hides it across restarts. The tray opens it again. `Show me` opens the dummy and the overlay.

**E5. Strings.** Given every sentence in the control window, the overlay, and the tray, then none contain an exclamation mark, an emoji, an em dash, an arrow, or a middle dot.

## F. My Picks

**F1. Default Violet.** Given a fresh settings folder, then the tab is on Violet, highlights are on, and the active list is Scarlet 9X version 2 (build 998571). The oses Violet list (897240 version 19) is the other saved list and is not active.

**F2. oses hero.** Given Infernus, then the active bundled list is build 715046 version 10. Given Abrams, Paradox, or Victor, then the match-copy line is shown.

**F3. Empty heroes.** Given Baba, Billy, or Rem, then both tiers say `No items.`

**F4. Extra heroes.** Given Mo & Krill, Viscous, Dynamo, or Kelvin, then the active list is the extra build in [06-my-picks.md](06-my-picks.md), not an oses list.

**F5. Edit.** Given an item added as Main, then a later draft of that hero shows the gold ring and `MY PICK` on that item only. Moved to Secondary, the ring is the dim one and the tag is `ALT`. Removed, the ring is gone. Restarting keeps the edit.

**F6. Fallback hero.** Given no hero read and the tab set to Seven, then highlights use Seven's list. Given a loading read of Haze, then highlights use Haze even if the tab still shows Seven, and the tab says `This draft highlights Haze.`

**F7. Import.** Given build 998571 version 2 entered by hand, then the list imports for Violet without sending anything to the game. Given a non-integer, then `Enter a build id and a version.` Given a build for an unknown hero id, then the hero-id sentence appears. With the network disabled, the bundled lists still highlight.

**F8. Scarlet map.** Given the Scarlet list, then categories early spikes, midgame, and late options are Main, and vs guns, early options, hard lane, counters, components, and wip are Secondary. Given any other imported build, then only optional categories are Secondary.

**F9. Reset.** Given edits, when Reset to default is pressed, then the bundled active list is back.

**F10. Toggle.** Given Highlight My Picks cleared, then no rings and no tags are drawn, and the scores stay.

## G. Tier list

**G1. Grades.** Given the snapshot, then every hero appears once, each draftable item appears once under its tier, and each entry is S, A, B, or C. The cuts and the 70/30 mix match [07-tier-list.md](07-tier-list.md). Filtering to tier I hides other tiers. All tiers brings them back.

**G2. Age.** Given a snapshot fetched more than 14 days ago, then the age is styled stale. The footer names the hero-game count, the file's window length, and the end date.

**G3. Header phrase.** Given any snapshot, then the subtitle contains the fixed words `data from the 30 days to` and a date. It does not rewrite "30 days" from the file.

## H. Persistence and packaging

**H1. Folder.** Given an existing `%APPDATA%\deadlock-street-brawl-helper` with a My Picks edit and a window position, when the rewrite is installed over the old app, then both are still there.

**H2. Preload.** Given the packaged app, then the preload file is CommonJS. The page bridge exists. Minimise, close, test mode, and capture all work. A packaged archive whose preload is an ES module fails this check.

**H3. Final build contents.** Given the packaged final archive, then it does not contain the debug toggle, the session recorder, the test-video control, or a test hook.

**H4. Artifacts.** Given a version tag, then the release contains a portable exe and an NSIS installer that can change directory. The readme warns about SmartScreen.

**H5. Priority.** Given a normal Windows launch, then after a few seconds the process priority is below normal.

## I. Manual checks

These need a person and a real Deadlock client. They are part of parity for a release, and they are not automated today.

**I1.** Borderless Windowed: the overlay is actually on top of the draft and a click on a card reaches the game.

**I2.** Exclusive fullscreen: the app does not crash. The black hint appears after about 10 s of black capture. The overlay may fail to draw. That limit is documented, not papered over.

**I3.** Test mode on a real desktop at the player's scaling: dummy and overlay line up, the screenshot select works, turning test mode off leaves a real game untouched.

**I4.** One full Street Brawl match: hero from the loading screen, plates track the cards, a re-roll mark appears when the scorer says so, the ability picture shows for about 15 s, My Picks rings match the list.

**I5.** Import from the installed app, not only from a development page.

## J. Out of scope for parity

- Playing the user's OBS recordings automatically.
- A second resolution's hand-measured anchors. Only 16:9 scaled from 2560 by 1440.
- Advice for modes other than Street Brawl.
- Reading teammates' items or advising ability unlocks. There are no unlocks in this mode.
