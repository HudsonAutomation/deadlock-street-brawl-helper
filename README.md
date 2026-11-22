# Deadlock Street Brawl Helper

A Windows overlay that reads a Street Brawl item draft and ranks the three cards. It does not open, patch, or inject the game. Advice is computed from a snapshot stored with the app.

SmartScreen will warn because the build is not code-signed. Choose More info, then Run anyway.

## Run

- Windows, Node 20 or newer. The release workflow uses Node 24.
- `npm install`
- `npm run fetch-data` builds the offline snapshot from `https://api.deadlock-api.com`. The window is the 2026-10-30 patch through 2026-11-03.
- `npm run dev` starts the control window in a browser. The desktop app is `npx electron .` after `npm run build`.
- Settings stay in `%APPDATA%\deadlock-street-brawl-helper`.

## Advice without a screen

```
npm run brawl -- --hero 1 --round 2 --choice 1 --set "Improved Spirit, Enchanter's Emblem, Swift Striker"
```

## Hotkeys

- Ctrl+Shift+O hides and shows the overlay.
- F8 reads the draft now, and only while Deadlock or the test-mode window is open.
- Ctrl+Shift+D toggles the debug panel in a development or release-candidate build.

Borderless Windowed is the mode the overlay can draw over. Exclusive fullscreen may not show the overlay. That is a Windows limit. If capture stays black, switch Display Mode to Borderless Windowed.
