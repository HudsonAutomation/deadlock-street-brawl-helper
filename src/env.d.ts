declare const __DEV_TOOLS__: boolean
declare const __APP_VERSION__: string

interface Window {
  brawlAPI?: BrawlApi
  __overlayDrawn?: DrawnRect[]
}

interface BrawlApi {
  isE2E: boolean
  platform: string
  version: string
  devTools: boolean
  minimise(): void
  close(): void
  toggleOverlay(): void
  detectNow(): void
  toggleDebug(): void
  openFirstRun(): void
  toggleTestMode(): void
  quit(): void
  getCaptureState(): Promise<CaptureState>
  onCaptureState(cb: (state: CaptureState) => void): () => void
  readText(crop: { id: string; width: number; height: number; rgba: string }): Promise<{ id: string; text: string; ms: number }>
  onReaderState(cb: (state: ReaderState) => void): () => void
  getReaderState(): Promise<ReaderState>
  retryReader(): Promise<ReaderState>
  onGame(cb: (game: GameEvent) => void): () => void
  onOverlay(cb: (state: unknown) => void): () => void
  pushOverlay(state: unknown): void
  overlayDrawn(): void
  getSettings(): Promise<SettingsFile>
  saveWindowState(bounds: Bounds): void
  importBuild(buildId: number, version: number): Promise<ImportResult>
  setFrame(name: string): void
  playTestVideo(file: string): void
  testVideoAction(action: string, value?: number): void
  saveDraft(payload: unknown): Promise<string>
  listSessions(): Promise<SessionRow[]>
  markWrong(id: string): Promise<void>
  getDot(): Promise<DotState>
  roundStart(round: number): void
  forceReroll(): void
  readerPid(): Promise<number | null>
  detectNowHook(): void
  forceCaptureOff(): void
  getF8(): Promise<{ registered: boolean; taken: boolean }>
}

interface CaptureState {
  wanted: boolean
  denied: boolean
  reason: string | null
}

interface ReaderState {
  status: 'starting' | 'ready' | 'failed' | 'off'
  detail?: string
}

interface GameEvent {
  kind: 'found' | 'lost' | 'rect' | 'probe' | 'loading' | 'round' | 'black' | 'foreground'
  title?: string
  bounds?: Bounds
  foreground?: boolean
  round?: number
  black?: boolean
  loading?: { rgba: string; width: number; height: number }
  tooSmall?: boolean
  borderless?: boolean | null
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

interface SettingsFile {
  userData: string
  window: Bounds | null
}

interface ImportResult {
  ok: boolean
  message: string
  list?: unknown
}

interface SessionRow {
  id: string
  items: string[]
  plates: string[]
  adviceMs: number | null
  wrong: boolean
}

interface DotState {
  show: boolean
  mode: 'watching' | 'reading' | 'failed'
}

interface DrawnRect {
  tag: 'card' | 'best' | 'reroll' | 'plate'
  x: number
  y: number
  w: number
  h: number
  item?: string
}
