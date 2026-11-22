/** When a draft set is stable enough to advise. Times are milliseconds. */

export const SETTLE_MS = 100
export const RELABEL_MS = 600
export const FALLBACK_MS = 1000
export const FALLBACK_READ_HOLD_MS = 200
export const FALLBACK_DIM_MS = 2000
export const YOUNG_MS = 250
export const REROLL_WINDOW_MS = 600
export const GRID_HOLD_MS = 600
export const TWIN_REREAD_MS = 300
export const FINGERPRINT_CELLS = 6

export interface SlotView {
  id: number | null
  fingerprint: string
  empty: boolean
  present: boolean
  dim: boolean
  covered: boolean
  enhanced: boolean
  rare: boolean
  readPending: boolean
  /** Grid cells changed since the lock fingerprint. */
  cellDelta: number
}

export interface GateInput {
  t: number
  round: number | null
  choice: number | null
  slots: [SlotView, SlotView, SlotView]
  rerolls: number | null
  ownedIds: number[]
  gridReliable: boolean
}

export interface Lock {
  id: number
  fingerprint: string
  at: number
  score: number
}

export interface AcceptedSet {
  key: string
  round: number
  choice: number
  ids: (number | null)[]
  enhanced: boolean[]
  spent: boolean
}

export interface GateState {
  locks: (Lock | null)[]
  firstCardAt: number | null
  agreeSince: number | null
  agreeKey: string | null
  fullSince: number | null
  labelKey: string | null
  labelSince: number | null
  accepted: AcceptedSet | null
  spent: Set<string>
  rerollSeenAt: number | null
  lastRerolls: number | null
  owned: number[]
  resync: { round: number; choice: number; at: number } | null
  trackedRound: number | null
  trackedChoice: number | null
  advice: AdviceView | null
  rereadAt: (number | null)[]
  captionVotes: { value: number; at: number }[]
  rerollsLeft: number | null
  matchOwnedCleared: boolean
}

export interface AdviceView {
  ids: (number | null)[]
  enhanced: boolean[]
  round: number
  choice: number
  unknown: boolean[]
  rerollsLeft: number | null
}

export function freshGate(): GateState {
  return {
    locks: [null, null, null],
    firstCardAt: null,
    agreeSince: null,
    agreeKey: null,
    fullSince: null,
    labelKey: null,
    labelSince: null,
    accepted: null,
    spent: new Set(),
    rerollSeenAt: null,
    lastRerolls: null,
    owned: [],
    resync: null,
    trackedRound: null,
    trackedChoice: null,
    advice: null,
    rereadAt: [null, null, null],
    captionVotes: [],
    rerollsLeft: null,
    matchOwnedCleared: false,
  }
}

function labels(frame: GateInput): string | null {
  if (frame.round == null || frame.choice == null) return null
  return `${frame.round}:${frame.choice}`
}

function identityKey(ids: (number | null)[]): string {
  return ids.map((id) => (id == null ? '?' : String(id))).join(',')
}

export function stepGate(state: GateState, frame: GateInput): GateState {
  const next: GateState = {
    ...state,
    locks: state.locks.map((lock) => (lock ? { ...lock } : null)),
    spent: new Set(state.spent),
    owned: state.owned.slice(),
    rereadAt: state.rereadAt.slice(),
    captionVotes: state.captionVotes.slice(),
    accepted: state.accepted ? { ...state.accepted, ids: state.accepted.ids.slice(), enhanced: state.accepted.enhanced.slice() } : null,
    advice: state.advice
      ? {
          ...state.advice,
          ids: state.advice.ids.slice(),
          enhanced: state.advice.enhanced.slice(),
          unknown: state.advice.unknown.slice(),
        }
      : null,
  }
  const present = frame.slots.filter((slot) => slot.present && !slot.empty).length
  const emptyCircles = frame.slots.filter((slot) => slot.empty).length
  if (present > 0 && next.firstCardAt == null) next.firstCardAt = frame.t
  if (emptyCircles >= 2) {
    next.advice = null
    next.agreeSince = null
    next.agreeKey = null
    next.fullSince = null
    next.firstCardAt = null
    return next
  }
  if (frame.round === 1 && frame.choice === 1 && !next.matchOwnedCleared) {
    next.owned = []
    next.matchOwnedCleared = true
  }
  if (frame.round != null && frame.round !== 1) next.matchOwnedCleared = false

  const rerollNow =
    frame.slots.filter((slot) => !slot.present || slot.empty).length >= 2 ||
    (frame.rerolls != null && next.lastRerolls != null && frame.rerolls < next.lastRerolls)
  if (rerollNow) next.rerollSeenAt = frame.t
  if (frame.rerolls != null) next.lastRerolls = considerCaption(next, frame)

  const inReroll = next.rerollSeenAt != null && frame.t - next.rerollSeenAt <= REROLL_WINDOW_MS
  const provisional: (number | null)[] = [null, null, null]
  frame.slots.forEach((slot, index) => {
    const lock = next.locks[index]
    if (slot.covered && lock) {
      provisional[index] = lock.id
      return
    }
    if (lock && slot.fingerprint === lock.fingerprint) {
      provisional[index] = lock.id
      return
    }
    if (lock && !inReroll && next.advice) {
      provisional[index] = lock.id
      return
    }
    if (lock && inReroll && slot.cellDelta > FINGERPRINT_CELLS) {
      next.locks[index] = null
    } else if (lock && slot.cellDelta <= 1 && slot.id == null) {
      provisional[index] = lock.id
      return
    }
    if (slot.id != null && !slot.covered) {
      const other = next.locks.find((held, otherIndex) => otherIndex !== index && held?.id === slot.id)
      if (other) {
        next.rereadAt[index] = frame.t + TWIN_REREAD_MS
        next.locks[index] = null
        provisional[index] = null
        return
      }
      const young = frame.t - (lock?.at ?? frame.t) < 500 && (lock?.score ?? 1) >= 0.9
      next.locks[index] = { id: slot.id, fingerprint: slot.fingerprint, at: frame.t, score: young ? 0.9 : 1 }
      provisional[index] = slot.id
    } else if (next.locks[index]) {
      provisional[index] = next.locks[index]!.id
    }
  })

  const label = labels(frame)
  if (label && label !== next.labelKey) {
    const backwards =
      next.trackedRound != null &&
      frame.round != null &&
      frame.choice != null &&
      (frame.round < next.trackedRound || (frame.round === next.trackedRound && frame.choice < (next.trackedChoice ?? 1)))
    const jumped =
      next.trackedRound != null &&
      frame.round != null &&
      frame.choice != null &&
      frame.round > next.trackedRound + (frame.choice === 1 && next.trackedChoice === 3 ? 1 : 0)
    if ((backwards || jumped) && next.trackedRound != null && frame.round != null && frame.choice != null) {
      next.resync = { round: frame.round, choice: frame.choice, at: frame.t }
    }
    next.labelKey = label
    next.labelSince = frame.t
    if (frame.round != null) next.trackedRound = frame.round
    if (frame.choice != null) next.trackedChoice = frame.choice
  }
  const key = `${label ?? '?'}|${identityKey(provisional)}`
  const named = provisional.every((id) => id != null)
  if (named && next.fullSince == null) next.fullSince = frame.t
  if (!named) next.fullSince = null
  if (key !== next.agreeKey) {
    next.agreeKey = key
    next.agreeSince = frame.t
  }
  const relabel = next.accepted != null && label != null && `${next.accepted.round}:${next.accepted.choice}` !== label
  const need = relabel || (next.accepted != null && label !== `${next.trackedRound}:${next.trackedChoice}`) ? RELABEL_MS : SETTLE_MS
  const held = next.agreeSince != null && frame.t - next.agreeSince >= (relabel ? RELABEL_MS : SETTLE_MS)
  const relabelWait = relabel && next.fullSince != null ? frame.t - next.fullSince >= RELABEL_MS : held
  void need
  const setKey = setIdentity(frame.round, frame.choice, provisional)
  const spent = setKey != null && next.spent.has(setKey)
  const fallback = fallbackDue(next, frame)
  const ready = named && (relabel ? relabelWait : held) && !spent
  if ((ready || fallback) && frame.round != null && frame.choice != null && !spent) {
    const ids = provisional.map((id, index) => id ?? (fallback ? null : next.locks[index]?.id ?? null))
    const enhanced = frame.slots.map((slot, index) => (next.advice && ids[index] === next.advice.ids[index] ? slot.enhanced || next.advice.enhanced[index] : slot.enhanced))
    const unknown = ids.map((id) => id == null)
    const same =
      next.advice &&
      next.advice.round === frame.round &&
      next.advice.choice === frame.choice &&
      identityKey(next.advice.ids) === identityKey(ids) &&
      enhanced.every((flag, index) => flag === next.advice!.enhanced[index])
    if (!same) {
      next.advice = { ids, enhanced, round: frame.round, choice: frame.choice, unknown, rerollsLeft: next.rerollsLeft }
      next.accepted = { key: setKey ?? key, round: frame.round, choice: frame.choice, ids, enhanced, spent: false }
    } else if (enhanced.some((flag, index) => flag && !next.advice!.enhanced[index])) {
      next.advice = { ...next.advice!, enhanced, ids, unknown }
    }
  }
  if (frame.gridReliable) {
    const fresh = frame.ownedIds.filter((id) => !next.owned.includes(id))
    if (next.accepted && fresh.some((id) => next.accepted!.ids.includes(id))) {
      next.spent.add(next.accepted.key)
      next.accepted.spent = true
      next.advice = null
    }
    if (fresh.length || frame.ownedIds.length !== next.owned.length) next.owned = frame.ownedIds.slice()
  }
  if (present === 0) next.firstCardAt = null
  return next
}

function setIdentity(round: number | null, choice: number | null, ids: (number | null)[]): string | null {
  if (round == null || choice == null) return null
  if (ids.every((id) => id == null)) return null
  return `${round}:${choice}:${identityKey(ids)}`
}

function considerCaption(state: GateState, frame: GateInput): number | null {
  if (frame.rerolls == null) return state.lastRerolls
  const votes = state.captionVotes.filter((vote) => frame.t - vote.at < 5000)
  const previous = votes[votes.length - 1]
  if (!previous || previous.value !== frame.rerolls) {
    votes.push({ value: frame.rerolls, at: frame.t })
  } else if (frame.t - previous.at >= 600) {
    state.rerollsLeft = frame.rerolls
  }
  state.captionVotes = votes.slice(-4)
  if (state.rerollsLeft == null) state.rerollsLeft = frame.rerolls
  return frame.rerolls
}

function fallbackDue(state: GateState, frame: GateInput): boolean {
  if (state.firstCardAt == null) return false
  const elapsed = frame.t - state.firstCardAt
  const empty = frame.slots.filter((slot) => slot.empty).length
  if (empty >= 2) return false
  const pending = frame.slots.some((slot) => slot.readPending && slot.present)
  const dim = frame.slots.some((slot) => slot.dim && slot.present)
  let limit = FALLBACK_MS
  if (dim) limit = FALLBACK_DIM_MS
  if (pending) limit += FALLBACK_READ_HOLD_MS
  if (elapsed < limit) return false
  const young = frame.slots.some((slot) => slot.present && state.firstCardAt != null && elapsed < YOUNG_MS)
  if (young) return false
  return frame.slots.some((slot) => slot.present)
}

export function resyncText(state: GateState, now: number): string | null {
  if (!state.resync) return null
  if (now - state.resync.at > 5000) return null
  return `Resynced to round ${state.resync.round} choice ${state.resync.choice}`
}

/** Ability picture: gone after 6 frames, or 3 frames spread over 1.5 s, then shown for 15 s. */
export interface PanelState {
  absentFrames: number
  absentSince: number | null
  showUntil: number | null
}

export function freshPanel(): PanelState {
  return { absentFrames: 0, absentSince: null, showUntil: null }
}

export function stepPanel(state: PanelState, draftUp: boolean, now: number): PanelState {
  if (draftUp) return freshPanel()
  const absentSince = state.absentSince ?? now
  const absentFrames = state.absentFrames + 1
  const spread = absentFrames >= 3 && now - absentSince >= 1500
  const closed = absentFrames >= 6 || spread
  let showUntil = state.showUntil
  if (closed && showUntil == null) showUntil = now + 15000
  if (showUntil != null && now >= showUntil) return freshPanel()
  return { absentFrames, absentSince, showUntil }
}

export function panelVisible(state: PanelState, now: number): boolean {
  return state.showUntil != null && now < state.showUntil
}
