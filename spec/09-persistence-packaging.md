# 09. Persistence and packaging

## Settings folder

Electron's user-data directory must stay:

`%APPDATA%\deadlock-street-brawl-helper`

on Windows. That is the continuity contract. A rewrite that picks a new folder, a new product name that Electron turns into a different folder, or a fresh partition will hide every saved window position, every My Picks edit, and every ability order. Existing players open the app and find their lists.

Chromium stores the page's local storage inside that folder. Keep the same origin and the same partition so those keys load.

Files in that folder:

| File | Who writes it | What it is |
| --- | --- | --- |
| `window-state.json` | Every build | `{x, y, width, height}` in DIP. Restore by the rule in [02-shell.md](02-shell.md). |
| `sessions/` | Development builds | Last 3 matches, crops only, 300 MB, oldest first. |
| `test-video.json` | Development builds | Last video path. |
| `video-latency.json` | Development video runs | One row per advised set. |
| `detect-frame.png` | When a manual detect saves a frame for diagnosis | Not required for parity of advice. |

Do not migrate by copying unless the folder name would otherwise change. Matching the folder name is the migration.

## Page keys

Prefix `brawl.` except the debug flag. Validate on read. A broken value falls back to the default. A write that fails (private mode, full disk) keeps the value for this session.

| Key | Contents | Default |
| --- | --- | --- |
| `brawl.heroId` | Number, the selected hero | 1 (Infernus) |
| `brawl.tab` | `advisor`, `picks`, or `tiers` | `advisor` |
| `brawl.round` | Last round selected in the debug controls, 1 to 5. Choice is not stored. | 1 |
| `brawl.enemies` | Four hero ids. 0 means that slot is empty. | Four zeros |
| `brawl.myPicks` | Enabled flag, fallback hero id, and per-hero edits | On, fallback hero 86, no edits |
| `brawl.customOrders` | Map of hero id to 12 integers | Empty |
| `brawl.firstRunDone` | The first-run panel was dismissed | Absent, so the panel shows |
| `brawlDebug` | `1` enables verbose logs in the page | Off |

My Picks edits store the whole list for that hero once the player changes it. Until then the bundled default is used and is not copied into the key. Reset deletes that hero's edit. An imported list is an edit.

A custom order of 12 integers, each 0 through 5, is accepted. 0 means not bought. Orders saved before 0 existed are all in 1..5 and still load.

## Packaging

- Windows only for the release artifacts: a portable executable and an NSIS installer. The installer is not one-click and lets the player choose the directory.
- Application id `com.deadlockstreetbrawl.helper`. Product name `Deadlock Street Brawl Helper`.
- The preload script that the sandbox loads must be CommonJS (`preload.cjs`). The sandbox rejects an ES module preload. If the preload is ESM, the page bridge never appears and capture, the tray actions, and the title-bar buttons do nothing. This is a release blocker.
- The window process is an ES module. A CommonJS harness loads it with a dynamic import of a file URL, not with require.
- Ship the OCR helper beside the archive as an extra resource, not only inside it, so a packaged app can start it.
- Native bindings that the window finder needs are unpacked from the archive.
- Icon from the app's icon file.
- The files are not code-signed. The readme tells the player that SmartScreen will warn, and to choose More info, then Run anyway.
- A release is a version tag `v*`. The release workflow builds the portable exe and the installer on a Windows runner and attaches them to the GitHub release. There is no web deploy.
- Node 20 or newer to work on the app. The release workflow uses Node 24. Package installs use npm.

## Process and capture flags in the packaged app

- Append the Chromium switch that disables `CalculateNativeWinOcclusion` and `AllowWgcWindowCapturer`, before the app is ready.
- Do not disable hardware acceleration for a normal launch. That is a harness-only workaround and makes the overlay lose to the game.
- Context isolation on, node integration off, in both windows.
- Lower priority after launch, as in [03-capture.md](03-capture.md).

## What a final build leaves out

Session recorder, debug panel, Ctrl+Shift+D, test video, performance timing, and any test hook on the window object. Test mode with still pictures and the first-run check stay.

## Logging

JSON lines to the console. No secrets, no screen dumps in the ordinary log. A detect-now failure may write one diagnostic image under the settings folder. That image is local.
