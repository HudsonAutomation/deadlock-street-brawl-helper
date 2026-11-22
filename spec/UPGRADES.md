# Upgrade opportunities

Build these only after the matching parity rules pass. Each item is a change in behavior. None of them are permission to skip a check in [11-acceptance.md](11-acceptance.md).

Priorities:

- **must**: the current behavior will be wrong or unusable after an ordinary game patch, or it is already wrong on a common setup.
- **should**: a clear gain in accuracy, speed, or recovery, with a contained risk.
- **nice**: a comfort improvement a player can live without.

Spending money (a code-signing certificate, a paid OCR service) is not part of any item below. Those need a separate yes.

## Detection

### U1. Calibrate the layout instead of trusting one 2560 by 1440 measurement

- Priority: must
- Parity today: [03-capture.md](03-capture.md) fixes every box as a fraction of 2560 by 1440.
- Current limitation: if Valve moves the cards, the CHOICE label, or the hero bar by even a short distance, the app keeps reading the old boxes. The player sees `Reading`, then grey `?` plates, or plates on empty space. Non-16:9 and ultra-wide frames scale incorrectly because width and height are scaled independently. Below about 1080p the test window cannot be read at all. At 125 percent DPI the overlay is allowed to sit 1 or 2 px off, and a larger miss is not corrected.
- Improvement: on a confirmed draft (the CHOICE digit and three name lines agree), remember the measured card centres, the re-roll pill, and the label boxes for this resolution and UI version. Offer a one-time "line up the boxes" adjustment if the digit reads but the names do not. Refuse to advise when the frame is not 16:9 until a calibration exists.
- Benefit: a UI patch no longer silently mis-advises. Ultra-wide and odd resolutions fail closed instead of drawing on the wrong pixels.
- Risk: a bad calibration is worse than the built-in boxes. Keep the built-in boxes as the default, and let the player reset to them.

### U2. Re-measure rare, enhanced, and the round-5 digit from the live game

- Priority: must
- Parity today: rare rate 4/27, enhanced rate 3/27, counted on a small fixture set. The round-5 glyph is hand-drawn. The enhanced stat multiplier is an assumed 1.25. Ricochet is the only item whose boosted stat is listed.
- Current limitation: a re-roll call depends on those rates. If the mode deals more or fewer rare cards than the fixture, the app tells the player to re-roll a set they should keep, or the reverse. Round 5 can fail to read. Enhanced scores are systematically high or low for every hero, and only Infernus-plus-Ricochet is called out in the tooltip.
- Improvement: count rare and enhanced marks over a new sample of at least a few hundred cards, per round. Photograph a real round-5 digit and match that. Read the enhanced numbers from the on-screen tooltip when it is up, and use the measured ratio instead of 1.25. Until a measurement exists, keep the parity constants and show the player nothing about the assumption.
- Benefit: re-roll advice tracks the mode the player is actually in.
- Risk: a small sample will swing the rate. Publish the count with the snapshot, and do not change the constant until the new count is in the spec.

### U3. Read a covered or dim name instead of waiting, then giving up

- Priority: should
- Parity today: a tooltip over a neighbour blocks that lock. Dim text waits up to 2 s, then a `?` can still win.
- Current limitation: the player hovering a card, which is how they read it, hides the next card's name. That slot becomes `?` or stays on the previous item. Advice is late or incomplete on the card they are looking at.
- Improvement: read the name from the visible half of the line, and from the tooltip title when it names the hovered card only. Keep the parity rule that one item is never offered twice, so a title that copies another slot is still rejected. Show a dim plate as "still reading" rather than a confident `?` until the 2 s cap.
- Benefit: hovering stops costing a card. Fewer grey plates.
- Risk: trusting a tooltip title too early locks the wrong slot. The duplicate-item check has to stay.

### U4. Portrait guess should not pick an enemy

- Priority: should
- Parity today: the local player is the portrait with a square top. A recorded frame reads an enemy McGinnis as the player. The app then marks a guess, which is honest, but the scores are for the wrong hero until the player notices.
- Improvement: require the square-top marker and a margin, and if the four enemies include the same hero as the "player", prefer the loading name or stay on "hero not read" rather than committing. Let the player confirm a guess with one click that is already on the advisor.
- Benefit: a mid-match launch stops advising the enemy's build.
- Risk: refusing a weak read leaves more matches on the window's selected hero. That is the safer failure.

### U5. Inventory picks below 2000 px wide

- Priority: should
- Parity today: the owned grid is trusted from about 2000 px up. On a 1080p frame the app often cannot see what was taken, so a spent set can be advised again and the owned list stays empty.
- Improvement: detect the take from the cards leaving plus the round or choice advancing, and mark that pick as assumed, the way the tracker already distinguishes a grid read from an assumption. Say so in the window (`Took <name>, not seen in the inventory`).
- Benefit: 1080p players get an owned list and do not get the previous choice's plates again.
- Risk: assuming the teal card was taken is wrong when the player took another. The click-to-correct on the advice row must remain.

## Speed

### U6. Do not queue the three names behind one OCR call

- Priority: must
- Parity today: the helper answers one crop at a time. Three names plus a caption wait in line. On a busy machine one hop is 300 to 1000 ms, so the 400 ms target from the last card is missed and the 1 s fallback fires.
- Improvement: read the three name lines concurrently, or use a reader that accepts a batch, and show each plate as its own name lands instead of waiting for the slowest. Keep the 100 ms agreement rule before calling the set final.
- Benefit: the usual case stays under 400 ms from the last card even when one line is slow. A `?` appears only for the line that actually failed.
- Risk: more CPU during the draft. Cap the concurrency at three so a long match cannot spawn a crowd of readers.

### U7. Start capture on the first ink of a card, not only on the CHOICE digit

- Priority: should
- Parity today: capture turns on when the CHOICE digit reads, and turns off 4 s after the draft leaves. A probe hit just after an idle stop is ignored for 30 s.
- Current limitation: the digit and the cards do not appear on the same frame. The app can miss the start of the fade-in, which is when the names are hardest, and then have less time before the player must click. A draft that reopens inside the 30 s quiet period waits for a miss first.
- Improvement: arm capture when either the digit or two card circles light up. After an idle stop, allow an immediate restart when two circles appear, and keep the 30 s quiet only for a digit flicker with no cards.
- Benefit: the reader is awake while the names are fading in, which is the slow part.
- Risk: lighting circles in a non-draft screen could start capture. Require the circles to sit on the three known anchors, and stop again if no digit arrives within a second.

## Advice the player can check

### U8. Say when the snapshot is the short post-patch window

- Priority: should
- Parity today: the tier-list subtitle always says "30 days" even when the file records a few days after a patch. Scores still use that short window. There is no button to refresh.
- Improvement: subtitle and footer both state the file's real start date, end date, and match counts. A "this snapshot is from <date>" line sits on the advisor too. Updating the snapshot stays a rebuild, not a silent download, until the player asks.
- Benefit: the player can see that a grade is from a four-day window and not from a month.
- Risk: changing the subtitle fails the parity string check G3. Do this only after parity is accepted, and update the acceptance line in the same change.

### U9. Kit fit for heroes other than Infernus

- Priority: should
- Parity today: every hero gets a generic keyword guess. Only Infernus has a hand table, and only Infernus discounts weapon damage (0.2). Other gun-light or gun-heavy heroes are treated as average.
- Improvement: extend the same weapon-use factor, with a written reason per hero, after watching one draft of that hero. Keep unpublished heroes at 1. Show the factor in the tooltip whenever it is not 1, as the Infernus note already does.
- Benefit: enhanced weapon items stop looking equally good on heroes who do not shoot.
- Risk: a wrong factor moves the teal card. Ship one hero at a time and keep the old score beside it in a development build until the labelled drafts still agree.

### U10. Re-roll copy in words, not only two decimals

- Priority: nice
- Parity today: the window says `expected best 1.23 vs 0.80 on screen`. The overlay says `RE-ROLL`. A player cannot see why without the tooltip.
- Improvement: add one short line, still inside the wording rules: the slot is rare, or enhanced, or the set is below the usual card of that tier. Keep the numbers.
- Benefit: the player can ignore a re-roll they do not believe.
- Risk: a vague sentence is worse than the number. Tie the sentence to the part that created the gain (rare slot, enhanced slot, or low score).

## My Picks and settings

### U11. Import from a build-browser link, and export the lists

- Priority: should
- Parity today: Import asks for a numeric id and a version. There is no file export. A new machine, or a new settings folder, loses the edits.
- Improvement: accept a build-browser URL that contains the id and version, and still accept the two numbers. Offer "save my lists" and "load my lists" as a JSON file the player keeps. Loading merges by hero and does not wipe a hero the file does not mention.
- Benefit: the player can move lists and can paste a link instead of two numbers.
- Risk: a hostile file could fill the list with unknown names. Ignore entries that are not draftable items, and keep the `Not in Street Brawl` behaviour for names the catalog lacks.

### U12. One settings place

- Priority: should
- Parity today: highlights, the hero, the tab, and the ability order are on the page. Window position, the first-run flag, and the video path are in the settings folder. Nothing turns the ability picture or the lobby dot off. F8 cannot be changed when another program owns it, beyond the problem sentence.
- Improvement: a Settings section that shows highlight on or off, the fallback hero, the overlay hotkey, the detect hotkey, whether the ability picture shows, and whether the lobby dot shows. Hotkeys are captured by pressing the keys, rejected when the operating system will not register them, and reset to Ctrl+Shift+O and F8.
- Benefit: a player who hates the 15 s picture, or whose F8 is taken, can fix it without a debug build.
- Risk: a custom hotkey that collides with the game. Default remains the parity keys, and the tray entries keep working.

### U13. Do not gold-ring an item the player already owns

- Priority: nice
- Parity today: a Main item stays gold even after it is in the inventory. The score already penalises a duplicate. The ring does not.
- Improvement: once the grid or a confirmed take says the item is owned, drop the ring for the rest of the match and keep it on the list for the next match.
- Benefit: the gold ring means "still available and on your list".
- Risk: a missed inventory read would drop the ring too early. Only drop it on a grid read or an explicit take.

## Reliability

### U14. A final build can save the one draft that was wrong

- Priority: should
- Parity today: the session recorder and Mark wrong exist only in development builds. A final build that misreads a card gives the player no way to keep the crop.
- Improvement: one control, `Save this draft`, writes the three name crops and the round and choice into the settings folder and shows the folder path. It does not record the whole match and it does not start in the background.
- Benefit: a bad read can be turned into a fixture without shipping the debug panel.
- Risk: the crops are a piece of the player's screen. Make the button explicit, and do not upload the folder.

### U15. Name reader recovery without a second secret engine

- Priority: should
- Parity today: the helper restarts once. After that, every card is `?` until the app is restarted, and the status says the reader is not running.
- Improvement: a button `Try the name reader again` restarts the helper once more, after the player asks. If Windows OCR is missing, say that, not only `Name reader not running`.
- Benefit: one crash of the helper is no longer a full session of grey plates.
- Risk: a helper that crashes in a loop. The button is manual, not an automatic third restart.

### U16. Fullscreen and borderless, told apart faster

- Priority: should
- Parity today: exclusive fullscreen and borderless both lack a caption. The app waits 10 s of solid black before the hint. The overlay often cannot draw over exclusive fullscreen at all. That is a Windows limit.
- Improvement: if the game's window covers the monitor and has no caption, and the first two probe reads are black while a loading name is not showing, show the hint immediately and keep it only if the black continues. Add the sentence that the overlay may not appear in exclusive fullscreen, so the player looks at the control window.
- Benefit: the player switches to Borderless Windowed before the first draft, not after 10 s of silence.
- Risk: the old 3-poll rule fired on black loading screens. Keep the loading-name exception, and clear the hint on any non-black pixel.

### U17. Multi-monitor

- Priority: should
- Parity today: the overlay follows the game rectangle, and window restore checks every display. A game that moves to another monitor mid-match is not a stated behaviour. The cursor poll uses overlay pixels and can miss when the game and the overlay disagree by more than the 1 or 2 px DPI slack.
- Improvement: on every poll, if the game's display changed, move the overlay before the next frame, and re-read the cursor in that display's coordinates.
- Benefit: a player who drags Deadlock to a second screen keeps plates and hover.
- Risk: moving the overlay every poll is visible jitter. Move only when the display or the rectangle actually changes.

## Packaging

### U18. Keep the settings folder across a rename

- Priority: must
- Parity today: [09-persistence-packaging.md](09-persistence-packaging.md) requires `%APPDATA%\deadlock-street-brawl-helper`.
- Current limitation: a rewrite that ships under a new product name will create a new folder and look like a fresh install. My Picks, ability orders, and the window position vanish.
- Improvement: on first launch, if the new name would differ, read the existing folder and keep writing it there. Do not copy-and-delete. Do not ask the player to export first.
- Benefit: installing the rewrite does not wipe the lists parity just promised to keep.
- Risk: two copies of the app writing one folder. Use the same single-folder rule, and if a second copy is running, do not write.

## Not upgrades

These were considered and are already parity, or they are out of scope.

- Gold versus ALT styling, Scarlet 9X as Violet's default, and import by id and version. Those are [06-my-picks.md](06-my-picks.md).
- The 400 ms target and the 1.0 s fallback. Those are [03-capture.md](03-capture.md). U6 helps meet the target. It does not change it.
- Removing the system mouse hook. That is already required.
- Reading the game's memory or files. Out of scope for every version.
