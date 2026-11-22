/** IPC channel names. The preload build imports this module too. */

export const CHANNELS = {
  minimise: 'window-minimise',
  close: 'window-close',
  overlayToggle: 'overlay-toggle',
  detectNow: 'detect-now',
  debugToggle: 'debug-toggle',
  firstRun: 'first-run',
  testMode: 'test-mode',
  quit: 'quit',
  captureState: 'capture-state',
  captureStateGet: 'capture-state-get',
  readText: 'read-text',
  readerState: 'reader-state',
  readerStateGet: 'reader-state-get',
  readerRetry: 'reader-retry',
  game: 'game-event',
  overlay: 'overlay-state',
  overlayDrawn: 'overlay-drawn',
  settingsGet: 'settings-get',
  windowState: 'window-state',
  importBuild: 'import-build',
  testFrame: 'test-frame',
  dotGet: 'dot-get',
  roundStart: 'round-start',
  captureOff: 'capture-off',
  f8State: 'f8-state',
  cursor: 'overlay-cursor',
} as const

/** Names that exist only in a development or release-candidate build. */
export function devChannels(): {
  debugToggle: string
  testVideo: string
  saveDraft: string
  sessions: string
  markWrong: string
  forceReroll: string
  readerPid: string
} | null {
  if (!__DEV_TOOLS__) return null
  return {
    debugToggle: 'debug-toggle',
    testVideo: 'test-video',
    saveDraft: 'save-draft',
    sessions: 'sessions',
    markWrong: 'mark-wrong',
    forceReroll: 'force-reroll',
    readerPid: 'reader-pid',
  }
}
