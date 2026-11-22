/** Page keys. A broken value falls back to the default. */

export type TabId = 'advisor' | 'picks' | 'tiers'

export interface MyPicksState {
  enabled: boolean
  fallbackHeroId: number
  edits: Record<string, unknown>
}

export interface Stored {
  heroId: number
  tab: TabId
  round: number
  enemies: [number, number, number, number]
  myPicks: MyPicksState
  customOrders: Record<string, number[]>
  firstRunDone: boolean
  debugLog: boolean
  /** U12. Empty string means the parity key. */
  overlayHotkey: string
  detectHotkey: string
  abilityPicture: boolean
  lobbyDot: boolean
  /** U1. Off keeps the built-in boxes. */
  strictAspect: boolean
  /** U4. Off keeps a portrait guess even when that hero is also an enemy. */
  strictPortrait: boolean
  /** U5. Off does not invent a pick below 2000 px. */
  assumePicks: boolean
  /** U8. Off keeps the fixed "30 days" subtitle. */
  realWindowCopy: boolean
  /** U6 concurrency cap. 1 is the parity queue. 3 reads the three names together. */
  ocrConcurrency: number
  /** U13. */
  hideOwnedRings: boolean
}

export const DEFAULTS: Stored = {
  heroId: 1,
  tab: 'advisor',
  round: 1,
  enemies: [0, 0, 0, 0],
  myPicks: { enabled: true, fallbackHeroId: 86, edits: {} },
  customOrders: {},
  firstRunDone: false,
  debugLog: false,
  overlayHotkey: 'Ctrl+Shift+O',
  detectHotkey: 'F8',
  abilityPicture: true,
  lobbyDot: true,
  strictAspect: false,
  strictPortrait: false,
  assumePicks: false,
  realWindowCopy: false,
  ocrConcurrency: 3,
  hideOwnedRings: true,
}

const KEYS = {
  heroId: 'brawl.heroId',
  tab: 'brawl.tab',
  round: 'brawl.round',
  enemies: 'brawl.enemies',
  myPicks: 'brawl.myPicks',
  customOrders: 'brawl.customOrders',
  firstRunDone: 'brawl.firstRunDone',
  debugLog: 'brawlDebug',
} as const

function isOrder(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 12 && value.every((n) => typeof n === 'number' && n >= 0 && n <= 5)
}

export function readStored(get: (key: string) => string | null): Stored {
  const stored: Stored = { ...DEFAULTS, enemies: [...DEFAULTS.enemies], myPicks: { ...DEFAULTS.myPicks, edits: {} }, customOrders: {} }
  const hero = Number(get(KEYS.heroId))
  if (Number.isInteger(hero) && hero > 0) stored.heroId = hero
  const tab = get(KEYS.tab)
  if (tab === 'advisor' || tab === 'picks' || tab === 'tiers') stored.tab = tab
  const round = Number(get(KEYS.round))
  if (round >= 1 && round <= 5) stored.round = round
  const enemies = parseJson(get(KEYS.enemies))
  if (Array.isArray(enemies) && enemies.length === 4 && enemies.every((n) => typeof n === 'number' && n >= 0)) {
    stored.enemies = [enemies[0], enemies[1], enemies[2], enemies[3]]
  }
  const picks = parseJson(get(KEYS.myPicks))
  if (picks && typeof picks === 'object') {
    const row = picks as Partial<MyPicksState>
    stored.myPicks = {
      enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
      fallbackHeroId: typeof row.fallbackHeroId === 'number' ? row.fallbackHeroId : 86,
      edits: row.edits && typeof row.edits === 'object' ? (row.edits as Record<string, unknown>) : {},
    }
  }
  const orders = parseJson(get(KEYS.customOrders))
  if (orders && typeof orders === 'object') {
    for (const [id, value] of Object.entries(orders as Record<string, unknown>)) {
      if (isOrder(value)) stored.customOrders[id] = value
    }
  }
  stored.firstRunDone = get(KEYS.firstRunDone) === '1'
  stored.debugLog = get(KEYS.debugLog) === '1'
  return stored
}

export function writeStored(stored: Stored, set: (key: string, value: string) => void): void {
  const put = (key: string, value: string) => {
    try {
      set(key, value)
    } catch {
      /* private mode or a full disk keeps the in-memory value */
    }
  }
  put(KEYS.heroId, String(stored.heroId))
  put(KEYS.tab, stored.tab)
  put(KEYS.round, String(stored.round))
  put(KEYS.enemies, JSON.stringify(stored.enemies))
  put(KEYS.myPicks, JSON.stringify(stored.myPicks))
  put(KEYS.customOrders, JSON.stringify(stored.customOrders))
  put(KEYS.firstRunDone, stored.firstRunDone ? '1' : '0')
  put(KEYS.debugLog, stored.debugLog ? '1' : '0')
}

function parseJson(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const SETTINGS_DIR_NAME = 'deadlock-street-brawl-helper'
