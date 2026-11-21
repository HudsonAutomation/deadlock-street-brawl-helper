# 02. Windows, tray, and hotkeys

## Control window

- Frameless. No operating-system title bar and no menu bar.
- The page draws a 32 px strip: app icon, the words `Deadlock Street Brawl Helper`, then minimise and close. In a development or release-candidate build the strip also shows `DEBUG` while the debug panel is enabled.
- The strip is the drag region. Minimise and close are not draggable.
- Minimise sends the window to the taskbar. Close quits the app, including the overlay and the tray.
- Default size 460 by 640, centred on the primary display. Minimum size 360 by 300.
- Background before the page paints is charcoal `#101314`, so the window never flashes white.
- The window is not throttled when it is covered. Capture and advice run in this window while the game is in front.
- Dragging must move the window and must not change its size. If the system resizes it mid-drag, put the previous size back.
- Position and size are saved about half a second after a move or resize, in the settings folder (see [09-persistence-packaging.md](09-persistence-packaging.md)). On the next launch, restore them when at least an 80 by 32 px piece of the title strip lies on a connected display. Otherwise use the default, centred. Skip restoring while an automated harness is running, and while test mode has temporarily resized the window.
- A second launch is a second process. There is no single-instance lock. Closing the control window quits. Closing the overlay does not. There is no close-to-tray.

## Overlay window

- Frameless, transparent, no shadow, not resizable, not in the taskbar, not focusable.
- Always on top, in the screen-saver topmost band. Put it back on top when it is shown, when the game moves, when the game becomes the foreground window, and about every 2 s while it is visible.
- Click-through for real mouse input. `ignore mouse events` stays on. Do not turn on mouse-event forwarding. Forwarding installs a system-wide low-level mouse hook, which changed aim feel in 0.5.1.
- Hover is a cursor poll, specified in [08-overlay.md](08-overlay.md).
- The overlay follows the game window's rectangle, converted from physical pixels to the display's DIP size. At 125 percent scaling, bounds reported after a move can differ by 1 or 2 px. That drift is acceptable. A growing drift is not.
- Hidden, not merely blank, unless it has something to draw (draft plates, the ability picture, or the lobby dot). See [08-overlay.md](08-overlay.md).
- If the player closes the overlay window, the next show recreates it. Test mode and Ctrl+Shift+O keep working.
- Ctrl+Shift+O does not destroy it. It only suppresses drawing and hides it until pressed again.
- Under an automated harness the control window and the overlay are fully painted at opacity 0 and never take focus. That is a test detail, not a player-facing mode.

## Tray

Tooltip: `Deadlock Street Brawl Helper`.

| Entry | Action |
| --- | --- |
| Toggle overlay | Same as Ctrl+Shift+O |
| Detect now (F8) | Same as F8 |
| Debug panel | Development and release-candidate builds only. Same as Ctrl+Shift+D |
| First-run check | Opens the first-run panel again |
| Toggle test mode | Opens or closes the dummy Deadlock window |
| Quit | Quits the app |

The tray icon is the app icon.

## Hotkeys

| Keys | When it is registered | What it does | If it cannot register |
| --- | --- | --- | --- |
| Ctrl+Shift+O (Command+Shift+O on a Mac keyboard mapping) | The whole time the app is running | Hides or shows the overlay. Hidden means the overlay is suppressed even if a draft is up. Showing again draws the current state. | No player-facing message is specified. |
| F8 | Only while a Deadlock window, or the test-mode dummy, exists. Unregister the moment that window is gone, so other programs can use F8. | Detect now. See below. | Show the problem `F8 is taken by another program. Close that program, or read from the tray menu.` The tray entry and the button still work. |
| Ctrl+Shift+D | Development and release-candidate builds only, and only while the control window is focused (it is a page shortcut, not a global one). The tray entry works even when the window is not focused. | Toggles the debug panel. | Absent in a final build. |

No other global shortcuts. F8 is not registered at launch if Deadlock is not open.

### Detect now

F8, the button labelled `Detect now (F8)`, and the tray entry are the same action.

1. Forget any "hold capture off" left by a previous miss.
2. Turn capture on immediately, even if the game is not the foreground window and even if the cheap probe has not seen a draft.
3. The verdict is not the first frame. The first captured frame is often blank. Three results in a row that are not a draft count as a miss: status `No draft found`, capture off, and capture held off until the next Detect now, a game-window change, or a test-mode picture change. A draft follows the normal advice path.
4. If no frame arrives within 4 s, the try has failed. The debug status is `capture failed: no frame received`.
5. Pressing F8 also forces the draft tracker to resync from the next frame's round and choice labels.

## Finding the game

- Match a top-level window whose title is exactly `Deadlock`. Do not match by substring. The control window is titled `Deadlock Street Brawl Helper` and must never be treated as the game.
- Cache the handle. Enumerate windows again only when that handle is gone. The cache must still honour an exclude set: while test mode is on, the real game is excluded and the dummy is the only target.
- While test mode is on, find, probe, capture, and move only the dummy. A real Deadlock may stay open and must be left alone. Turning test mode off hands the target back to the real game and closes only the dummy.
- Borderless and exclusive fullscreen both lack a caption style. Do not treat "no caption" as proof of exclusive fullscreen. The black-capture hint in [05-advisor-ui.md](05-advisor-ui.md) is the signal for "this looks like fullscreen".
- A framed window includes its title bar in the capture and is not 16:9, which shifts every anchor. Test windows and the expected game mode are borderless.

## Test-mode dummy, window side

Specified fully in [05-advisor-ui.md](05-advisor-ui.md). Shell requirements:

- Frameless window titled exactly `Deadlock`.
- 1920 by 1080 physical pixels. If the work area is smaller, the system may clamp it; the recogniser then cannot read, which is a known limit.
- On a real desktop it opens at the left of the work area and the control window fills the right. Closing test mode restores the control window's saved bounds. A harness does not move either window.
- The dummy stays opaque. A window with opacity below 1 is not offered to capture.
