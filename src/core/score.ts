/**
 * Street Brawl advice. A pure function of the hero, the catalog, the snapshot,
 * and the cards on screen. My Picks never enter this file.
 */

import { gradePopulation } from './grades'
import {
  ENHANCED_RATE,
  INFERNUS_MULTIPLIERS,
  RARE_RATE,
  SOULS,
  WEAPON_STATS,
  type AbilityDef,
  type Catalog,
  type HeroBrawl,
  type HeroDef,
  type ItemDef,
  isDraftable,
} from './model'

const W = {
  popularity: 1,
  winLift: 1,
  kit: 0.15,
  tier: 1,
  counter: 0.5,
  synergy: 0.5,
  active: 0,
  upgrade: 0.15,
  enhanced: 0.6,
  enhancedCarry: 0.15,
  enhancedT1: 0.9,
  enhancedCarryT1: 0.6,
  duplicate: 1,
  legendaryS: 4,
  activeOverflow: 0.5,
  rerollThreshold: 0,
}

export interface ItemRow {
  id: number
  tier: number
  pop: number
  winLift: number
  kitNorm: number
  base: number
  carry: number
  carryItemId: number | null
  sGrade: boolean
  matches: number
  wins: number
  shrunk: number
  active: boolean
}

export interface HeroModel {
  hero: HeroDef
  abilities: AbilityDef[]
  brawl: HeroBrawl | null
  mean: number
  rows: Map<number, ItemRow>
  pairLift: Map<string, number>
  multipliers: Record<string, number>
  weaponUse: number
  draftable: ItemDef[]
  byId: Map<number, ItemDef>
  byClass: Map<string, ItemDef>
  buildsInto: Map<string, ItemDef[]>
  rounds: Catalog['mode']['rounds']
  rerolls: number[]
}

export interface CardIn {
  itemId: number | null
  rare: boolean | null
  enhanced: boolean | null
}

export interface AdviseInput {
  heroId: number
  round: number
  choice: number
  cards: CardIn[]
  owned: number[]
  enemies: number[]
  rerollsLeft: number | null
}

export interface Reason {
  text: string
}

export interface TipRow {
  key: string
  label: string
  text: string
  cents: number
}

export interface ScoredCard {
  itemId: number | null
  name: string
  tier: number
  grade: string
  score: number
  enhanced: boolean
  rare: boolean
  unknown: boolean
  enhancedBonus: number
  enhancedNote: string
  reasons: string[]
  rows: TipRow[]
  parts: Record<string, number>
}

export interface Advice {
  cards: ScoredCard[]
  takeId: number | null
  reroll: boolean
  expectedBest: number
  currentBest: number
  gain: number
  hold: number
  unknownCeiling: number | null
  rerollsLeft: number
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function gunMention(text: string): boolean {
  const hay = text.toLowerCase()
  return ['bullet', 'weapon', 'fire rate', 'gun', 'shoot', 'ammo'].some((word) => hay.includes(word))
}

export function heroMultipliers(hero: HeroDef, abilities: AbilityDef[]): Record<string, number> {
  const spiritN = abilities.filter((a) => a.spiritPower).length
  const durationN = abilities.filter((a) => a.spiritDuration).length
  const gunN = abilities.filter((a) => gunMention(a.description)).length
  const spiritAdd = Math.min(0.6, 0.08 * spiritN)
  const durationAdd = Math.min(0.3, 0.05 * durationN)
  const gunAdd = Math.min(0.5, 0.15 * gunN)
  const weaponGrowth = Math.min(0.4, 3 * hero.bulletGrowth)
  const spiritGrowth = Math.min(0.4, 0.2 * hero.spiritGrowth)
  const mult: Record<string, number> = {}
  const add = (name: string, extra: number) => {
    mult[name] = (mult[name] ?? 1) + extra
  }
  for (const name of ['TechPower', 'SpiritPower', 'BonusSpirit']) add(name, spiritAdd + spiritGrowth)
  add('TechPowerPercent', spiritAdd)
  add('BonusAbilityDurationPercent', durationAdd)
  add('BonusFireRate', gunAdd)
  add('BaseAttackDamagePercent', gunAdd + weaponGrowth)
  if (hero.id === 1) {
    for (const [name, value] of Object.entries(INFERNUS_MULTIPLIERS)) mult[name] = value
  }
  return mult
}

export function kitValue(item: ItemDef, multipliers: Record<string, number>): number {
  let total = 0
  for (const stat of item.stats) {
    const souls = SOULS[stat.name]
    if (!souls) continue
    total += Math.abs(stat.value) * souls * (multipliers[stat.name] ?? 1)
  }
  return total
}

export function enhancementFactor(item: ItemDef, hero: HeroDef): { factor: number; note: string } {
  const priced = item.stats.map((stat) => stat.name).filter((name) => SOULS[name])
  const boosted = item.className === 'upgrade_ricochet' ? ['WeaponPower'] : priced.filter((name) => !WEAPON_STATS.has(name))
  let factor = 1
  let note = ''
  if (boosted.length === 0) {
    factor = 0.5
    note = 'boosted stats unknown'
  } else if (boosted.every((name) => WEAPON_STATS.has(name))) {
    factor = hero.id === 1 ? 0.2 : 1
    if (factor < 0.95) note = `weapon stats, little use for ${hero.name}`
  }
  factor = Math.min(1, Math.max(0, factor))
  return { factor, note }
}

function pairKey(a: number, b: number): string {
  return `${a}:${b}`
}

export function buildHeroModel(catalog: Catalog, heroId: number): HeroModel {
  const hero = catalog.heroes.find((row) => row.id === heroId) ?? catalog.heroes[0]
  const abilities = catalog.abilities.filter((row) => row.heroId === hero.id).sort((a, b) => a.slot - b.slot)
  const brawl = catalog.brawl.get(hero.id) ?? null
  const draftable = catalog.items.filter(isDraftable)
  const byId = new Map(catalog.items.map((item) => [item.id, item]))
  const byClass = new Map(catalog.items.map((item) => [item.className, item]))
  const buildsInto = new Map<string, ItemDef[]>()
  for (const item of catalog.items) {
    for (const component of item.components) {
      const list = buildsInto.get(component) ?? []
      list.push(item)
      buildsInto.set(component, list)
    }
  }
  const multipliers = heroMultipliers(hero, abilities)
  const itemStats = new Map<number, { wins: number; matches: number }>()
  if (brawl) {
    for (const [id, wins, , matches] of brawl.items) itemStats.set(id, { wins, matches })
  }
  let winSum = 0
  let matchSum = 0
  for (const stat of itemStats.values()) {
    winSum += stat.wins
    matchSum += stat.matches
  }
  const mean = matchSum > 0 ? winSum / matchSum : 0.5
  const byTier = new Map<number, ItemDef[]>()
  for (const item of draftable) {
    const list = byTier.get(item.tier) ?? []
    list.push(item)
    byTier.set(item.tier, list)
  }
  const kOf = new Map<number, number>()
  for (const [tier, items] of byTier) {
    let most = 0
    for (const item of items) most = Math.max(most, itemStats.get(item.id)?.matches ?? 0)
    kOf.set(tier, Math.max(200, 0.05 * most))
  }
  const rawKit = new Map<number, number>()
  for (const item of draftable) rawKit.set(item.id, kitValue(item, multipliers))
  const kitNorm = new Map<number, number>()
  for (const [tier, items] of byTier) {
    const positive = items.map((item) => rawKit.get(item.id) ?? 0).filter((value) => value > 0)
    const mid = median(positive)
    for (const item of items) {
      const kit = rawKit.get(item.id) ?? 0
      const priced = item.stats.some((stat) => SOULS[stat.name])
      if (!priced || mid == null) kitNorm.set(item.id, 0.5)
      else kitNorm.set(item.id, Math.min(2, kit / mid) / 2)
    }
  }
  const sGrades = new Set<number>()
  if (brawl) {
    for (const [, items] of byTier) {
      const rows = items
        .map((item) => {
          const stat = itemStats.get(item.id)
          return stat && stat.matches > 0 ? { id: item.id, wins: stat.wins, matches: stat.matches } : null
        })
        .filter((row): row is { id: number; wins: number; matches: number } => row != null)
      for (const graded of gradePopulation(rows, brawl.matches)) {
        if (graded.grade === 'S') sGrades.add(graded.id)
      }
    }
  }
  const popOf = (id: number, tier: number): number => {
    const matches = itemStats.get(id)?.matches ?? 0
    let most = 0
    for (const item of byTier.get(tier) ?? []) most = Math.max(most, itemStats.get(item.id)?.matches ?? 0)
    return most > 0 ? matches / most : 0
  }
  const carryOf = (item: ItemDef): { carry: number; id: number | null } => {
    let best = 0
    let bestId: number | null = null
    const seen = new Set<string>()
    const walk = (className: string, fromTier: number) => {
      for (const next of buildsInto.get(className) ?? []) {
        if (seen.has(next.className)) continue
        seen.add(next.className)
        const pop = popOf(next.id, next.tier)
        const value = (next.tier - fromTier) * Math.sqrt(pop)
        if (value > best) {
          best = value
          bestId = next.id
        }
        walk(next.className, fromTier)
      }
    }
    walk(item.className, item.tier)
    return { carry: best, id: bestId }
  }
  const rows = new Map<number, ItemRow>()
  for (const item of draftable) {
    const stat = itemStats.get(item.id)
    const pop = stat ? popOf(item.id, item.tier) : 0
    const k = kOf.get(item.tier) ?? 200
    const shrunk = stat ? (stat.wins + k * mean) / (stat.matches + k) : mean
    const winLift = stat ? (shrunk - mean) * 10 * pop : 0
    const kn = kitNorm.get(item.id) ?? 0.5
    const carry = carryOf(item)
    const base =
      W.popularity * Math.sqrt(pop) +
      W.winLift * winLift +
      W.kit * kn +
      W.tier * (item.tier - 1) +
      W.active * (item.active ? 1 : 0)
    rows.set(item.id, {
      id: item.id,
      tier: item.tier,
      pop,
      winLift,
      kitNorm: kn,
      base,
      carry: carry.carry,
      carryItemId: carry.id,
      sGrade: sGrades.has(item.id),
      matches: stat?.matches ?? 0,
      wins: stat?.wins ?? 0,
      shrunk,
      active: item.active,
    })
  }
  const pairLift = new Map<string, number>()
  if (brawl) {
    for (const [a, b, wins, matches] of brawl.pairs) {
      if (matches < 20) continue
      const lift = (wins / matches - mean) * 10
      pairLift.set(pairKey(a, b), lift)
      pairLift.set(pairKey(b, a), lift)
    }
  }
  return {
    hero,
    abilities,
    brawl,
    mean,
    rows,
    pairLift,
    multipliers,
    weaponUse: hero.id === 1 ? 0.2 : 1,
    draftable,
    byId,
    byClass,
    buildsInto,
    rounds: catalog.mode.rounds,
    rerolls: catalog.mode.rerolls,
  }
}

function synergyAgainst(model: HeroModel, itemId: number, owned: number[]): number {
  const lifts: number[] = []
  for (const id of owned) {
    const lift = model.pairLift.get(pairKey(itemId, id))
    if (lift != null) lifts.push(lift)
  }
  if (!lifts.length) return 0
  return lifts.reduce((s, v) => s + v, 0) / lifts.length
}

function counterAgainst(model: HeroModel, item: ItemDef, enemies: number[]): number {
  const row = model.rows.get(item.id)
  if (!row || !model.brawl || row.pop === 0 || !enemies.length) return 0
  const k = Math.max(200, 0.05 * Math.max(...model.draftable.filter((other) => other.tier === item.tier).map((other) => model.rows.get(other.id)?.matches ?? 0), 0))
  const lifts: number[] = []
  for (const enemy of enemies) {
    const table = model.brawl.versus[String(enemy)]
    if (!table) continue
    const found = table.find((entry) => entry[0] === item.id)
    if (!found || found[2] < 50) continue
    let wins = 0
    let matches = 0
    for (const entry of table) {
      wins += entry[1]
      matches += entry[2]
    }
    const enemyMean = matches > 0 ? wins / matches : 0.5
    const shrunk = (found[1] + k * enemyMean) / (found[2] + k)
    const fieldLift = row.shrunk - model.mean
    const enemyLift = shrunk - enemyMean
    lifts.push((enemyLift - fieldLift) * 10 * row.pop)
  }
  if (!lifts.length) return 0
  return lifts.reduce((s, v) => s + v, 0) / lifts.length
}

function ownedIsComponent(model: HeroModel, item: ItemDef, owned: number[]): boolean {
  const classes = new Set(item.components)
  return owned.some((id) => {
    const ownedItem = model.byId.get(id)
    return ownedItem ? classes.has(ownedItem.className) : false
  })
}

export function scoreCard(
  model: HeroModel,
  item: ItemDef,
  opts: { enhanced: boolean; rare: boolean; normalTier: number; owned: number[]; enemies: number[]; duplicateInSet: boolean },
): ScoredCard {
  const row = model.rows.get(item.id)
  const ownedActives = opts.owned.filter((id) => model.byId.get(id)?.active).length
  const { factor, note } = enhancementFactor(item, model.hero)
  const hasRow = row != null && row.matches > 0
  const pop = hasRow ? row.pop : 0
  const winLift = hasRow ? row.winLift : 0
  const kitNorm = hasRow ? row.kitNorm : 0
  const carry = hasRow ? row.carry : 0
  const pick = W.popularity * Math.sqrt(pop)
  const win = W.winLift * winLift
  const heroFit = W.kit * kitNorm * (opts.enhanced ? 1 + 0.25 * factor : 1)
  const tierPart = W.tier * (item.tier - 1)
  const counter = hasRow ? counterAgainst(model, item, opts.enemies) : 0
  const synergy = hasRow ? synergyAgainst(model, item.id, opts.owned) : 0
  const counterPart = W.counter * counter
  const synergyPart = W.synergy * synergy
  const overflow = item.active && ownedActives >= 4
  const activePart = W.active * (item.active ? 1 : 0) + (overflow ? -W.activeOverflow : 0)
  const upgrades = ownedIsComponent(model, item, opts.owned)
  const upgradePart = upgrades ? W.upgrade : 0
  let enhancedPart = 0
  if (opts.enhanced) {
    if (!hasRow) enhancedPart = 0.6
    else {
      const bonus = item.tier === 1 ? W.enhancedT1 + W.enhancedCarryT1 * carry : W.enhanced + W.enhancedCarry * carry
      enhancedPart = factor * pop * bonus
    }
  }
  const duplicate = opts.owned.includes(item.id) || opts.duplicateInSet
  const duplicatePart = duplicate ? -W.duplicate : 0
  const parts: Record<string, number> = {
    win,
    pick,
    heroFit,
    counter: counterPart,
    synergy: synergyPart,
    tier: tierPart,
    active: activePart,
    upgrade: upgradePart,
    enhanced: enhancedPart,
    duplicate: duplicatePart,
  }
  const score = Object.values(parts).reduce((s, v) => s + v, 0)
  const kitExtra = opts.enhanced && hasRow ? W.kit * kitNorm * 0.25 * factor : 0
  const enhancedBonus = opts.enhanced ? enhancedPart + kitExtra : 0
  const reasons: string[] = []
  if (opts.rare) reasons.push(`rare: a tier-${item.tier} card in a tier-${opts.normalTier} set`)
  if (!hasRow) reasons.push('no Street Brawl data for this item yet')
  if (pop > 0.5) {
    reasons.push(
      `picked in ${Math.round(pop * 100)}% of ${model.hero.name} brawls (relative to the top tier-${item.tier} pick)`,
    )
  }
  if (winLift > 0.1 || winLift < -0.1) {
    const shown = (winLift * 10).toFixed(1)
    reasons.push(`${winLift > 0 ? '+' : ''}${shown}% win rate vs ${model.hero.name} average`)
  }
  if (kitNorm > 0.7) reasons.push(`scales ${model.hero.name}'s kit`)
  if (counter > 0.1) reasons.push('wins more against this enemy team')
  else if (counter < -0.1) reasons.push('wins less against this enemy team')
  if (synergy > 0.2) reasons.push('wins more alongside items you already hold')
  else if (synergy < -0.2) reasons.push('wins less alongside items you already hold')
  if (upgrades) {
    const ownedComponent = opts.owned
      .map((id) => model.byId.get(id))
      .find((ownedItem) => ownedItem && item.components.includes(ownedItem.className))
    reasons.push(`upgrades ${ownedComponent?.name ?? 'an item'}, which you already hold`)
  }
  if (overflow) reasons.push(`you already hold ${ownedActives} active items`)
  if (opts.enhanced) {
    const into = row?.carryItemId != null ? model.byId.get(row.carryItemId) : undefined
    if (carry > 0.5 && into) reasons.push(`enhanced version, and it stays enhanced when upgraded into ${into.name}`)
    else reasons.push('enhanced version')
  }
  if (duplicate) reasons.push('you already hold this item')
  const displayHeroFit = opts.enhanced && hasRow ? heroFit - kitExtra : heroFit
  const displayParts: { key: string; label: string; value: number }[] = [
    { key: 'win', label: 'Win rate', value: win },
    { key: 'pick', label: 'Pick rate', value: pick },
    { key: 'heroFit', label: 'Hero fit', value: displayHeroFit },
    { key: 'counter', label: 'Vs enemy team', value: counterPart },
    { key: 'synergy', label: 'With your items', value: synergyPart },
    { key: 'tier', label: 'Item tier', value: tierPart },
    { key: 'active', label: 'Active items', value: activePart },
    { key: 'upgrade', label: 'Upgrade', value: upgradePart },
    { key: 'enhanced', label: 'Enhanced', value: enhancedBonus },
    { key: 'duplicate', label: 'Duplicate', value: duplicatePart },
  ]
  return {
    itemId: item.id,
    name: item.name,
    tier: item.tier,
    grade: '-',
    score,
    enhanced: opts.enhanced,
    rare: opts.rare,
    unknown: false,
    enhancedBonus,
    enhancedNote: opts.enhanced ? note : '',
    reasons,
    rows: tipRows(displayParts, score, hasRow),
    parts,
  }
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? '\u2212' : '+'
  return `${sign}${(Math.abs(cents) / 100).toFixed(2)}`
}

function tipRows(
  displayParts: { key: string; label: string; value: number }[],
  score: number,
  hasRow: boolean,
): TipRow[] {
  if (!hasRow) return [{ key: 'none', label: 'No Street Brawl data', text: 'No Street Brawl data', cents: 0 }]
  const visible = displayParts.filter((part) => Math.round(part.value * 100) !== 0)
  const cents = visible.map((part) => Math.round(part.value * 100))
  const drift = Math.round(score * 100) - cents.reduce((s, v) => s + v, 0)
  if (drift !== 0) {
    let idx = -1
    let best = -1
    visible.forEach((part, i) => {
      if (part.key === 'enhanced') return
      const mag = Math.abs(cents[i])
      if (mag > best) {
        best = mag
        idx = i
      }
    })
    if (idx >= 0) cents[idx] += drift
  }
  return visible.map((part, i) => ({
    key: part.key,
    label: part.label,
    text: formatCents(cents[i]),
    cents: cents[i],
  }))
}

type Dist = { v: number; p: number }[]

function mixDist(parts: [number, Dist][]): Dist {
  const map = new Map<number, number>()
  for (const [weight, dist] of parts) {
    if (weight <= 0) continue
    for (const row of dist) map.set(row.v, (map.get(row.v) ?? 0) + weight * row.p)
  }
  return [...map.entries()].map(([v, p]) => ({ v, p })).sort((a, b) => a.v - b.v)
}

function expectedMax(dists: Dist[]): number {
  const values = [...new Set(dists.flatMap((dist) => dist.map((row) => row.v)))].sort((a, b) => a - b)
  const cdf = dists.map(() => 0)
  let prev = 0
  let expected = 0
  const indexes = dists.map(() => 0)
  for (const value of values) {
    let product = 1
    for (let i = 0; i < dists.length; i++) {
      const dist = dists[i]
      while (indexes[i] < dist.length && dist[indexes[i]].v <= value + 1e-9) {
        cdf[i] += dist[indexes[i]].p
        indexes[i]++
      }
      product *= cdf[i]
    }
    const p = product - prev
    expected += value * p
    prev = product
  }
  return expected
}

function poolScore(model: HeroModel, item: ItemDef, enhanced: boolean, ownedActives: number): number {
  const row = model.rows.get(item.id)
  const penalty = item.active && ownedActives >= 4 ? -W.activeOverflow : 0
  if (!row || row.matches === 0) {
    const plain = item.tier - 1 + penalty
    return enhanced ? plain + 0.6 : plain
  }
  const plain = row.base + penalty
  if (!enhanced) return plain
  const { factor } = enhancementFactor(item, model.hero)
  const bonus = item.tier === 1 ? W.enhancedT1 + W.enhancedCarryT1 * row.carry : W.enhanced + W.enhancedCarry * row.carry
  const extra = factor * row.pop * bonus + W.kit * row.kitNorm * 0.25 * factor
  return plain + extra
}

function tierDist(
  model: HeroModel,
  tier: number,
  rareDraw: boolean,
  enhanced: boolean,
  normalTier: number,
  ownedActives: number,
): Dist {
  const items = model.draftable.filter((item) => item.tier === tier)
  if (!items.length) return [{ v: 0, p: 1 }]
  const weights = items.map((item) => {
    const row = model.rows.get(item.id)
    let weight = 1
    if (tier === 1) {
      const pops = items.map((other) => model.rows.get(other.id)?.pop ?? 0)
      const popSum = pops.reduce((s, v) => s + v, 0)
      const pop = row?.pop ?? 0
      const even = 1 / items.length
      weight = 0.6 * (popSum > 0 ? pop / popSum : even) + 0.4 * even
    }
    if (rareDraw && tier !== normalTier && row?.sGrade) weight *= W.legendaryS
    return weight
  })
  const sum = weights.reduce((s, v) => s + v, 0) || 1
  const map = new Map<number, number>()
  items.forEach((item, i) => {
    const value = poolScore(model, item, enhanced, ownedActives)
    const p = weights[i] / sum
    map.set(value, (map.get(value) ?? 0) + p)
  })
  return [...map.entries()].map(([v, p]) => ({ v, p })).sort((a, b) => a.v - b.v)
}

function slotDist(
  model: HeroModel,
  normalTier: number,
  rareTier: number,
  rare: boolean | null,
  enhanced: boolean | null,
  ownedActives: number,
  cache: Map<string, Dist>,
): Dist {
  const pRare = rare === true ? 1 : rare === false ? 0 : RARE_RATE
  const pEnh = enhanced === true ? 1 : enhanced === false ? 0 : ENHANCED_RATE
  const piece = (tier: number, rareDraw: boolean, enh: boolean, weight: number): [number, Dist] => {
    const key = `${tier}|${rareDraw}|${enh}|${ownedActives}|${normalTier}`
    let dist = cache.get(key)
    if (!dist) {
      dist = tierDist(model, tier, rareDraw, enh, normalTier, ownedActives)
      cache.set(key, dist)
    }
    return [weight, dist]
  }
  return mixDist([
    piece(normalTier, false, false, (1 - pRare) * (1 - pEnh)),
    piece(normalTier, false, true, (1 - pRare) * pEnh),
    piece(rareTier, true, false, pRare * (1 - pEnh)),
    piece(rareTier, true, true, pRare * pEnh),
  ])
}

function futureValue(
  model: HeroModel,
  round: number,
  choiceIndex: number,
  later: number,
  ownedActives: number,
  cache: Map<string, Dist>,
): number {
  const choice = choiceAt(model, round, choiceIndex)
  if (!choice) return later
  const states: [boolean, boolean][] = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ]
  const pOf = (rare: boolean, enh: boolean) => (rare ? RARE_RATE : 1 - RARE_RATE) * (enh ? ENHANCED_RATE : 1 - ENHANCED_RATE)
  let total = 0
  for (const a of states) {
    for (const b of states) {
      for (const c of states) {
        const p = pOf(a[0], a[1]) * pOf(b[0], b[1]) * pOf(c[0], c[1])
        const dists = [a, b, c].map(([rare, enh]) =>
          slotDist(model, choice.normal, choice.rare, rare, enh, ownedActives, cache),
        )
        const redraw = expectedMax(dists)
        const values = [...new Set(dists.flatMap((dist) => dist.map((row) => row.v)))].sort((x, y) => x - y)
        const running = dists.map(() => 0)
        const indexes = dists.map(() => 0)
        let prev = 0
        for (const value of values) {
          let product = 1
          for (let i = 0; i < dists.length; i++) {
            const dist = dists[i]
            while (indexes[i] < dist.length && dist[indexes[i]].v <= value + 1e-9) {
              running[i] += dist[indexes[i]].p
              indexes[i]++
            }
            product *= running[i]
          }
          const q = product - prev
          prev = product
          total += p * q * Math.max(redraw - value, later)
        }
      }
    }
  }
  return total
}

function choiceAt(model: HeroModel, round: number, choiceIndex: number) {
  return model.rounds[round - 1]?.choices[choiceIndex] ?? null
}

export function unknownCeiling(model: HeroModel, normalTier: number, rareTier: number, owned: number[], enemies: number[]): number {
  let best = Number.NEGATIVE_INFINITY
  for (const tier of [normalTier, rareTier]) {
    for (const item of model.draftable) {
      if (item.tier !== tier) continue
      for (const enhanced of [false, true]) {
        const scored = scoreCard(model, item, {
          enhanced,
          rare: tier !== normalTier,
          normalTier,
          owned,
          enemies,
          duplicateInSet: false,
        })
        best = Math.max(best, scored.score)
      }
    }
  }
  return Number.isFinite(best) ? best : 0
}

export function advise(catalog: Catalog, model: HeroModel, input: AdviseInput, grades?: Map<number, string>): Advice {
  const roundBlock = model.rounds[input.round - 1]
  const choice = roundBlock?.choices[input.choice - 1]
  const normalTier = choice?.normal ?? 1
  const rareTier = choice?.rare ?? normalTier
  const configRerolls = model.rerolls[input.round - 1] ?? 0
  const resolved = input.cards.map((card) => {
    const item = card.itemId != null ? model.byId.get(card.itemId) : undefined
    const rare = card.rare == null ? (item ? item.tier > normalTier : null) : card.rare
    return { ...card, rare }
  })
  const rerollsLeft = input.rerollsLeft == null ? configRerolls : Math.min(configRerolls, input.rerollsLeft)
  const seen = new Set<number>()
  const cards: ScoredCard[] = resolved.map((card) => {
    if (card.itemId == null) {
      return {
        itemId: null,
        name: '?',
        tier: 0,
        grade: '?',
        score: 0,
        enhanced: Boolean(card.enhanced),
        rare: Boolean(card.rare),
        unknown: true,
        enhancedBonus: 0,
        enhancedNote: '',
        reasons: [],
        rows: [],
        parts: {},
      }
    }
    const item = model.byId.get(card.itemId)
    if (!item) {
      return {
        itemId: card.itemId,
        name: '?',
        tier: 0,
        grade: '?',
        score: 0,
        enhanced: Boolean(card.enhanced),
        rare: Boolean(card.rare),
        unknown: true,
        enhancedBonus: 0,
        enhancedNote: '',
        reasons: [],
        rows: [],
        parts: {},
      }
    }
    const duplicateInSet = seen.has(item.id)
    seen.add(item.id)
    const rare = card.rare === true || (card.rare == null && item.tier > normalTier)
    const scored = scoreCard(model, item, {
      enhanced: card.enhanced === true,
      rare,
      normalTier,
      owned: input.owned,
      enemies: input.enemies,
      duplicateInSet,
    })
    scored.grade = grades?.get(item.id) ?? '-'
    return scored
  })
  const sure = cards.filter((card) => !card.unknown && card.itemId != null)
  const anyUnknown = cards.some((card) => card.unknown)
  const ranked = [...sure].sort((a, b) => b.score - a.score || (a.itemId ?? 0) - (b.itemId ?? 0))
  const best = ranked[0]
  const ceiling = anyUnknown ? unknownCeiling(model, normalTier, rareTier, input.owned, input.enemies) : null
  const ownedActives = input.owned.filter((id) => model.byId.get(id)?.active).length
  const cache = new Map<string, Dist>()
  let hold = 0
  for (let next = (roundBlock?.choices.length ?? 1) - 1; next > input.choice - 1; next--) {
    hold = futureValue(model, input.round, next, hold, ownedActives, cache)
  }
  let expectedBest = 0
  let currentBest = 0
  let gain = 0
  if (sure.length && !anyUnknown && choice) {
    const dists = resolved.map((card) =>
      slotDist(model, normalTier, rareTier, card.rare, card.enhanced, ownedActives, cache),
    )
    expectedBest = expectedMax(dists)
    if (best) {
      const synergy = best.parts.synergy ?? 0
      const counter = best.parts.counter ?? 0
      const upgrade = best.parts.upgrade ?? 0
      currentBest = best.score - synergy - counter - upgrade
    }
    gain = expectedBest - currentBest
  }
  let reroll = false
  let takeId: number | null = best?.itemId ?? null
  if (configRerolls <= 0 || rerollsLeft <= 0 || anyUnknown) {
    reroll = false
    if (anyUnknown) {
      takeId = best && ceiling != null && best.score > ceiling ? best.itemId : null
    }
  } else if (gain > W.rerollThreshold && gain > hold) {
    reroll = true
    takeId = null
  }
  return {
    cards,
    takeId,
    reroll,
    expectedBest,
    currentBest,
    gain,
    hold,
    unknownCeiling: ceiling,
    rerollsLeft,
  }
}

/** Global tier-list grades for items, keyed by item id. */
export function itemGrades(catalog: Catalog): Map<number, string> {
  const totals = new Map<number, { wins: number; matches: number; tier: number }>()
  for (const brawl of catalog.brawl.values()) {
    for (const [id, wins, , matches] of brawl.items) {
      const item = catalog.items.find((row) => row.id === id)
      if (!item || !isDraftable(item)) continue
      const cur = totals.get(id) ?? { wins: 0, matches: 0, tier: item.tier }
      cur.wins += wins
      cur.matches += matches
      totals.set(id, cur)
    }
  }
  const grades = new Map<number, string>()
  const tiers = new Set([...totals.values()].map((row) => row.tier))
  for (const tier of tiers) {
    const rows = [...totals.entries()]
      .filter(([, row]) => row.tier === tier && row.matches > 0)
      .map(([id, row]) => ({ id, wins: row.wins, matches: row.matches }))
    for (const graded of gradePopulation(rows, catalog.manifest.heroGames)) grades.set(graded.id, graded.grade)
  }
  return grades
}

export function heroGrades(catalog: Catalog): Map<number, string> {
  const rows = catalog.heroStats
    .filter(([, , , matches]) => matches > 0)
    .map(([id, wins, , matches]) => ({ id, wins, matches }))
  const grades = new Map<number, string>()
  for (const graded of gradePopulation(rows, catalog.manifest.heroGames)) grades.set(graded.id, graded.grade)
  return grades
}
