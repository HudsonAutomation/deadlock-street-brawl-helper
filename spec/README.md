# Deadlock Item Assist, behavioral specification

This folder is the contract for a clean-room rewrite of Deadlock Item Assist (the app shipped today as Deadlock Street Brawl Helper, version 0.6.0, plus the My Picks work). A different engineer implements from these pages and must not read the existing program.

Parity comes first. [UPGRADES.md](UPGRADES.md) is a separate list of improvements. Do not build an upgrade in place of the matching parity rule. Ship the behavior in this folder, then the upgrades, in the priority order that file gives.

## How to read this

- These pages say what a player, a window, and a test can observe. They also state algorithms as requirements: inputs, outputs, rules, and thresholds.
- They do not say how the current program is arranged, and they do not include its source.
- User-facing sentences in quotes are the exact words the rewrite must show.
- Numbers are requirements. Where two measurements of the game UI exist, both are requirements, and the one that matches more of the frame wins.
- The rewrite stays a screen reader. It must not open, patch, inject, or otherwise change Deadlock's files, memory, or network traffic to the game.

## Feature index

Fifty features. A rewrite has parity when every row's acceptance checks in [11-acceptance.md](11-acceptance.md) pass.

| Id | Feature | Specified in |
| --- | --- | --- |
| F01 | Street Brawl draft advisor for Deadlock on Windows | 01 |
| F02 | Screen reading only; nothing is sent to the game | 01 |
| F03 | Find a window titled exactly Deadlock | 02 |
| F04 | Frameless control window and title strip | 02 |
| F05 | Remember the control window's place | 02, 09 |
| F06 | Tray menu | 02 |
| F07 | Ctrl+Shift+O hides and shows the overlay | 02 |
| F08 | F8 reads the draft now | 02, 03 |
| F09 | Click-through overlay, no system mouse hook | 02, 08 |
| F10 | Overlay draws only while it has something to say | 08 |
| F11 | Capture runs only around a draft, not all session | 03 |
| F12 | Draft screen detected from the CHOICE digit | 03 |
| F13 | Round-start banner warms the reader | 03 |
| F14 | Loading-screen hero name, kept for the match | 03, 05 |
| F15 | Mid-match portrait guess, marked as a guess | 03, 05 |
| F16 | Hand-picked hero beats detection; auto-detect returns | 05 |
| F17 | Card identity from the printed item name | 03 |
| F18 | Name lock, hover, covered line, and short-read rules | 03 |
| F19 | A set is accepted only after it holds still | 03 |
| F20 | Unread cards become grey ? plates at 1.0 s | 03, 08 |
| F21 | Scores from pick rate, win rate, kit, tier, enemies, owned items | 04 |
| F22 | Re-roll when a fresh draw beats this set and beats saving the re-roll | 04 |
| F23 | Teal plate and circle on the card to take | 08 |
| F24 | Teal RE-ROLL plate on the Use Re-Roll button | 08 |
| F25 | Hover breakdown that adds up to the score | 08 |
| F26 | My Picks gold ring and ALT ring, scores unchanged | 06, 08 |
| F27 | Enhanced bonus shown on the plate and in the breakdown | 04, 08 |
| F28 | Ability-points picture for 15 s after the draft closes | 05 |
| F29 | Per-hero ability order the player can edit | 05 |
| F30 | Draft advisor tab | 05 |
| F31 | My Picks tab: two tiers, edit, import | 06 |
| F32 | Bundled default lists, including Violet Scarlet 9X v2 and oses | 06, 10 |
| F33 | Street Brawl Tier List tab, grades S A B C | 07 |
| F34 | First-run check | 05 |
| F35 | Test mode with a dummy Deadlock window and screenshots | 05 |
| F36 | Problem sentences for black capture, small window, denied capture, F8 taken | 05 |
| F37 | Name reader down: status line, grey plates, hero fallback | 03, 05 |
| F38 | Lobby status dot | 08 |
| F39 | Debug panel on Ctrl+Shift+D in development and release-candidate builds | 05 |
| F40 | Test-mode video, development builds, started only by a person | 05 |
| F41 | Settings survive in %APPDATA%\deadlock-street-brawl-helper | 09 |
| F42 | Portable exe and installer; preload is CommonJS | 09 |
| F43 | Offline snapshot built from public Deadlock APIs | 10 |
| F44 | Resync when the round or choice jumps | 03, 05 |
| F45 | Owned items read from the draft inventory grid | 03 |
| F46 | Plate hover from a cursor poll, not a global mouse hook | 08 |
| F47 | This app's process priority stays below normal | 03 |
| F48 | A crash in the page shows Reload, not a blank window | 05 |
| F49 | Tier list says how old its snapshot is | 07 |
| F50 | Capturing the game draws no yellow border | 03, 09 |

## Document map

| File | Contents |
| --- | --- |
| [01-product.md](01-product.md) | What the app is, what it must never do, builds |
| [02-shell.md](02-shell.md) | Windows, tray, hotkeys |
| [03-capture.md](03-capture.md) | When capture runs, what is read, timing |
| [04-scoring.md](04-scoring.md) | Grades, scores, re-roll |
| [05-advisor-ui.md](05-advisor-ui.md) | Draft advisor, ability order, first run, debug, test mode |
| [06-my-picks.md](06-my-picks.md) | Two-tier lists, highlights, import, defaults |
| [07-tier-list.md](07-tier-list.md) | S/A/B/C tab |
| [08-overlay.md](08-overlay.md) | What is drawn on the game |
| [09-persistence-packaging.md](09-persistence-packaging.md) | Saved state and the Windows build |
| [10-data.md](10-data.md) | Every data set and where to get it |
| [11-acceptance.md](11-acceptance.md) | Black-box checks |
| [UPGRADES.md](UPGRADES.md) | Improvements after parity |

## Wording rule for the app

Sentences the app shows the player, in the control window, the overlay, the tray, and the readme that ships with the app, must not contain an exclamation mark, an emoji, an em dash, an arrow, or a middle dot. A check mark used as a tick, and the diamond used on an ability pill, are allowed. This specification may use ordinary punctuation.
