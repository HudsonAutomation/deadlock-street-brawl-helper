# 08. Overlay look and behaviour

The overlay is the only thing drawn on the game. Colours live in one place and the overlay reads the same values the control window uses.

## Palette

| Role | Value |
| --- | --- |
| Teal | `#2ec4b6` |
| Teal ink (text on teal) | `#06201d` |
| Teal dim | `#1b6f68` |
| Page background | `#101314` |
| Raised surface | `#171c1d` |
| Text | `#ece6da` |
| Muted | `#a39e92` |
| Overlay plate fill | black at 85 percent, `rgba(16, 19, 20, 0.85)` |
| Grey | `#8a9092` |
| Veil | black at 35 percent |
| Dimmed plate opacity | 0.6 |
| Main pick | `#e6b325` |
| Secondary pick | `#8d7b58` |
| Corner radius | 4 px or less |

The control window's older shop palette (parchment, weapon gold, vitality green, spirit purple) is remapped onto this charcoal and teal identity. Do not ship two competing themes.

## When the overlay window is visible

Show it only when at least one of these is true:

- A draft is on screen and the overlay has a reading sign, plates, or a re-roll mark to draw.
- The ability-points picture is inside its 15 s.
- The lobby dot should show.

Otherwise hide the window. A hidden overlay does not take a topmost slot.

Ctrl+Shift+O forces it hidden until the shortcut is pressed again, even if the list above is true.

## Draft drawing

Plates, the take mark, and the re-roll call appear together once every sure card has advice, then stay put for that set (with the exceptions in [03-capture.md](03-capture.md)).

Until then, if the draft is up, draw the word `Reading` above the middle card's plate position, by at least 6 px and at least 0.35 of a plate's height. If that would leave the frame, draw it below the plate instead.

### Plates

One plate above each card that is present or unknown. Contents: a tier letter, then `Score: <n>` to two decimals. Unknown cards use a grey `?` badge and a `?` label, no score.

- The card to take: plate filled teal, dark text, and a 3 px teal circle on the item icon.
- Every other sure card: charcoal plate, 1 px grey border, grey badge and text, drawn at 0.6 opacity.
- A black 35 percent veil covers each non-advised card's icon, under the plates. Hover still works on a veiled card.
- A `?` card is grey and veiled when there is a best card or a re-roll. If there is no best card and no re-roll, nothing is veiled.
- An enhanced card adds a cell at the right end of the plate: `Enhanced +n`, or `Enh +n` when the plates would touch. `n` is the enhanced bonus from [04-scoring.md](04-scoring.md), the score minus the same card not enhanced.

### Re-roll

When a re-roll is called, no card is the best. All cards are grey and veiled. Draw a filled teal plate the size of a card plate, centred above the Use Re-Roll button, reading `RE-ROLL`, plus a 4 px teal outline on the button.

### My Picks

Rings and tags from [06-my-picks.md](06-my-picks.md), drawn so they do not replace the teal circle.

### Hover

While a draft is showing, read the cursor every 50 ms and hit-test in the overlay. While only the lobby dot is showing and the game is in front, poll every 400 ms. Poll nothing otherwise.

Hovering a plate shows a tip. Rows are the breakdown from [04-scoring.md](04-scoring.md). They sum to the score on the plate. The tip works on a veiled card.

### Notices

- `Hero guessed: <name>` for 5 s on the first draft of a guessed match.
- The current problem sentence for 5 s.
- In a development video run only, each plate may also show the item name and a millisecond timing. Final builds do not.

## Ability picture

An HTML picture of the in-game upgrade panel, not a second copy of the game's art direction beyond the pills and the four columns. Same layout the editor uses. This round's pills highlighted, earlier rounds grey with a check, later rounds plain. Title `Round N: X points`. Evidence line as in [05-advisor-ui.md](05-advisor-ui.md). Fifteen seconds, then gone. A new draft removes it immediately.

## Lobby dot

A dot at the top left, about 10 px at 1080p, 70 percent opaque.

| State | Colour | Hover |
| --- | --- | --- |
| Watching for a draft | Teal | `Brawl Helper: watching for draft. F8 = detect now` |
| Capture on, reading | Amber | `Brawl Helper: reading draft. F8 = detect now` |
| Capture failed | Grey | `Brawl Helper: capture failed. F8 = detect now` |

Show the dot when a game window is found, the player is not in a match, and Deadlock (or the dummy) is the foreground window. "In a match" starts at a draft or a round banner and ends after 10 minutes with no draft, or when the window is lost and found again (back in the lobby). Hide the dot during a match and whenever Deadlock is not in front. Test mode counts as in front.

The dot is drawn by the overlay from the shell's state. The control window does not set it.

## Click-through

Clicks and real mouse moves pass to the game. The overlay never focuses. The player must be able to pick a card through the plates. This was not verified on a live Deadlock client in the last session; it remains a release check in [11-acceptance.md](11-acceptance.md).
