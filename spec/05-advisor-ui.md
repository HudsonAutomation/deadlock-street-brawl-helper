# 05. Draft advisor, ability order, first run, debug, test mode

The control window has three tabs: `Draft advisor`, `My Picks`, `Street Brawl Tier List`. The last tab used is restored. Switching tabs does not stop capture and does not reset the tier list's filters. The advisor and the tier list stay mounted while hidden.

The footer credits deadlock-api.com and links to the Street Brawl Advisor notes. It must not claim the app talks to the game.

If the snapshot fails to load, show the error under the title strip. While it is loading, show `Loading snapshots…`.

A page crash shows a Reload button instead of a blank window, and logs the error. The overlay has the same guard.

## Header on the advisor tab

- Hero portrait and hero name.
- While the hero came from the loading screen and the player has not opened the changer: a small `auto` tag, tooltip `Read from the loading screen`, and a `change` button.
- `change`, or a portrait guess, or no read yet: a hero dropdown. Choosing a name pins that hero. A `auto-detect` button appears once pinned and clears the pin.
- A portrait guess that is not pinned shows `guessed` instead of `auto`, tooltip `Guessed from the scoreboard portraits`.
- Default hero before any detection is Infernus (id 1). The dropdown lists every hero by name, alphabetically.
- The header does not show the hero portrait on the other two tabs. Those tabs title themselves `My Picks` and `Street Brawl Tier List`.

## Status line

One sentence, in this order:

| Condition | Sentence |
| --- | --- |
| Not on Windows | The platform warning from the shell, in the status line |
| Resync in the last 5 s | `Resynced to round <N> choice <M>` |
| Portrait guess | `Hero guessed from portraits: <name>. Pick the hero to correct.` |
| No game and test mode off | `Waiting for Deadlock` |
| Game found, draft not up | `Ready. Open a Street Brawl draft` |
| Draft up, plates not ready | `Reading` |
| Draft up, at least one ranked card | `Advising` |
| Detect now in progress | `Detecting…` |
| Detect now found nothing | `No draft found` |

While a draft is up and no hero was read: `Hero not read. Using <name>`.

One problem, the most blocking first, under the status line:

| Condition | Sentence |
| --- | --- |
| Game found and the probe region has been black for 10 s without a break, game in front and covering its monitor | `Capture reads black. If Deadlock is in Fullscreen, switch to Borderless Windowed` |
| Game found, smaller than 1280 by 720 | `The Deadlock window is too small to read. Make it at least 1280 by 720.` |
| Capture was denied | `Windows blocked the screen capture. Restart this app, then open the draft again.` |
| F8 could not be registered | `F8 is taken by another program. Close that program, or read from the tray menu.` |

Any non-black read, a draft read, a round read, a loading-name hit, or a capture that starts clears the black hint. Log when it changes. A borderless loading screen is black in that region for a moment; the 10 s wait is what keeps the hint from firing then.

Name reader down, in addition to the status: `Name reader not running`.

The same problem sentence is drawn on the overlay for 5 s.

## Advice list in the window

Shown on the advisor tab, and repeated in the debug panel when that panel is on.

- While data is loading: `Loading Street Brawl data…`
- No cards and capture is off: `No cards yet. Start the screen capture above, or pick the three cards yourself in "Cards on screen" below.`
- No cards and capture is on: the status sentence.
- Re-roll: `Re-roll this set: expected best <a> vs <b> on screen` with both numbers to two decimals, and a button `I re-rolled`.
- If the re-roll's hold value is above 0: `saving this set for a later choice is worth <n>` to two decimals.
- Otherwise, when cards are showing: `Keep this set` or `Keep this set (no re-rolls left).`
- After the player marks a take: `Took <name>, <n> owned`.

Each card is a button. The best one, when there is no re-roll, is labelled `TAKE <name>` and styled as the best. The others are `#2`, `#3`. An enhanced card appends ` (enhanced)`. A My Pick appends `MY PICK` or `ALT`.

The line under the name: `score <n> , best` or `score <n> , -<percent>% vs best`, then `used by <percent>% of <hero>s`, then `, wins <percent>%` when a win rate exists, then `, no brawl data` when it does not. The reasons from [04-scoring.md](04-scoring.md) follow, separated by semicolons.

Clicking a card records that the player took it. The tooltip says `picks are read from the inventory grid; click only if it missed` while capture is on, and `I took this one` while it is off. The score in the tooltip is `score <n>`.

Shipping builds do not show Start capture, Stop capture, or Detect now. Those live in the debug panel. Capture follows the probe, F8, and the tray.

## Ability order

Collapsed under the advisor. Summary: `Ability order for <hero>: standard`, or `yours`, or `yours (not valid, using standard)`.

Help: `Pick a round, then click a point to buy it in that round. Click a bought point to sell it.`

Five buttons, `Round 1` through `Round 5`. The selected round is pressed. The title is `Round <n>: <points> points, <left> left`. Points handed out are 6, 6, 5, 5, 10. Unspent points carry forward.

Four abilities in bar order, labelled 1, 2, 3, 4. Those labels are positions, not the player's keybinds. Each ability has three pills, costs 1, 2, and 5, top to bottom. A pill's accessible name is `<ability> <cost> point upgrade, round N` or `not bought`. A bought pill shows `R<n>`.

The evidence line is `Your order` when a custom order is in use, otherwise `Default order: <n> matches, <w>% win rate` or `Default order: No reliable order`.

### How the standard order is chosen

From the hero's recorded ability sequences in the Street Brawl snapshot. Each step keeps only the sequences that start with the steps already chosen. The next ability is the one whose continuations have the best `(shrunk win rate) × log(1 + matches)`, with shrink constant K equal to the maximum of 50 and 5 percent of the largest sequence's matches, toward the hero's mean win rate. An ability can be chosen at most 3 times. Stop when the best continuation has fewer than 100 matches. If nothing qualifies, fall back to each ability once, then tier 2s, then tier 3s, in bar order, and say there is no reliable order.

Place those steps onto the five rounds without spending more points than the rounds have handed out. A pill that does not fit waits. Unspent points carry. If the order runs out early, fill leftovers tier 1s first, then tier 2s, then tier 3s, in bar order, so all 32 points are spent by round 5. There is no unlock advice. Every ability starts unlocked in Street Brawl.

### Editing

- Click an unbought pill to buy it in the selected round. Click a bought pill to sell it and every higher tier of that ability.
- A pill needs the cheaper pill under it bought in the same round or an earlier one.
- Overspending is refused. The message is the same text the validator returns:
  - `Pick a round for every point.`
  - `Ability <n>: a 2 point upgrade comes before the one under it.` or the same with 5.
  - `Round <n>: <spent> points spent by now, only <cap> handed out.`
- A partial order may be stored. Only a complete valid order replaces the standard order on the overlay. An incomplete one keeps the standard order and the summary says it is not valid.
- `Reset to default order` clears the custom order.
- `Start from empty` sets all 12 pills to not bought.
- Stored per hero, 12 integers, bar order, tiers 1 then 2 then 3. 0 means not bought. See [09-persistence-packaging.md](09-persistence-packaging.md).

The overlay picture, for the round just drafted, highlights this round's pills, greys earlier rounds with a check, and leaves later pills plain. Title `Round N: X points`. It uses the custom order when that order is valid, and the evidence line `Your order` in that case.

## First-run check

Shown until the player presses `Got it`. The tray's `First-run check` opens it again.

Three lines:

1. `Deadlock found`, ticked when a game or dummy is found.
2. `Borderless Windowed`, ticked when the window has no caption and capture is not in the black state. If the style cannot be read, the line is the instruction `Set Display Mode to Borderless Windowed in Video settings` with no tick. If the black hint is active, this line is replaced by the black-capture sentence and is not ticked.
3. `Resolution readable`, ticked when the window is at least 1280 by 720.

`Show me` starts test mode on a built-in draft picture. `Got it` dismisses the panel and remembers that.

## Test mode

Button, in the debug panel in development builds, and reachable from the tray in every build: `Test mode (dummy Deadlock window)` / `Turn test mode off`.

- Opens the dummy described in [02-shell.md](02-shell.md), showing one picture from the app's demo set.
- A Screenshot select switches the picture live without restarting.
- The normal find, capture, recognise, advise, and draw path runs against the dummy.
- A real Deadlock is not found, probed, captured, or moved.
- Capture is allowed only from the dummy's own source. The desktop capture list does not include the app's own windows, so the dummy is served by its source id.
- Closing test mode closes only that window and restores the control window.
- Built-in pictures include a normal choice, a second choice, a round-2 re-roll, a two-card landing frame, a loading screen, a black frame, an in-round frame, and a gameplay frame. The two-card, loading, and black frames are for checks. The player-facing picker can list the ordinary draft pictures.

Production keeps still-picture test mode. It does not keep the video player.

## Debug panel

Development and release-candidate builds. Off in a final build even if a shortcut is pressed. On at launch in dev and `-rc`. Title strip shows `DEBUG` while it is on. Ctrl+Shift+D and the tray entry toggle it.

While on, the panel includes:

- `Start capture` / `Stop capture` / `Starting`
- `Detect now (F8)`, disabled when no game is found or a detect is in progress
- Test mode button and the screenshot select
- Round and choice controls, and re-roll count. Changing them clears the accepted set
- Enemy hero toggles and an owned-item list
- The advice list
- The ability order editor (also on the shipping advisor)
- Session report

### Session report

Development builds record the last 3 matches under the settings folder, crops only, 300 MB cap, oldest deleted first. One row per draft: crops, items read, plates shown, advice milliseconds, and `Mark wrong`. Empty state: `No drafts recorded yet.` A refresh button reloads the list. Marked, unreadable, or changed drafts can be copied out by a developer tool; that tool is the only supported way to add them to the fixture set. Do not commit session crops.

### Test video

A `Play a video` control in the debug panel's test-mode row. It plays a file in the dummy at normal speed, muted, with play and pause, back 10 seconds, forward 10 seconds, a position slider, and `Back to screenshot`. The last file is remembered. Nothing in the ordinary test run, the demo check, or a release starts a video. A person starts it.

## Strings the overlay shares

`Reading` while the draft is up and plates are not ready.

`Hero guessed: <name>` for 5 s, first draft of a guessed match.

The problem sentence for 5 s.
