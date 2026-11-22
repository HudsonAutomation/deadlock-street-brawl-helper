/** When full capture is allowed to run. The probe is a tiny read, not a capture. */

export const IDLE_STOP_MS = 4000
export const PROBE_QUIET_MS = 30000
export const RETRY_MS = 2000
export const DETECT_TIMEOUT_MS = 4000
export const MISS_FRAMES = 3
export const BLACK_MS = 10000

export interface CapturePolicy {
  wanted: boolean
  holdOff: boolean
  quietUntil: number
  probeSawDraft: boolean
  denied: boolean
  missStreak: number
  detectStarted: number | null
}

export function freshCapture(): CapturePolicy {
  return {
    wanted: false,
    holdOff: false,
    quietUntil: 0,
    probeSawDraft: false,
    denied: false,
    missStreak: 0,
    detectStarted: null,
  }
}

export function probeHit(state: CapturePolicy, now: number, cardsLit: boolean): CapturePolicy {
  if (state.holdOff) return state
  if (now < state.quietUntil && !cardsLit) return { ...state, probeSawDraft: true }
  return { ...state, wanted: true, probeSawDraft: true, holdOff: false }
}

export function probeMiss(state: CapturePolicy): CapturePolicy {
  return { ...state, probeSawDraft: false, quietUntil: 0 }
}

export function idleStop(state: CapturePolicy, now: number): CapturePolicy {
  return { ...state, wanted: false, quietUntil: now + PROBE_QUIET_MS, probeSawDraft: false }
}

export function detectStart(state: CapturePolicy, now: number): CapturePolicy {
  return { ...state, wanted: true, holdOff: false, detectStarted: now, missStreak: 0, denied: false }
}

export function detectFrame(state: CapturePolicy, isDraft: boolean, now: number): CapturePolicy {
  if (state.detectStarted == null) return state
  if (isDraft) return { ...state, detectStarted: null, missStreak: 0, wanted: true, holdOff: false }
  const missStreak = state.missStreak + 1
  if (missStreak >= MISS_FRAMES) {
    return { ...state, wanted: false, holdOff: true, detectStarted: null, missStreak: 0 }
  }
  if (now - state.detectStarted >= DETECT_TIMEOUT_MS) {
    return { ...state, wanted: false, holdOff: true, detectStarted: null, missStreak: 0 }
  }
  return { ...state, missStreak }
}

export function releaseHold(state: CapturePolicy): CapturePolicy {
  return { ...state, holdOff: false }
}

export function markDenied(state: CapturePolicy): CapturePolicy {
  return { ...state, denied: true, wanted: false }
}
