import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, devChannels } from './channels'

const devTools = __DEV_TOOLS__

function listen(channel: string, cb: (payload: unknown) => void): () => void {
  const listener = (_event: unknown, payload: unknown) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  isE2E: process.env.BRAWL_E2E === '1',
  platform: process.platform,
  version: __APP_VERSION__,
  devTools,
  minimise: () => ipcRenderer.send(CHANNELS.minimise),
  close: () => ipcRenderer.send(CHANNELS.close),
  toggleOverlay: () => ipcRenderer.send(CHANNELS.overlayToggle),
  detectNow: () => ipcRenderer.send(CHANNELS.detectNow),
  openFirstRun: () => ipcRenderer.send(CHANNELS.firstRun),
  toggleTestMode: () => ipcRenderer.send(CHANNELS.testMode),
  quit: () => ipcRenderer.send(CHANNELS.quit),
  getCaptureState: () => ipcRenderer.invoke(CHANNELS.captureStateGet),
  onCaptureState: (cb: (payload: unknown) => void) => listen(CHANNELS.captureState, cb),
  readText: (crop: unknown) => ipcRenderer.invoke(CHANNELS.readText, crop),
  onReaderState: (cb: (payload: unknown) => void) => listen(CHANNELS.readerState, cb),
  getReaderState: () => ipcRenderer.invoke(CHANNELS.readerStateGet),
  retryReader: () => ipcRenderer.invoke(CHANNELS.readerRetry),
  onGame: (cb: (payload: unknown) => void) => listen(CHANNELS.game, cb),
  onOverlay: (cb: (payload: unknown) => void) => listen(CHANNELS.overlay, cb),
  pushOverlay: (state: unknown) => ipcRenderer.send(CHANNELS.overlay, state),
  overlayDrawn: () => ipcRenderer.send(CHANNELS.overlayDrawn),
  getSettings: () => ipcRenderer.invoke(CHANNELS.settingsGet),
  saveWindowState: (bounds: unknown) => ipcRenderer.send(CHANNELS.windowState, bounds),
  importBuild: (buildId: number, version: number) => ipcRenderer.invoke(CHANNELS.importBuild, { buildId, version }),
  setFrame: (name: string) => ipcRenderer.send(CHANNELS.testFrame, name),
  getDot: () => ipcRenderer.invoke(CHANNELS.dotGet),
  roundStart: (round: number) => ipcRenderer.send(CHANNELS.roundStart, round),
  forceCaptureOff: () => ipcRenderer.send(CHANNELS.captureOff),
  getF8: () => ipcRenderer.invoke(CHANNELS.f8State),
  ...(devChannels()
    ? {
        toggleDebug: () => ipcRenderer.send(devChannels()!.debugToggle),
        playTestVideo: (file: string) => ipcRenderer.send(devChannels()!.testVideo, { action: 'open', file }),
        testVideoAction: (action: string, value?: number) => ipcRenderer.send(devChannels()!.testVideo, { action, value }),
        saveDraft: (payload: unknown) => ipcRenderer.invoke(devChannels()!.saveDraft, payload),
        listSessions: () => ipcRenderer.invoke(devChannels()!.sessions),
        markWrong: (id: string) => ipcRenderer.invoke(devChannels()!.markWrong, id),
        forceReroll: () => ipcRenderer.send(devChannels()!.forceReroll),
        readerPid: () => ipcRenderer.invoke(devChannels()!.readerPid),
        detectNowHook: () => ipcRenderer.send(CHANNELS.detectNow),
      }
    : {}),
}

contextBridge.exposeInMainWorld('brawlAPI', api)
