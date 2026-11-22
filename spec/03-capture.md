# 03. Capture and detection

The app reads pixels. It does not ask the game for state. Layout numbers below are the contract for the current Street Brawl UI, measured on a 2560 by 1440 frame. Any other 16:9 size scales by `width / 2560` horizontally and `height / 1440` vertically, independently. A check at 2560 by 1440 with Windows display scaling at 100 percent needed no retune. 1920 by 1080 is the test-window size, not a second layout.

An implementer re-measures these boxes from the live game or from the sample frames in [11-acceptance.md](11-acceptance.md). Do not copy a recognition routine from the existing program. Matching the boxes, the timing, and the decisions below is the requirement.

## When capture runs

Capture is off most of the time, so the game stays fast.

1. While Deadlock is the foreground window and capture is off, poll a tiny screen region for the CHOICE digit (below). A hit turns capture on.
2. Poll every 500 ms while the game is in front (or test mode is on). Poll every 5 s when the game is open but not in front, or when no game is open.
3. The page stops capture after 4 s with no draft screen and no ability picture. That idle stop is ignored by the probe for 30 s, or until the probe itself misses, so a draft that just closed is not immediately recaptured.
4. Test mode and the automated harness do not probe the desktop. They capture the dummy directly.
5. F8 and the Detect now button bypass the probe and the foreground check.
6. After a Detect now miss, capture stays off until the next press, a window change, or a test-picture change.
7. If a capture target closes, the video track ends and capture is off, but the app is not in the "Windows blocked capture" state. Retry starting capture every 2 s whenever a game rectangle is known and capture is off, including after a denial. A newly found window can take a moment to appear in the capture source list.
8. Each attempt is logged before the capture request. A successful start is logged only after the video is actually playing.
9. Stopping capture does not clear the last video frame by itself. Do not treat "a video element still has a picture" as "capture is live".
10. The display-media handler serves only the Deadlock window (or, in test mode, only the dummy's own source id). If that window is not found, deny the request and tell the page. Never substitute the desktop or another window.
11. About 3 s after launch, set this process and its children below normal priority. Skip that under the harness.
12. The name reader is started and warmed with one dummy crop at launch, before the first draft.

The probe, the round banner, and the loading-name box are small GDI reads of the screen, not a full window capture. Full capture is the window, not the desktop.

Disable the Windows Graphics Capture window capturer and native occlusion calculation, so the capture has no yellow border and a covered test window still paints. Keep that switch in the app and in every harness that launches it.

## What "a draft is on screen" means

The draft screen shows `CHOICE n OF 3` under the select-items title. That digit is magenta and exists only on the draft screen. Reading it is the draft detector. Menus, the round-end shop transition, and ordinary gameplay do not have it.

On the 2560 by 1440 reference the choice digit box is x 238 to 268, y 380 to 428, plus 4 px of slack. Scale as above. A successful read of digit 1, 2, or 3 means the draft is up.

The round digit sits above the timer, light text, box x 1318 to 1352, y 50 to 82, plus 4 px. Digits are 1 through 5. Resample the glyph to an 8 by 12 occupancy grid and match templates measured from the same UI. The round-5 glyph has no photographed sample yet; it is a hand-drawn 5 in that same grid style and must be re-checked against a real round-5 frame. At some widths (observed at 1312 and 1600) a stray lit pixel from a neighbour stretches the box. If the first read fails, retry while ignoring one-pixel columns.

A new, different round digit on the banner, while the game is in front and capture is off, is a round start. Tell the page, warm the name reader the same way a draft start does, and reset the draft tracker's notion of the current round so the new round's first banner counts.

## Card geometry

Three cards, fixed positions. Reference centres and the icon edge:

| Slot | Centre x | Centre y |
| --- | ---: | ---: |
| Left | 712 | 855 |
| Top (middle) | 1280 | 527 |
| Right | 1848 | 855 |

Icon edge on the reference frame: 185 px. The icon the player sees is about 0.95 of that. The overlay and the name crop use this fixed square, centred on the anchor, not wherever a search happened to land. Search slack, if an icon match is used for inventory or heroes, is plus or minus 24 px, at scales 0.92, 0.97, 1.02, and 1.07.

The Use Re-Roll pill on the reference frame is x 1140 to 1420, y 913 to 996. The re-roll caption ("N Re-Roll Remaining") is x 1150 to 1215, y 1030 to 1090. Scale both.

### Name line

Each card prints its item name under the icon. That text is the identity of the card. An icon guess must not decide a card.

Prepare the crop before OCR: trim to the run of text, pad 20 px, scale so the text is at least 90 px tall. The game dims a name for up to about a second after the card lands. Lettering that is still dim is cut at a lower brightness (about 105 instead of 170) and is a reason to wait, not a reason to lock a wrong name.

### Enhanced and rare marks

A rare card is the green-shifted mark above the icon. Treat the slot as rare when more than about 8 percent of that sample is green-dominant (green above 150, green at least 50 above red, blue above red by 30, and green within 20 of blue).

An enhanced card is the blue mark under the name. Treat the slot as enhanced when more than about 6 percent of that sample is blue-dominant (blue above 150, blue at least 60 above red, blue at least 20 above green).

Both flags belong to the slot. A re-roll keeps them. If the enhanced mark fades in after the set was already accepted, advise the set again once the mark has held for two frames. Do not freeze the plain-card plates over the enhanced cards.

### Loading-screen name

While the game is in front and capture is off, also sample the box from 7 percent to 41 percent of the width and 37 percent to 53 percent of the height. It is the loading screen when 10 to 55 percent of the pixels are cream (red above 215, green above 195, blue above 160, red minus blue between 10 and 80) and more than 40 percent are dark (each channel under 60).

Send that crop to be read at most every 2.5 s, at most 12 times per showing of the screen (enough for a 30 s load). Prepare it as dark letters on white, about 60 px tall. A raw colour crop at 1920 by 1080 reads as nothing.

Match the text to a hero name. Score is 1 minus the edit distance divided by the longer length, with the same extra rules as item names, but the hero must score at least 0.85. One wrong letter in a four-letter read ("SHIP" against Shiv) is not enough.

### Hero portraits

Eight round portraits along the top, four each side of the timer. Reference centres, left x 725, 840, 957, 1075 and right x 1480, 1595, 1710, 1825, all at y 72, diameter 100. Search plus or minus 16 px, step 4, scales 0.92, 1.00, 1.08.

Read the player's own portrait and the four enemies. The three teammates come back unread and are never used. The player's slot is the one whose portrait circle is broken by a square top (a marker on the local player). If that slot is missing, there is no portrait hero.

Match portraits by normalised correlation on the circle, ignoring the top-right corner where a tier mark sits, and ignoring masked-off pixels. A match needs score at least 0.6 and a margin of at least 0.08 over the next hero. Reuse the read for the rest of the match while a coarse fingerprint of the bar still matches (more than about 12 of 200 samples moved by more than 40 means the bar changed).

The enemy list is the side that does not contain the player's hero. If the player's hero is on neither side, the enemy list is empty.

A known failure: an enemy portrait can be read as the player (a recorded McGinnis case). The loading-screen name, once accepted, must not be replaced by that guess.

### Inventory grid

The player's items sit at the bottom left of the draft: two rows of five icons.

- Older layout, reference pixels: origin (147, 1272), pitch 75, icon 66.
- Newer layout: origin (34, 1261), pitch 82, icon 72.

Read both and keep the layout that matches more slots. Search slack is 6 px at scales 0.94, 1.00, and 1.06. The grid is reliable from about 2000 px of frame width upward. Below that, do not invent picks.

A new icon that was one of the offered cards is the card the player took. That set is spent and is not advised again. The accept waits at most 600 ms for a grid match that is already running. While the grid's fingerprint is unchanged, reuse the last read. A fingerprint is a coarse 4 by 4 sample of each slot. Two samples agree when no slot has more than 3 of its 48 channel values moved by more than 40. A full-frame fade is not "the same grid".

Round 1 choice 1 clears the owned list. Later choices add what the grid shows.

## Name matching

Normalise by lower-casing and deleting every character that is not a letter a to z. Match against draftable item names. If two catalog ids share a name, keep the first only (Silencer has a disabled twin).

Score against each name:

- Whole-string similarity: 1 minus edit distance over the longer length.
- If the catalog name has at least 5 letters and sits entirely inside the read, score `0.8 + 0.2 * (name length / read length)`.
- If the read has at least 6 letters and is exactly the start or the end of a longer name, score `0.7 + 0.3 * (read length / name length)`.
- If the read has at least 6 letters and sits inside a longer name with at most one edit, score `0.7 + 0.3 * (matched letters / name length)`.

Take the best of those. Accept when the score is at least 0.75 and at least 0.08 above the runner-up. A read under 5 letters must be exact (score 1). A read under 3 letters is nothing. This stops a fading "irit" from locking as Grit.

### Locks

Each slot's item is the last accepted name, plus a fingerprint of that line. While the line looks the same, the slot stays that item.

- A line that changes under a lock during an advised set is a hover (the hovered card grows and the tooltip covers the next name). Keep the lock and the advice.
- For 600 ms after a re-roll is seen (two name lines blank in one frame as the cards fade, or the re-roll count drops), a line that changes by more than 6 grid cells is a new card. Unsettle that slot at once, and a read of a different item moves the lock.
- A covered line never changes a lock, and is not read again once the slot has a lock.
- A line is covered when its ink is at least 300 and the text is off centre by at least 0.3 of the line (the tooltip sits to one side). A fading-in third name also looks off centre. Before the set is accepted, a covered slot with no lock is still read. A tooltip title is caught because a draft never offers the same item twice: a read equal to another slot's item is rejected and both slots are read again after 300 ms.
- A slot that is never seen uncovered becomes `?` on the normal fallback clock and upgrades the moment a real read lands.
- A lock taken in the last 500 ms with score at least 0.9 is still fading in. Do not demand a second identical read before trusting it.
- The same failed picture (at most 1 grid cell of change) is not sent to OCR again.

### Name reader process

One hidden helper process does Windows OCR, one crop at a time. Crops sent back to back queue.

- Input line: an id, width, height, and base64 RGBA.
- Output line: JSON with that id, the text, and the milliseconds the helper spent.
- Warm it with one dummy crop at startup.
- If it exits, restart once. A second exit, or a failed start, leaves the reader down for the rest of the session.
- Down, or not on Windows: every read fails. Status line `Name reader not running`. Unread cards are grey `?`. The hero falls back to the window's selected hero. The re-roll caption may still use a glyph test for the digit 1, and nothing else.
- Do not bundle a second OCR engine.

The re-roll caption is prepared at 4 times scale. Only a lone 0 or 1 at the start of the text is believed. Anything else, and every read while the reader is down, uses the glyph: a tall thin mark (height at least 8 px and width/height at most 0.45) means 1, otherwise 0. A later change is taken only when two re-reads agree, at least 600 ms apart. The first set of a match does not wait for that caption: if a glyph is present, assume 1 re-roll remains, otherwise 0, and let a later agreed read correct it. The owned list is delivered with the accepted set and not again while that set stays up.

One crop that gets no answer within 3 s fails. The helper has 15 s to start. The warm-up crop is about 160 by 48. Once capture is running, ask the window for about 15 frames a second while a draft is up, about 4 while idle, and about 8 when reads are slow.

## When a set is advised

The same three identities and the same round and choice labels must hold for 100 ms. The same cards under new labels, or labels that go backwards, must hold for 600 ms, measured from the first frame that names all three. A set the player already picked (it appeared in the inventory) is spent and is never advised again.

Before the names land, the settle clock may run on a provisional set that has `?` for each unread slot, and the re-roll caption and the inventory grid are read on that provisional set too, so the accept does not wait an extra frame for them.

Two cards up, third not yet: start the 100 ms clock and pre-read the hero bar and the grid, but do not draw plates until all three locks exist or the fallback fires.

Two empty card circles mean the cards are leaving or sliding in. Drop advice. Do not show the fallback.

Fallback, from the first frame any card was present:

- At 1.0 s, advise the cards that are sure. The rest are grey `?`.
- If a read is already on its way, hold the fallback at most 200 ms more.
- A card that has been on screen under 250 ms does not count as "failed" yet.
- Dim lettering holds the fallback until the line brightens, but at most 2.0 s from the first card.
- A `?` upgrades the moment its read lands. Do not wait out the rest of the second.
- Take and re-roll are shown with the plates only when every sure card has a score. If any card is `?`, call a take only when the best sure card beats the highest score any unread card of this set's tiers could have (the unknown ceiling in [04-scoring.md](04-scoring.md)). Otherwise show the plates and do not call a re-roll.
- Plates, the take mark, and the re-roll call appear together and then stay frozen for that set, except for the enhanced-mark update and the `?` upgrade above.

Changing the round or choice in the debug controls clears the accepted cards. The reader must not re-send a set it already accepted for those labels.

## Hero for the match

Precedence, highest first:

1. A hero the player picked by hand (pinned).
2. A loading-screen read from this match.
3. The scoreboard portrait.
4. The hero selected in the window, with the line `Hero not read. Using <name>`.

Rules:

- A loading read sets the hero for the whole match. No portrait read replaces it.
- A loading read older than 60 minutes is ignored.
- A match starts at a loading read, or at round 1 choice 1 (or a lower round than one already seen) when there has been no loading read in the last 5 minutes. A loading read in that 5-minute window belongs to the match that is starting, not the previous one.
- Portrait only: status `Hero guessed from portraits: <name>. Pick the hero to correct.` The hero pill shows `guessed`. The overlay shows `Hero guessed: <name>` for 5 s on the first draft. All of that clears when a loading read or a hand pick arrives.
- My Picks uses the read hero. If no hero was read, it uses the hero selected on the My Picks tab.

## Ability picture timing

After the draft screen has been gone for 6 frames, or for 3 frames spread over 1.5 s (so a slow machine still closes it), the draft is over. Show the ability-points picture for 15 s, then hide it. A draft that opens again ends the picture at once. While it is showing, capture is not idle.

## Performance the player can feel

Target: plates within 400 ms of the last card landing (the first frame where all three circles hold a card), on a quiet machine, from the text reads alone. The cost after the last card is the third name fading in (often 100 to 350 ms of blank or garbled text), one OCR round trip, the 100 ms settle, and the draw. The 1.0 s fallback is the backstop, not the goal.

Implementation requirements that exist because they were measured:

- Copy only the regions that are read (cards, hero bar, choice and round labels, re-roll caption, inventory). That is about 11 percent of a frame. A full-frame read and a region read must agree.
- Do not resize the capture canvas every frame.
- Draw the video into one canvas per presented frame, then cut regions from that canvas. A new picture is signalled by the video's frame callback, with a 150 ms fallback.
- Start the next frame's copy as soon as reading of the current one begins, so the settle check finds it waiting.
- A name or caption read that lands before the set is accepted re-runs the last frame immediately, at most 3 times per frame, instead of waiting for the next picture.
- The icon index and the reader are ready before the first draft.

## Logging

Structured JSON lines. No bare console logging in the app. Do not log screen pixels, account ids, or anything that is not needed to diagnose a read. Useful events, by meaning: reader ready or failed, a card name and its score, an unsure name and why (no item, empty, covered, reader down), a loading-screen hero, a draft warm-up, a manual detect hit or miss, a black probe, capture attempt and capture start.
