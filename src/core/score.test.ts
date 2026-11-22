import { describe, expect, it } from 'vitest'
import { advise, buildHeroModel, scoreCard } from './score'
import type { Catalog, ItemDef } from './model'

function item(partial: Partial<ItemDef> & Pick<ItemDef, 'id' | 'name'>): ItemDef {
  return {
    className: partial.className ?? `class_${partial.id}`,
    tier: partial.tier ?? 1,
    disabled: false,
    active: false,
    components: [],
    stats: [],
    image: null,
    ...partial,
  }
}

function catalog(items: ItemDef[]): Catalog {
  return {
    heroes: [
      {
        id: 1,
        name: 'Infernus',
        className: 'hero_inferno',
        bulletGrowth: 0.088,
        spiritGrowth: 1.1,
        playstyle: '',
        signatures: [],
        smallImage: null,
        cardImage: null,
      },
    ],
    abilities: [],
    items,
    mode: {
      rerolls: [1, 1, 1, 1, 1],
      abilityPoints: [6, 6, 5, 5, 10],
      souls: [5600, 7400, 9400, 11600, 14000],
      rounds: [
        {
          rareWeights: {},
          enhancedWeights: {},
          choices: [
            { normal: 1, rare: 2 },
            { normal: 2, rare: 3 },
            { normal: 3, rare: 4 },
          ],
        },
      ],
      tierBuckets: { '1': { bucket: { normal: 40, good: 60 }, name: 'Tier 1' } },
    },
    brawl: new Map([
      [
        1,
        {
          heroId: 1,
          wins: 100,
          losses: 100,
          matches: 200,
          items: items.filter((row) => row.tier >= 1).map((row) => [row.id, 50, 50, 100] as [number, number, number, number]),
          pairs: [],
          versus: {},
          orders: [],
        },
      ],
    ]),
    heroStats: [[1, 100, 100, 200]],
    manifest: {
      fetchedAt: 1794000000,
      minUnix: 1793318400,
      maxUnix: 1793750399,
      windowStart: '2026-10-30',
      windowEnd: '2026-11-03',
      heroCount: 1,
      itemCount: items.length,
      heroGames: 200,
      matchesPerHero: { '1': 200 },
      source: 'test',
      rareRate: '4/27',
      enhancedRate: '3/27',
      enhancedStatMultiplier: 1.25,
      note: 'test',
    },
  }
}

describe('score rules on a tiny catalog', () => {
  const active = item({ id: 10, name: 'Active One', tier: 1, active: true, className: 'upgrade_active' })
  const plain = item({ id: 11, name: 'Plain One', tier: 1 })
  const ownedActives = [1, 2, 3, 4].map((id) => item({ id, name: `Held ${id}`, tier: 1, active: true }))
  const data = catalog([active, plain, ...ownedActives])
  const model = buildHeroModel(data, 1)

  it('D6 a fifth active is 0.5 lower and still scored', () => {
    const crowded = scoreCard(model, active, {
      enhanced: false,
      rare: false,
      normalTier: 1,
      owned: ownedActives.map((row) => row.id),
      enemies: [],
      duplicateInSet: false,
    })
    const room = scoreCard(model, active, {
      enhanced: false,
      rare: false,
      normalTier: 1,
      owned: ownedActives.slice(0, 3).map((row) => row.id),
      enemies: [],
      duplicateInSet: false,
    })
    expect(room.score - crowded.score).toBeCloseTo(0.5)
    expect(crowded.reasons.some((reason) => reason.includes('active items'))).toBe(true)
  })

  it('D7 an owned item loses a point', () => {
    const dup = scoreCard(model, plain, {
      enhanced: false,
      rare: false,
      normalTier: 1,
      owned: [plain.id],
      enemies: [],
      duplicateInSet: false,
    })
    const fresh = scoreCard(model, plain, {
      enhanced: false,
      rare: false,
      normalTier: 1,
      owned: [],
      enemies: [],
      duplicateInSet: false,
    })
    expect(fresh.score - dup.score).toBeCloseTo(1)
    expect(dup.reasons).toContain('you already hold this item')
  })

  it('D8 an unread card never calls a re-roll', () => {
    const advice = advise(data, model, {
      heroId: 1,
      round: 1,
      choice: 1,
      cards: [
        { itemId: plain.id, rare: false, enhanced: false },
        { itemId: active.id, rare: false, enhanced: false },
        { itemId: null, rare: null, enhanced: null },
      ],
      owned: [],
      enemies: [],
      rerollsLeft: 1,
    })
    expect(advice.reroll).toBe(false)
    expect(advice.unknownCeiling).not.toBeNull()
  })

  it('D4 tooltip cents sum to the plate score', () => {
    const scored = scoreCard(model, plain, {
      enhanced: true,
      rare: false,
      normalTier: 1,
      owned: [],
      enemies: [],
      duplicateInSet: false,
    })
    const sum = scored.rows.reduce((total, row) => total + row.cents, 0)
    expect(sum).toBe(Math.round(scored.score * 100))
    const enhanced = scored.rows.find((row) => row.key === 'enhanced')
    expect(enhanced).toBeTruthy()
    expect(enhanced!.cents).toBe(Math.round(scored.enhancedBonus * 100))
  })

  it('D9 highlights are not an input to advise', () => {
    const input = {
      heroId: 1,
      round: 1,
      choice: 3,
      cards: [plain, active, ownedActives[0]].map((row) => ({ itemId: row.id, rare: false as boolean | null, enhanced: false as boolean | null })),
      owned: [] as number[],
      enemies: [] as number[],
      rerollsLeft: 1,
    }
    const a = advise(data, model, input)
    const b = advise(data, model, input)
    expect(a.cards.map((card) => card.score)).toEqual(b.cards.map((card) => card.score))
    expect(a.takeId).toBe(b.takeId)
    expect(a.reroll).toBe(b.reroll)
  })
})
