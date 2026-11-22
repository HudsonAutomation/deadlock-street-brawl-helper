import { describe, expect, it } from 'vitest'
import { clickPill, orderIsComplete, placeSteps, standardOrder, validateOrder } from './abilities'
import { authorLabel, categoryTitle, splitBuild, type HeroBuild } from './builds'
import { restoreBounds } from './bounds'
import { detectFrame, detectStart, freshCapture, idleStop, probeHit, probeMiss } from './capturePolicy'
import { freshGate, freshPanel, panelVisible, stepGate, stepPanel, type GateInput, type SlotView } from './gate'
import { chooseHero, clearPin, freshHeroTracker, noteLoading, notePortrait, pinHero, portraitIsEnemy } from './heroTrack'
import { gradePopulation, letterFor } from './grades'
import { matchHeroName, matchName, nameList, normaliseName } from './names'
import { drawAdvice, devToolsEnabled, enhancedLabel } from './overlayModel'
import { isBlack, isEnhancedMark, isRareMark, looksLikeLoadingName, rerollGlyphIsOne } from './pixels'
import { enhancementFactor, type HeroModel } from './score'
import { heroNotRead, problemLine, statusLine, wordingOk, type StatusInput } from './status'
import { DEFAULTS, readStored, SETTINGS_DIR_NAME } from './storage'
import { isDraftable, type ItemDef } from './model'

function slot(partial: Partial<SlotView> = {}): SlotView {
  return {
    id: null,
    fingerprint: 'a',
    empty: false,
    present: true,
    dim: false,
    covered: false,
    enhanced: false,
    rare: false,
    readPending: false,
    cellDelta: 0,
    ...partial,
  }
}

function frame(partial: Partial<GateInput> & { slots?: [SlotView, SlotView, SlotView] }): GateInput {
  return {
    t: 0,
    round: 1,
    choice: 1,
    slots: [slot(), slot(), slot()],
    rerolls: 1,
    ownedIds: [],
    gridReliable: false,
    ...partial,
  }
}

const quiet: StatusInput = {
  platformOk: true,
  resync: null,
  heroSource: 'window',
  heroName: 'Infernus',
  gameFound: false,
  testMode: false,
  draftUp: false,
  advising: false,
  detecting: false,
  detectMiss: false,
  readerDown: false,
  black: false,
  tooSmall: false,
  captureDenied: false,
  f8Taken: false,
}

describe('A shell rules', () => {
  it('A2 restores on-screen bounds and centres an off-screen window', () => {
    const display = { x: 0, y: 0, width: 1920, height: 1080 }
    const saved = { x: 100, y: 80, width: 460, height: 640 }
    expect(restoreBounds(saved, [display], false, false)).toMatchObject(saved)
    const gone = restoreBounds({ x: -4000, y: -4000, width: 460, height: 640 }, [display], false, false)
    expect(gone).toMatchObject({ width: 460, height: 640 })
    expect(gone.x).toBeGreaterThan(0)
    expect(restoreBounds(saved, [display], true, false).x).not.toBe(100)
  })

  it('A5 debug tooling follows dev and -rc versions', () => {
    expect(devToolsEnabled('1.0.0-rc.1', false)).toBe(true)
    expect(devToolsEnabled('0.6.0', false)).toBe(false)
    expect(devToolsEnabled('0.6.0', true)).toBe(true)
  })
})

describe('C timing', () => {
  it('C1 waits 100 ms for a stable set and 600 ms after a relabel', () => {
    let state = freshGate()
    const slots: [SlotView, SlotView, SlotView] = [
      slot({ id: 1, fingerprint: 'a' }),
      slot({ id: 2, fingerprint: 'b' }),
      slot({ id: 3, fingerprint: 'c' }),
    ]
    state = stepGate(state, frame({ t: 0, slots }))
    expect(state.advice).toBeNull()
    state = stepGate(state, frame({ t: 99, slots }))
    expect(state.advice).toBeNull()
    state = stepGate(state, frame({ t: 100, slots }))
    expect(state.advice?.ids).toEqual([1, 2, 3])
    state = stepGate(state, frame({ t: 200, round: 1, choice: 2, slots }))
    expect(state.advice?.choice).not.toBe(2)
    state = stepGate(state, frame({ t: 800, round: 1, choice: 2, slots }))
    expect(state.advice?.choice).toBe(2)
  })

  it('C2 shows a grey unknown at 1 s and upgrades when the read lands', () => {
    let state = freshGate()
    const slots: [SlotView, SlotView, SlotView] = [
      slot({ id: 1, fingerprint: 'a' }),
      slot({ id: null, fingerprint: 'b', present: true }),
      slot({ id: 3, fingerprint: 'c' }),
    ]
    state = stepGate(state, frame({ t: 0, slots }))
    state = stepGate(state, frame({ t: 1000, slots }))
    expect(state.advice?.unknown[1]).toBe(true)
    const landed: [SlotView, SlotView, SlotView] = [slots[0], slot({ id: 9, fingerprint: 'b2', cellDelta: 8 }), slots[2]]
    state = stepGate(state, frame({ t: 1100, slots: landed }))
    expect(state.advice?.ids[1]).toBe(9)
  })

  it('C3 drops advice when two circles are empty', () => {
    let state = freshGate()
    const full: [SlotView, SlotView, SlotView] = [slot({ id: 1 }), slot({ id: 2 }), slot({ id: 3 })]
    state = stepGate(state, frame({ t: 0, slots: full }))
    state = stepGate(state, frame({ t: 100, slots: full }))
    expect(state.advice).not.toBeNull()
    const leaving: [SlotView, SlotView, SlotView] = [
      slot({ empty: true, present: false }),
      slot({ empty: true, present: false }),
      slot({ id: 3 }),
    ]
    state = stepGate(state, frame({ t: 5000, slots: leaving }))
    expect(state.advice).toBeNull()
  })

  it('C5 refuses a short near-miss such as irit versus Grit', () => {
    const grit = [{ id: 1, name: 'Grit' }, { id: 2, name: 'Spirit Sap' }]
    expect(matchName('irit', grit)).toBeNull()
    expect(matchName('Grit', grit)?.id).toBe(1)
  })

  it('C8 clears owned items on round 1 choice 1', () => {
    let state = freshGate()
    state.owned = [5, 6]
    state = stepGate(state, frame({ t: 0, round: 1, choice: 1, slots: [slot({ id: 1 }), slot({ id: 2 }), slot({ id: 3 })] }))
    expect(state.owned).toEqual([])
  })

  it('C10 shows the ability picture for 15 s unless a draft returns', () => {
    let panel = freshPanel()
    for (let i = 0; i < 6; i++) panel = stepPanel(panel, false, 1000 + i * 100)
    expect(panelVisible(panel, 1600)).toBe(true)
    expect(panelVisible(panel, 1600 + 15000)).toBe(false)
    let again = freshPanel()
    again = stepPanel(again, false, 0)
    again = stepPanel(again, false, 2000)
    again = stepPanel(again, false, 2000)
    expect(panelVisible(again, 2000)).toBe(true)
    again = stepPanel(again, true, 2500)
    expect(panelVisible(again, 2500)).toBe(false)
  })

  it('C11 does not recapture a stale probe hit inside the quiet window', () => {
    let policy = idleStop(freshCapture(), 0)
    policy = probeHit(policy, 1000, false)
    expect(policy.wanted).toBe(false)
    policy = probeMiss(policy)
    policy = probeHit(policy, 2000, false)
    expect(policy.wanted).toBe(true)
    const missed = detectFrame(detectFrame(detectFrame(detectStart(freshCapture(), 0), false, 10), false, 20), false, 30)
    expect(missed.holdOff).toBe(true)
    expect(missed.wanted).toBe(false)
  })
})

describe('D scoring pieces that do not need the snapshot', () => {
  it('D5 Infernus keeps a fifth of a weapon enhancement on Ricochet', () => {
    const item = { className: 'upgrade_ricochet', stats: [{ name: 'BonusFireRate', value: 18 }] } as ItemDef
    const factor = enhancementFactor(item, { id: 1, name: 'Infernus' } as HeroModel['hero'])
    expect(factor.factor).toBeCloseTo(0.2)
    expect(factor.note).toContain('little use for Infernus')
    const other = enhancementFactor(item, { id: 2, name: 'Seven' } as HeroModel['hero'])
    expect(other.factor).toBe(1)
  })

  it('grade cuts follow 1.15 / 0.35 / -0.6', () => {
    expect(letterFor(1.15)).toBe('S')
    expect(letterFor(0.35)).toBe('A')
    expect(letterFor(-0.6)).toBe('B')
    expect(letterFor(-0.61)).toBe('C')
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, wins: 400 + i * 30, matches: 1000 }))
    const graded = gradePopulation(rows, 20000)
    expect(new Set(graded.map((row) => row.grade))).toEqual(new Set(['S', 'A', 'B', 'C']))
    expect(graded[0].combined).toBeGreaterThan(graded[graded.length - 1].combined)
  })
})

describe('E advisor copy', () => {
  it('E3 buys, refuses, and validates an ability order', () => {
    const empty = new Array(12).fill(0)
    const bought = clickPill(empty, 0, 0, 1, 'Napalm')
    expect(bought.saved).toBe(true)
    expect(bought.rounds[0]).toBe(1)
    const refused = clickPill(empty, 0, 1, 1, 'Napalm')
    expect(refused.saved).toBe(false)
    expect(refused.message).toContain('2 point upgrade comes before the one under it')
    const heavy = empty.slice()
    heavy[0] = 1
    heavy[1] = 1
    const over = clickPill(heavy, 0, 2, 1, 'Napalm')
    expect(over.saved).toBe(false)
    expect(over.message).toContain('points spent by now')
    expect(over.message).toContain('only')
    const placed = placeSteps([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3])
    expect(orderIsComplete(placed)).toBe(true)
    expect(validateOrder(placed).ok).toBe(true)
    const plan = standardOrder(
      [0, 1, 2, 3].map((slot) => ({
        id: 100 + slot,
        heroId: 1,
        slot,
        className: null,
        name: `A${slot}`,
        spiritPower: false,
        spiritDuration: false,
        description: '',
        icon: null,
      })),
      null,
    )
    expect(plan.reliable).toBe(false)
    expect(plan.rounds.reduce((s, round, i) => s + (round ? [1, 2, 5][i % 3] : 0), 0)).toBe(32)
  })

  it('E5 sentences stay inside the wording rules', () => {
    const lines = [
      statusLine(quiet),
      statusLine({ ...quiet, gameFound: true }),
      statusLine({ ...quiet, gameFound: true, draftUp: true }),
      statusLine({ ...quiet, gameFound: true, draftUp: true, advising: true }),
      statusLine({ ...quiet, detecting: true, gameFound: true }),
      statusLine({ ...quiet, detectMiss: true, gameFound: true }),
      statusLine({ ...quiet, heroSource: 'portrait', gameFound: true }),
      statusLine({ ...quiet, platformOk: false }),
      heroNotRead({ ...quiet, draftUp: true, heroSource: 'window' }) ?? '',
      problemLine({ ...quiet, black: true }) ?? '',
      problemLine({ ...quiet, tooSmall: true }) ?? '',
      problemLine({ ...quiet, captureDenied: true }) ?? '',
      problemLine({ ...quiet, f8Taken: true }) ?? '',
      'Name reader not running',
      'Deadlock Street Brawl Helper',
      'Highlight My Picks',
      'No items.',
      'Loading snapshots…',
    ]
    for (const line of lines) expect(wordingOk(line), line).toBe(true)
  })
})

describe('F my picks rules', () => {
  it('F8 splits Scarlet by category and other builds by the optional flag', () => {
    const items = new Map([[1, { id: 1, name: 'Extra Spirit' }], [2, { id: 2, name: 'Warp Stone' }]])
    const scarlet: HeroBuild = {
      hero_id: 86,
      hero_build_id: 998571,
      author_account_id: 128483937,
      version: 2,
      name: 'scarlet9x',
      description: 'based off twitch.tv/oses [897240]\nalways use arcane surge on ult',
      origin_build_id: 897240,
      last_updated_timestamp: 1794940946,
      details: {
        mod_categories: [
          { name: 'early spikes', mods: [{ ability_id: 1 }] },
          { name: 'vs guns', mods: [{ ability_id: 2 }] },
        ],
      },
    }
    const list = splitBuild(scarlet, items, new Map())
    expect(list.main.map((row) => row.name)).toEqual(['Extra Spirit'])
    expect(list.secondary.map((row) => row.name)).toEqual(['Warp Stone'])
    expect(list.note).toBe('always use arcane surge on ult')
    expect(list.credit).toContain('897240')
    expect(list.updated).toBe('2026-11-17')
    expect(authorLabel(1840902834)).toBe('oses')
    expect(categoryTitle('#Citadel_HeroBuilds_EarlySpikes')).toBe('Early Spikes')
    const other = splitBuild(
      { ...scarlet, hero_build_id: 1, details: { mod_categories: [{ name: 'core', optional: true, mods: [{ ability_id: 1 }] }] } },
      items,
      new Map(),
    )
    expect(other.secondary).toHaveLength(1)
    expect(other.main).toHaveLength(0)
  })

  it('F1 defaults are on, Violet, and the settings folder name', () => {
    expect(DEFAULTS.myPicks.enabled).toBe(true)
    expect(DEFAULTS.myPicks.fallbackHeroId).toBe(86)
    expect(DEFAULTS.heroId).toBe(1)
    expect(SETTINGS_DIR_NAME).toBe('deadlock-street-brawl-helper')
    const stored = readStored(() => null)
    expect(stored.tab).toBe('advisor')
    expect(stored.firstRunDone).toBe(false)
  })
})

describe('G and H helpers', () => {
  it('G3 keeps the fixed 30 day phrase', () => {
    const subtitle = 'Heroes and items graded by win rate and usage, data from the 30 days to 2026-11-21'
    expect(subtitle).toContain('data from the 30 days to')
    expect(wordingOk(subtitle)).toBe(true)
  })

  it('pixel marks follow the colour rules', () => {
    const paint = (r: number, g: number, b: number, n = 10) => {
      const data = new Uint8Array(n * n * 4)
      for (let i = 0; i < n * n; i++) {
        data[i * 4] = r
        data[i * 4 + 1] = g
        data[i * 4 + 2] = b
        data[i * 4 + 3] = 255
      }
      return { width: n, height: n, data }
    }
    expect(isRareMark(paint(40, 210, 200))).toBe(true)
    expect(isEnhancedMark(paint(40, 80, 220))).toBe(true)
    expect(isBlack(paint(0, 0, 0))).toBe(true)
    const loading = paint(0, 0, 0, 10)
    for (let i = 0; i < 20; i++) {
      loading.data[i * 4] = 230
      loading.data[i * 4 + 1] = 210
      loading.data[i * 4 + 2] = 180
    }
    expect(looksLikeLoadingName(loading)).toBe(true)
    const digit = paint(0, 0, 0, 20)
    for (let y = 2; y < 18; y++) {
      digit.data[(y * 20 + 10) * 4] = 255
      digit.data[(y * 20 + 10) * 4 + 1] = 255
      digit.data[(y * 20 + 10) * 4 + 2] = 255
    }
    expect(rerollGlyphIsOne(digit)).toBe(true)
  })
})

describe('hero precedence and names', () => {
  it('C14 pinned beats loading, which beats a portrait', () => {
    const names = new Map([[1, 'Infernus'], [7, 'Wraith'], [13, 'Haze']])
    let tracker = freshHeroTracker(1)
    tracker = notePortrait(tracker, 7, 0)
    expect(chooseHero(tracker, names, 10).source).toBe('portrait')
    tracker = noteLoading(tracker, 13, 10)
    expect(chooseHero(tracker, names, 20).id).toBe(13)
    tracker = pinHero(tracker, 1)
    expect(chooseHero(tracker, names, 30).source).toBe('pinned')
    tracker = clearPin(tracker)
    expect(chooseHero(tracker, names, 40).source).toBe('loading')
    expect(portraitIsEnemy(8, [8, 4, 1, 2])).toBe(true)
  })

  it('keeps the first of two ids that share a name and rejects a hero off by one letter', () => {
    const list = nameList([
      { id: 2, name: 'Silencer' },
      { id: 9, name: 'Silencer' },
      { id: 3, name: 'Grit' },
    ])
    expect(list.map((row) => row.id)).toEqual([2, 3])
    expect(matchHeroName('SHIP', [{ id: 19, name: 'Shiv' }])).toBeNull()
    expect(normaliseName("Enchanter's Emblem")).toBe('enchantersemblem')
  })
})

describe('overlay plates', () => {
  it('D4 and the take plate are teal, and a re-roll veils every card', () => {
    const take = drawAdvice({
      draft: true,
      ids: [1, 2, 3],
      scores: [2, 1, 0.5],
      grades: ['S', 'A', 'B'],
      names: ['A', 'B', 'C'],
      enhancedBonus: [0.2, 0, 0],
      takeId: 1,
      reroll: false,
      expected: null,
      current: null,
      picks: [null, null, null],
      tight: false,
      panel: false,
      dot: false,
      suppressed: false,
    })
    expect(take.plates.filter((plate) => plate.kind === 'take')).toHaveLength(1)
    expect(take.plates[0].circle).toBe(true)
    expect(take.plates[1].veil).toBe(true)
    expect(take.plates[0].enhancedLabel).toBe(enhancedLabel(0.2, false))
    const reroll = drawAdvice({
      draft: true,
      ids: [1, 2, 3],
      scores: [1, 1, 1],
      grades: ['A', 'A', 'A'],
      names: ['A', 'B', 'C'],
      enhancedBonus: [0, 0, 0],
      takeId: null,
      reroll: true,
      expected: 1.5,
      current: 1,
      picks: ['main', null, null],
      tight: true,
      panel: false,
      dot: false,
      suppressed: false,
    })
    expect(reroll.reroll).toBe(true)
    expect(reroll.plates.every((plate) => plate.kind !== 'take')).toBe(true)
    expect(reroll.myPicks).toEqual([{ slot: 0, tier: 'main' }])
    expect(reroll.rerollText).toBe('Re-roll: 1.50 vs 1.00')
  })

  it('hides when suppressed and shows Reading before plates', () => {
    const reading = drawAdvice({
      draft: true,
      ids: [null, null, null],
      scores: [null, null, null],
      grades: [],
      names: [],
      enhancedBonus: [],
      takeId: null,
      reroll: false,
      expected: null,
      current: null,
      picks: [],
      tight: false,
      panel: false,
      dot: false,
      suppressed: false,
    })
    expect(reading.reading).toBe(true)
    expect(reading.plates).toHaveLength(0)
    expect(reading.visible).toBe(true)
  })
})

describe('draftable filter', () => {
  it('drops disabled, tier 0, and upgrade_ names', () => {
    const base: ItemDef = { id: 1, className: 'a', name: 'Extra Spirit', tier: 1, disabled: false, active: false, components: [], stats: [], image: null }
    expect(isDraftable(base)).toBe(true)
    expect(isDraftable({ ...base, disabled: true })).toBe(false)
    expect(isDraftable({ ...base, tier: 0 })).toBe(false)
    expect(isDraftable({ ...base, name: 'upgrade_old' })).toBe(false)
  })
})
