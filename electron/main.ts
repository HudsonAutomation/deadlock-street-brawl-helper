import { app, BrowserWindow, Tray, Menu, globalShortcut, screen, desktopCapturer, session, ipcMain, nativeImage } from 'electron'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CHANNELS, devChannels } from './channels'
import { startReader, type ReaderHandle } from './reader'
import { log } from '../src/core/log'
import { SETTINGS_DIR_NAME } from '../src/core/storage'
import { restoreBounds, type Rect } from '../src/core/bounds'

const devTools = __DEV_TOOLS__
const e2e = process.env.BRAWL_E2E === '1'
const devServer = process.env.VITE_DEV_SERVER_URL

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,AllowWgcWindowCapturer')

const userData = join(app.getPath('appData'), SETTINGS_DIR_NAME)
app.setPath('userData', userData)
app.setName(SETTINGS_DIR_NAME)

let control: BrowserWindow | null = null
let overlay: BrowserWindow | null = null
let dummy: BrowserWindow | null = null
let tray: Tray | null = null
let overlaySuppressed = false
let debugOn = devTools
let f8Registered = false
let f8Taken = false
let captureWanted = false
let captureDenied = false
let gameBounds: Rect | null = null
let gameForeground = false
let testMode = false
let reader: ReaderHandle
let writeLockHeld = false
let lastOverlay: unknown = null

function windowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function readWindowState(): Rect | null {
  try {
    const parsed = JSON.parse(readFileSync(windowStatePath(), 'utf8')) as Rect
    if ([parsed.x, parsed.y, parsed.width, parsed.height].every((n) => typeof n === 'number')) return parsed
  } catch {
    /* a missing or broken file uses the default */
  }
  return null
}

function claimWriteLock(): boolean {
  const path = join(app.getPath('userData'), 'write.lock')
  try {
    mkdirSync(app.getPath('userData'), { recursive: true })
    if (existsSync(path)) {
      const other = Number(readFileSync(path, 'utf8'))
      if (other && other !== process.pid) {
        try {
          process.kill(other, 0)
          return false
        } catch {
          /* the other process is gone */
        }
      }
    }
    writeFileSync(path, String(process.pid))
    writeLockHeld = true
    return true
  } catch {
    return false
  }
}

function saveWindowState(bounds: Rect): void {
  if (!writeLockHeld || e2e || testMode) return
  try {
    writeFileSync(windowStatePath(), JSON.stringify(bounds))
  } catch {
    /* keep the in-memory bounds */
  }
}

function pageUrl(name: string): string {
  if (devServer) return `${devServer}/${name}`
  return `file://${join(app.getAppPath(), 'dist', 'renderer', name)}`
}

function createControl(): BrowserWindow {
  const displays = screen.getAllDisplays().map((display) => display.workArea)
  const bounds = restoreBounds(readWindowState(), displays, e2e, false)
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 360,
    minHeight: 300,
    frame: false,
    show: false,
    backgroundColor: '#101314',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(app.getAppPath(), 'dist', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  win.setMenuBarVisibility(false)
  if (e2e) {
    win.setOpacity(0)
    win.showInactive()
  } else {
    win.show()
  }
  void win.loadURL(pageUrl('index.html'))
  let saveTimer: NodeJS.Timeout | null = null
  const remember = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveWindowState(win.getBounds()), 500)
  }
  win.on('move', remember)
  win.on('resize', remember)
  win.on('closed', () => {
    control = null
    app.quit()
  })
  return win
}

function createOverlay(): BrowserWindow {
  const win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(app.getAppPath(), 'dist', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  win.setIgnoreMouseEvents(true)
  win.setAlwaysOnTop(true, 'screen-saver')
  if (e2e) win.setOpacity(0)
  void win.loadURL(pageUrl('overlay.html'))
  win.on('closed', () => {
    overlay = null
  })
  return win
}

function showOverlay(show: boolean): void {
  if (overlaySuppressed || !show) {
    overlay?.hide()
    return
  }
  if (!overlay || overlay.isDestroyed()) overlay = createOverlay()
  if (gameBounds) overlay.setBounds(gameBounds)
  overlay.setAlwaysOnTop(true, 'screen-saver')
  if (e2e) overlay.showInactive()
  else if (!overlay.isVisible()) overlay.showInactive()
}

function send(channel: string, payload: unknown): void {
  if (control && !control.isDestroyed()) control.webContents.send(channel, payload)
}

function publishCapture(): void {
  send(CHANNELS.captureState, { wanted: captureWanted, denied: captureDenied, reason: captureDenied ? 'denied' : null })
}

function registerF8(hasGame: boolean): void {
  if (!hasGame) {
    if (f8Registered) globalShortcut.unregister('F8')
    f8Registered = false
    f8Taken = false
    return
  }
  if (f8Registered) return
  f8Registered = globalShortcut.register('F8', () => send(CHANNELS.detectNow, { from: 'hotkey' }))
  f8Taken = !f8Registered
  if (f8Taken) log('hotkey.f8', { taken: true })
}

function buildTray(): Tray {
  const iconPath = join(app.getAppPath(), 'build', 'icon.png')
  const image = existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
  const icon = new Tray(image.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') : image)
  icon.setToolTip('Deadlock Street Brawl Helper')
  const refresh = () => {
    const items: Electron.MenuItemConstructorOptions[] = [
      { label: 'Toggle overlay', click: () => send(CHANNELS.overlayToggle, {}) },
      { label: 'Detect now (F8)', click: () => send(CHANNELS.detectNow, { from: 'tray' }) },
    ]
    const dev = devChannels()
    if (dev) items.push({ label: 'Debug panel', click: () => send(dev.debugToggle, {}) })
    items.push(
      { label: 'First-run check', click: () => send(CHANNELS.firstRun, {}) },
      { label: testMode ? 'Turn test mode off' : 'Toggle test mode', click: () => send(CHANNELS.testMode, {}) },
      { label: 'Quit', click: () => app.quit() },
    )
    icon.setContextMenu(Menu.buildFromTemplate(items))
  }
  refresh()
  icon.on('click', refresh)
  return icon
}

function findGame(): { hwnd: number; bounds: Rect; title: string; caption: boolean } | null {
  if (testMode && dummy && !dummy.isDestroyed()) {
    return { hwnd: -1, bounds: dummy.getBounds(), title: 'Deadlock', caption: false }
  }
  if (process.platform !== 'win32') return null
  const packaged = join(process.resourcesPath ?? '', 'find-window.ps1')
  const script = existsSync(packaged) ? packaged : join(app.getAppPath(), 'electron', 'find-window.ps1')
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2500,
    })
    const row = JSON.parse(out) as { hwnd?: number; x?: number; y?: number; width?: number; height?: number; caption?: boolean }
    if (!row.hwnd || row.width == null || row.height == null || row.x == null || row.y == null) return null
    return {
      hwnd: row.hwnd,
      bounds: { x: row.x, y: row.y, width: row.width, height: row.height },
      title: 'Deadlock',
      caption: Boolean(row.caption),
    }
  } catch {
    return null
  }
}

function installDisplayHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    const target = testMode ? dummy : control
    void request
    if (testMode && dummy && !dummy.isDestroyed()) {
      callback({ video: { id: dummy.getMediaSourceId(), name: 'Deadlock' } as Electron.DesktopCapturerSource })
      return
    }
    desktopCapturer.getSources({ types: ['window'] }).then((sources) => {
      const game = sources.find((source) => source.name === 'Deadlock')
      if (!game || (testMode && target)) {
        captureDenied = !game
        publishCapture()
        send(CHANNELS.game, { kind: 'found', title: game ? 'Deadlock' : undefined })
        callback({})
        return
      }
      callback({ video: game })
    }).catch(() => {
      captureDenied = true
      publishCapture()
      callback({})
    })
  })
}

app.whenReady().then(() => {
  claimWriteLock()
  reader = startReader(process.platform === 'win32', devTools)
  control = createControl()
  overlay = createOverlay()
  tray = buildTray()
  installDisplayHandler()
  const overlayKey = globalShortcut.register('CommandOrControl+Shift+O', () => {
    overlaySuppressed = !overlaySuppressed
    if (overlaySuppressed) overlay?.hide()
    else showOverlay(true)
    send(CHANNELS.overlayToggle, { suppressed: overlaySuppressed })
  })
  if (!overlayKey) log('hotkey.overlay', { registered: false })
  registerF8(false)
  if (process.platform !== 'win32') {
    send(CHANNELS.game, { kind: 'lost' })
    log('platform.unsupported', { platform: process.platform })
  }
  if (!e2e && process.platform === 'win32') {
    setTimeout(() => {
      try {
        spawn('powershell.exe', ['-NoProfile', '-Command', `$p = Get-Process -Id ${process.pid}; $p.PriorityClass = 'BelowNormal'`], {
          windowsHide: true,
        })
      } catch {
        /* priority is a courtesy */
      }
    }, 3000)
  }
  ipcMain.on(CHANNELS.minimise, () => control?.minimize())
  ipcMain.on(CHANNELS.close, () => app.quit())
  ipcMain.on(CHANNELS.quit, () => app.quit())
  ipcMain.on(CHANNELS.overlayToggle, () => {
    overlaySuppressed = !overlaySuppressed
    if (overlaySuppressed) overlay?.hide()
    else showOverlay(true)
  })
  ipcMain.on(CHANNELS.detectNow, () => {
    captureWanted = true
    captureDenied = false
    publishCapture()
  })
  ipcMain.on(CHANNELS.firstRun, () => send(CHANNELS.firstRun, {}))
  ipcMain.on(CHANNELS.testMode, () => toggleTestMode())
  const dev = devChannels()
  if (dev) {
    ipcMain.on(dev.debugToggle, () => {
      debugOn = !debugOn
      send(dev.debugToggle, { on: debugOn })
    })
  }
  ipcMain.handle(CHANNELS.captureStateGet, () => ({ wanted: captureWanted, denied: captureDenied, reason: null }))
  ipcMain.handle(CHANNELS.readerStateGet, () => ({ status: reader?.status ?? 'off' }))
  ipcMain.handle(CHANNELS.readerRetry, async () => {
    await reader?.retry()
    return { status: reader?.status ?? 'off' }
  })
  ipcMain.handle(CHANNELS.readText, async (_event, crop: { id: string; width: number; height: number; rgba: string }) => {
    if (!reader || reader.status === 'failed' || reader.status === 'off') throw new Error('Name reader not running')
    return reader.read(crop.id, crop.width, crop.height, crop.rgba)
  })
  ipcMain.handle(CHANNELS.settingsGet, () => ({ userData: app.getPath('userData'), window: readWindowState() }))
  ipcMain.on(CHANNELS.windowState, (_event, bounds: Rect) => saveWindowState(bounds))
  ipcMain.on(CHANNELS.overlay, (_event, state: unknown) => {
    lastOverlay = state
    const row = state as { visible?: boolean }
    showOverlay(Boolean(row?.visible))
    if (overlay && !overlay.isDestroyed()) overlay.webContents.send(CHANNELS.overlay, state)
  })
  ipcMain.on(CHANNELS.overlayDrawn, () => log('overlay.drawn', {}))
  ipcMain.handle(CHANNELS.importBuild, async (_event, body: { buildId: number; version: number }) => {
    const url = `https://api.deadlock-api.com/v1/builds?build_id=${body.buildId}&version=${body.version}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) return { ok: false, message: 'The build could not be imported.' }
    const json = (await response.json()) as { hero_build?: { hero_id?: number } }[]
    return { ok: true, message: 'imported', list: json[0] ?? null }
  })
  ipcMain.handle(CHANNELS.dotGet, () => ({ show: Boolean(gameBounds) && gameForeground, mode: captureWanted ? 'reading' : 'watching' }))
  ipcMain.handle(CHANNELS.f8State, () => ({ registered: f8Registered, taken: f8Taken }))
  ipcMain.on(CHANNELS.testFrame, (_event, name: string) => {
    if (dummy && !dummy.isDestroyed()) void dummy.loadURL(`${pageUrl('frame.html')}?name=${encodeURIComponent(name)}`)
    send(CHANNELS.testFrame, { name })
  })
  if (dev) {
    ipcMain.handle(dev.readerPid, () => reader?.pid() ?? null)
    ipcMain.handle(dev.sessions, () => [])
    ipcMain.handle(dev.saveDraft, async (_event, payload: unknown) => {
      const dir = join(app.getPath('userData'), 'saved-drafts')
      mkdirSync(dir, { recursive: true })
      const file = join(dir, `draft-${Date.now()}.json`)
      writeFileSync(file, JSON.stringify(payload))
      return file
    })
  }
  let sawGame = false
  setInterval(() => {
    if (overlay && overlay.isVisible()) overlay.setAlwaysOnTop(true, 'screen-saver')
    const found = findGame()
    registerF8(Boolean(found))
    if (found) {
      gameBounds = found.bounds
      gameForeground = true
      if (!sawGame) send(CHANNELS.game, { kind: 'found', title: 'Deadlock', bounds: found.bounds, borderless: !found.caption, tooSmall: found.bounds.width < 1280 || found.bounds.height < 720 })
      sawGame = true
    } else if (sawGame) {
      sawGame = false
      gameBounds = null
      gameForeground = false
      send(CHANNELS.game, { kind: 'lost' })
    }
  }, 2000)
  log('app.ready', { version: __APP_VERSION__, devTools, userData: app.getPath('userData') })
})

function toggleTestMode(): void {
  if (testMode) {
    dummy?.close()
    dummy = null
    testMode = false
    send(CHANNELS.testMode, { on: false })
    return
  }
  dummy = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    title: 'Deadlock',
    show: !e2e,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  })
  dummy.setTitle('Deadlock')
  testMode = true
  if (e2e) dummy.setAlwaysOnTop(false)
  void dummy.loadURL(`${pageUrl('frame.html')}?name=choice1`)
  send(CHANNELS.testMode, { on: true })
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  reader?.stop()
  if (writeLockHeld) {
    const path = join(app.getPath('userData'), 'write.lock')
    try {
      if (existsSync(path) && readFileSync(path, 'utf8') === String(process.pid)) writeFileSync(path, '')
    } catch {
      /* leaving the lock is harmless once the process is gone */
    }
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

void lastOverlay
