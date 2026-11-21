# 01. Product

## What it is

Deadlock Item Assist is a Windows desktop app for Valve's game Deadlock, and only for the Street Brawl mode. While the player is in a Street Brawl item draft, the app reads the screen, ranks the three offered cards for the player's hero, and says whether to take one or to re-roll. The advice is drawn on top of the draft. The control window is a separate small window the player can look at between fights.

The product name on the window, the tray tooltip, and the installer is **Deadlock Street Brawl Helper**. The internal package name that decides the settings folder is `deadlock-street-brawl-helper` (see [09-persistence-packaging.md](09-persistence-packaging.md)).

The current shipping version is 0.6.0. A version string that ends in `-rc` is a release candidate. Development runs and release candidates include the debug panel. A final build such as 0.6.0 does not.

## What the player can do

1. Leave the app running. It finds Deadlock by itself.
2. Play a Street Brawl match in Borderless Windowed. Advice appears over each draft.
3. Press F8 if the draft is up and the app has not noticed.
4. Press Ctrl+Shift+O to hide or show the overlay.
5. Correct the hero, edit an ability order, turn My Picks on or off, import a public build, and browse the tier list, all in the control window.
6. With no game open, use the tray's First-run check and Show me to see the overlay on a built-in draft picture.

## What it must never do

- Modify, replace, or read Deadlock's install files.
- Inject code, read process memory, hook the game's input for gameplay, or send packets to the game.
- Send the player's screen, hero, items, or account anywhere. The only network use is optional: importing a public build when the player presses Import, and (in development tooling) fetching a missing ability-order statistic. Advice itself is computed from a snapshot stored with the app.
- Fall back to capturing some other window when Deadlock is not the capture target.
- Draw a yellow outline around the game. Windows Graphics Capture does that; the app must capture in a way that does not.
- Install a system-wide low-level mouse hook. Hover is done by polling the cursor only while a draft or the lobby dot is showing.

## Platforms

- The supported runtime is Windows. The name reader is Windows.Media.Ocr.
- On any other operating system the window may open, but the status line must say the platform is unsupported, capture of a real game does not run, and the name reader is treated as not running.
- A display of at least 1920 by 1080 is required for the built-in test window to be readable. The smallest game window the app will try to read is 1280 by 720. Below that it shows the "too small" problem and does not pretend to advise.

## Three surfaces

1. **Control window.** Tabs, status, hero, ability order, and (in development builds) the debug panel.
2. **Overlay.** A transparent, click-through, topmost window that follows the game and draws plates, the reading sign, the re-roll mark, the ability picture, the lobby dot, and short notices.
3. **Tray icon.** Always present while the app is running. Closing the control window quits the app.

## Advice, in one paragraph

Street Brawl offers three cards, three times per round, for five rounds, with one re-roll per round. Cards are free. A rare card is one tier higher than the set's normal tier and stays rare if re-rolled. An enhanced card has better numbers and stays enhanced if re-rolled, and the enhancement survives a later upgrade. The app scores each readable card, marks the best one, and calls a re-roll when the expected best of a fresh draw of the same slots beats the best card on screen by more than the value of saving the re-roll for a later choice. My Picks highlights are decorations. They never change the score or the take or re-roll call.

## Builds the player can tell apart

| Build | Debug panel and Ctrl+Shift+D | Session recorder, test video, timing text on plates | Test mode with still pictures | First-run check |
| --- | --- | --- | --- | --- |
| Development, and any version ending `-rc` | On at launch. Title strip shows `DEBUG`. | Present | Present | Present |
| Final (0.6.0 and any version that is not `-rc` and not a dev run) | Absent. No tray entry. The shortcut does nothing. | Absent | Present | Present |

A final packaged build must not contain the development-only tooling. A practical check is that the packaged application archive has no development test hook, no debug-panel toggle channel, no session recorder, and no test-video control.
