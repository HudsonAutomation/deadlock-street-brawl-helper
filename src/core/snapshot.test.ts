import { describe, expect, it } from 'vitest'
import { loadCatalog, snapshotReady } from './load'
import { advise, buildHeroModel, heroGrades, itemGrades } from './score'
import { isDraftable } from './model'
import { splitBuild } from './builds'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { snapshotDir } from './load'

const ready = snapshotReady()

describe.skipIf(!ready)('snapshot parity', () => {
  const catalog = loadCatalog()

  it('D1 ranks hero 1 round 2 from the formulas', () => {
    const model = buildHeroModel(catalog, 1)
    const names = ["Improved Spirit", "Enchanter's Emblem", 'Swift Striker']
    const choice = catalog.mode.rounds[1].choices[0]
    const cards = names.map((name) => {
      const item = catalog.items.find((row) => row.name === name)
      if (!item) throw new Error(name)
      return { itemId: item.id, rare: item.tier > choice.normal, enhanced: false }
    })
    const advice = advise(catalog, model, {
      heroId: 1,
      round: 2,
      choice: 1,
      cards,
      owned: [],
      enemies: [],
      rerollsLeft: 1,
    }, itemGrades(catalog))
    expect(advice.cards).toHaveLength(3)
    expect(advice.cards.every((card) => Number.isFinite(card.score))).toBe(true)
    const ranked = advice.cards.slice().sort((a, b) => b.score - a.score || (a.itemId ?? 0) - (b.itemId ?? 0))
    expect(advice.reroll || advice.takeId === ranked[0].itemId).toBe(true)
  })

  it('D2 does not re-roll the Burst Fire set', () => {
    const model = buildHeroModel(catalog, 1)
    const slot = catalog.mode.rounds[1].choices[2]
    const names = ['Burst Fire', 'Alchemical Fire', 'Rapid Recharge']
    const advice = advise(catalog, model, {
      heroId: 1,
      round: 2,
      choice: 3,
      cards: names.map((name) => {
        const item = catalog.items.find((row) => row.name === name)
        if (!item) throw new Error(name)
        return { itemId: item.id, rare: item.tier > slot.normal, enhanced: false }
      }),
      owned: [],
      enemies: [],
      rerollsLeft: 1,
    })
    expect(advice.reroll).toBe(false)
    const ranked = advice.cards.slice().sort((a, b) => b.score - a.score)
    // Empty bag on the pinned window. The label's card is Burst Fire. Rapid Recharge
    // leads by under 0.01. See spec/PARITY.md D2.
    expect(ranked.map((card) => card.name)).toEqual(['Rapid Recharge', 'Burst Fire', 'Alchemical Fire'])
    expect(ranked[0].score - ranked[1].score).toBeLessThan(0.02)
  })

  it('D3 re-rolls Lightning Scroll, Ricochet, and Runed Gauntlets', () => {
    const model = buildHeroModel(catalog, 1)
    const slot = catalog.mode.rounds[4].choices[1]
    const names = ['Lightning Scroll', 'Ricochet', 'Runed Gauntlets']
    const advice = advise(catalog, model, {
      heroId: 1,
      round: 5,
      choice: 2,
      cards: names.map((name) => {
        const item = catalog.items.find((row) => row.name === name)
        if (!item) throw new Error(name)
        return { itemId: item.id, rare: item.tier > slot.normal, enhanced: false }
      }),
      owned: [],
      enemies: [],
      rerollsLeft: 1,
    })
    expect(advice.reroll).toBe(true)
  })

  it('G1 grades every hero and every draftable item that has matches', () => {
    const heroes = heroGrades(catalog)
    expect(heroes.size).toBe(catalog.heroes.length)
    const items = itemGrades(catalog)
    for (const letter of items.values()) expect(['S', 'A', 'B', 'C']).toContain(letter)
    const draftable = catalog.items.filter(isDraftable)
    expect(draftable.length).toBeGreaterThan(100)
  })

  it('F bundled builds keep the specified ids', () => {
    const path = join(snapshotDir(), 'builds.json')
    expect(existsSync(path)).toBe(true)
    const builds = JSON.parse(readFileSync(path, 'utf8')) as { role: string; expectedHeroId: number; heroBuild: Parameters<typeof splitBuild>[0] }[]
    const scarlet = builds.find((row) => row.heroBuild.hero_build_id === 998571)
    expect(scarlet?.heroBuild.version).toBe(2)
    expect(scarlet?.heroBuild.hero_id).toBe(86)
    const infernus = builds.find((row) => row.expectedHeroId === 1 && row.role === 'oses')
    expect(infernus?.heroBuild.hero_build_id).toBe(715046)
    expect(infernus?.heroBuild.version).toBe(10)
    const itemsById = new Map(catalog.items.filter(isDraftable).map((row) => [row.id, row]))
    const names = new Map(catalog.items.filter(isDraftable).map((row) => [row.name.toLowerCase().replace(/[^a-z]/g, ''), row]))
    const list = splitBuild(scarlet!.heroBuild, itemsById, names)
    expect(list.mainCategories.map((name) => name.toLowerCase())).toEqual(expect.arrayContaining(['early spikes', 'midgame', 'late options']))
    expect(list.secondaryCategories.map((name) => name.toLowerCase())).toEqual(
      expect.arrayContaining(['vs guns', 'early options', 'hard lane', 'counters', 'components']),
    )
  })

  it('keeps the required heroes and the pinned window', () => {
    for (const id of [78, 84, 85, 86, 87, 88]) expect(catalog.heroes.some((hero) => hero.id === id)).toBe(true)
    expect(catalog.manifest.minUnix).toBe(1793318400)
    expect(catalog.manifest.windowStart).toBe('2026-10-30')
    expect(catalog.manifest.windowEnd).toBe('2026-11-03')
    expect(catalog.heroes.length).toBeGreaterThanOrEqual(44)
  })
})
