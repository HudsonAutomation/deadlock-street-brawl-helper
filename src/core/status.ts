/** One status sentence, then at most one problem, most blocking first. */

export interface StatusInput {
  platformOk: boolean
  resync: string | null
  heroSource: 'pinned' | 'loading' | 'portrait' | 'window'
  heroName: string
  gameFound: boolean
  testMode: boolean
  draftUp: boolean
  advising: boolean
  detecting: boolean
  detectMiss: boolean
  readerDown: boolean
  black: boolean
  tooSmall: boolean
  captureDenied: boolean
  f8Taken: boolean
}

export function statusLine(input: StatusInput): string {
  if (!input.platformOk) return 'This build reads the draft on Windows. Capture is off here.'
  if (input.resync) return input.resync
  if (input.heroSource === 'portrait') return `Hero guessed from portraits: ${input.heroName}. Pick the hero to correct.`
  if (input.detecting) return 'Detecting…'
  if (input.detectMiss) return 'No draft found'
  if (!input.gameFound && !input.testMode) return 'Waiting for Deadlock'
  if (input.draftUp && !input.advising) return 'Reading'
  if (input.draftUp && input.advising) return 'Advising'
  if (input.gameFound || input.testMode) return 'Ready. Open a Street Brawl draft'
  return 'Waiting for Deadlock'
}

export function heroNotRead(input: StatusInput): string | null {
  if (!input.draftUp) return null
  if (input.heroSource === 'window') return `Hero not read. Using ${input.heroName}`
  return null
}

export function problemLine(input: StatusInput): string | null {
  if (input.black) return 'Capture reads black. If Deadlock is in Fullscreen, switch to Borderless Windowed'
  if (input.tooSmall) return 'The Deadlock window is too small to read. Make it at least 1280 by 720.'
  if (input.captureDenied) return 'Windows blocked the screen capture. Restart this app, then open the draft again.'
  if (input.f8Taken) return 'F8 is taken by another program. Close that program, or read from the tray menu.'
  return null
}

export function readerLine(input: StatusInput): string | null {
  return input.readerDown ? 'Name reader not running' : null
}

const BANNED = /[!→←·\u2014\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

export function wordingOk(text: string): boolean {
  return !BANNED.test(text)
}
