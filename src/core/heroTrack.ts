/** Which hero the draft is scored for. */

export type HeroSource = 'pinned' | 'loading' | 'portrait' | 'window'

export interface HeroChoice {
  id: number
  name: string
  source: HeroSource
  guessed: boolean
}

const LOADING_FRESH_MS = 5 * 60 * 1000
const LOADING_MAX_MS = 60 * 60 * 1000

export interface HeroTracker {
  pinned: number | null
  loading: { id: number; at: number } | null
  portrait: { id: number; at: number } | null
  windowId: number
  matchStartedAt: number | null
  sawRound: number | null
}

export function freshHeroTracker(windowId = 1): HeroTracker {
  return { pinned: null, loading: null, portrait: null, windowId, matchStartedAt: null, sawRound: null }
}

export function noteLoading(tracker: HeroTracker, id: number, now: number): HeroTracker {
  return { ...tracker, loading: { id, at: now }, matchStartedAt: tracker.matchStartedAt ?? now }
}

export function notePortrait(tracker: HeroTracker, id: number, now: number): HeroTracker {
  return { ...tracker, portrait: { id, at: now } }
}

export function pinHero(tracker: HeroTracker, id: number): HeroTracker {
  return { ...tracker, pinned: id }
}

export function clearPin(tracker: HeroTracker): HeroTracker {
  return { ...tracker, pinned: null }
}

export function startMatch(tracker: HeroTracker, round: number, choice: number, now: number): HeroTracker {
  const lower = tracker.sawRound != null && round < tracker.sawRound
  const opening = round === 1 && choice === 1
  if (!opening && !lower) return { ...tracker, sawRound: tracker.sawRound ?? round }
  const loadingFresh = tracker.loading != null && now - tracker.loading.at <= LOADING_FRESH_MS
  return {
    ...tracker,
    sawRound: round,
    matchStartedAt: now,
    portrait: null,
    loading: loadingFresh ? tracker.loading : null,
  }
}

export function chooseHero(tracker: HeroTracker, names: Map<number, string>, now: number): HeroChoice {
  const nameOf = (id: number) => names.get(id) ?? `Hero ${id}`
  if (tracker.pinned != null) return { id: tracker.pinned, name: nameOf(tracker.pinned), source: 'pinned', guessed: false }
  if (tracker.loading && now - tracker.loading.at <= LOADING_MAX_MS) {
    return { id: tracker.loading.id, name: nameOf(tracker.loading.id), source: 'loading', guessed: false }
  }
  if (tracker.portrait) return { id: tracker.portrait.id, name: nameOf(tracker.portrait.id), source: 'portrait', guessed: true }
  return { id: tracker.windowId, name: nameOf(tracker.windowId), source: 'window', guessed: false }
}

/**
 * U4, off unless the caller asks. If the portrait hero is also sitting in the
 * enemy four, keep the window hero instead of advising the enemy's build.
 */
export function portraitIsEnemy(playerId: number | null, enemies: number[]): boolean {
  if (playerId == null) return false
  return enemies.includes(playerId)
}
