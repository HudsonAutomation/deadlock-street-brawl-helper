/** Standard ability order, and the rules for a hand-edited order. */

import type { AbilityDef, HeroBrawl } from './model'

export const POINT_BUDGETS = [6, 6, 5, 5, 10]
export const PILL_COSTS = [1, 2, 5]
export const NOT_BOUGHT = 0

export interface OrderPlan {
  /** 12 rounds, bar order, tier 1 then 2 then 3. 0 means not bought. */
  rounds: number[]
  reliable: boolean
  matches: number
  winRate: number
}

export interface OrderProblem {
  ok: boolean
  message: string
}

function shrunk(wins: number, matches: number, mean: number, k: number): number {
  return (wins + k * mean) / (matches + k)
}

export function standardOrder(abilities: AbilityDef[], brawl: HeroBrawl | null): OrderPlan {
  const slotOf = new Map<number, number>()
  abilities.forEach((ability, index) => {
    if (ability.id != null) slotOf.set(ability.id, index)
  })
  const sequences = (brawl?.orders ?? [])
    .map(([ids, wins, matches]) => ({ ids, wins, matches }))
    .filter((row) => row.matches > 0)
  const heroMatches = sequences.reduce((s, row) => s + row.matches, 0)
  const heroWins = sequences.reduce((s, row) => s + row.wins, 0)
  const mean = heroMatches > 0 ? heroWins / heroMatches : 0.5
  const largest = sequences.reduce((m, row) => Math.max(m, row.matches), 0)
  const k = Math.max(50, 0.05 * largest)
  const chosen: number[] = []
  const counts = [0, 0, 0, 0]
  let reliable = true
  while (chosen.length < 12) {
    const groups = new Map<number, { wins: number; matches: number }>()
    for (const row of sequences) {
      if (!row.ids.slice(0, chosen.length).every((id, i) => slotOf.get(id) === chosen[i])) continue
      const nextId = row.ids[chosen.length]
      if (nextId == null) continue
      const slot = slotOf.get(nextId)
      if (slot == null || counts[slot] >= 3) continue
      const group = groups.get(slot) ?? { wins: 0, matches: 0 }
      group.wins += row.wins
      group.matches += row.matches
      groups.set(slot, group)
    }
    let bestSlot = -1
    let bestScore = -Infinity
    let bestMatches = 0
    for (const [slot, group] of groups) {
      const score = shrunk(group.wins, group.matches, mean, k) * Math.log(1 + group.matches)
      if (score > bestScore) {
        bestScore = score
        bestSlot = slot
        bestMatches = group.matches
      }
    }
    if (bestSlot < 0 || bestMatches < 100) {
      reliable = false
      break
    }
    chosen.push(bestSlot)
    counts[bestSlot]++
  }
  if (chosen.length < 12) {
    reliable = false
    for (let tier = 0; tier < 3 && chosen.length < 12; tier++) {
      for (let slot = 0; slot < 4 && chosen.length < 12; slot++) {
        const have = chosen.filter((value) => value === slot).length
        if (have <= tier) chosen.push(slot)
      }
    }
  }
  const support = sequences.filter((row) =>
    chosen.every((slot, index) => slotOf.get(row.ids[index] ?? -1) === slot),
  )
  const matches = support.reduce((s, row) => s + row.matches, 0)
  const wins = support.reduce((s, row) => s + row.wins, 0)
  return {
    rounds: placeSteps(chosen),
    reliable: reliable && matches >= 100,
    matches,
    winRate: matches > 0 ? wins / matches : 0,
  }
}

/** Place ability steps (slot index, nth time is the next pill) onto the five rounds. */
export function placeSteps(steps: number[]): number[] {
  const placed = new Array<number>(12).fill(NOT_BOUGHT)
  let pool = 0
  let cursor = 0
  const seen = [0, 0, 0, 0]
  for (let round = 0; round < 5; round++) {
    pool += POINT_BUDGETS[round]
    while (cursor < steps.length) {
      const slot = steps[cursor]
      const tier = seen[slot]
      if (tier > 2) {
        cursor++
        continue
      }
      const cost = PILL_COSTS[tier]
      if (cost > pool) break
      placed[slot * 3 + tier] = round + 1
      seen[slot]++
      pool -= cost
      cursor++
    }
  }
  // Leftovers: tier 1s, then tier 2s, then tier 3s, bar order.
  for (let tier = 0; tier < 3; tier++) {
    for (let slot = 0; slot < 4; slot++) {
      const index = slot * 3 + tier
      if (placed[index] !== NOT_BOUGHT) continue
      const need = tier > 0 ? placed[slot * 3 + tier - 1] : 1
      for (let round = Math.max(1, need); round <= 5; round++) {
        const spent = spentBy(placed, round) + PILL_COSTS[tier]
        if (spent <= capAt(round)) {
          placed[index] = round
          break
        }
      }
    }
  }
  return placed
}

export function capAt(round: number): number {
  return POINT_BUDGETS.slice(0, round).reduce((s, v) => s + v, 0)
}

export function spentBy(rounds: number[], round: number): number {
  let spent = 0
  for (let i = 0; i < 12; i++) {
    const bought = rounds[i] ?? 0
    if (bought >= 1 && bought <= round) spent += PILL_COSTS[i % 3]
  }
  return spent
}

export function pointsLeft(rounds: number[], round: number): number {
  return capAt(round) - spentBy(rounds, round)
}

export function validateOrder(rounds: number[]): OrderProblem {
  if (rounds.length !== 12 || rounds.some((round) => round < 0 || round > 5)) {
    return { ok: false, message: 'Pick a round for every point.' }
  }
  for (let slot = 0; slot < 4; slot++) {
    for (let tier = 1; tier < 3; tier++) {
      const higher = rounds[slot * 3 + tier]
      const lower = rounds[slot * 3 + tier - 1]
      if (higher === 0) continue
      if (lower === 0 || lower > higher) {
        const cost = PILL_COSTS[tier]
        return { ok: false, message: `Ability ${slot + 1}: a ${cost} point upgrade comes before the one under it.` }
      }
    }
  }
  for (let round = 1; round <= 5; round++) {
    const spent = spentBy(rounds, round)
    const cap = capAt(round)
    if (spent > cap) return { ok: false, message: `Round ${round}: ${spent} points spent by now, only ${cap} handed out.` }
  }
  const unfinished = rounds.some((round) => round === 0)
  if (unfinished) return { ok: false, message: 'Pick a round for every point.' }
  return { ok: true, message: '' }
}

export function orderIsComplete(rounds: number[]): boolean {
  return rounds.length === 12 && rounds.every((round) => round >= 1 && round <= 5) && validateOrder(rounds).ok
}

export interface BuyResult {
  rounds: number[]
  saved: boolean
  message: string
}

/** Buy or sell one pill. A refused click does not change the stored order. */
export function clickPill(rounds: number[], slot: number, tier: number, selectedRound: number, abilityName: string): BuyResult {
  const next = rounds.slice()
  const index = slot * 3 + tier
  const current = next[index] ?? 0
  if (current > 0) {
    for (let above = tier; above < 3; above++) next[slot * 3 + above] = NOT_BOUGHT
    return { rounds: next, saved: true, message: '' }
  }
  if (tier > 0) {
    const lower = next[slot * 3 + tier - 1] ?? 0
    if (lower === 0 || lower > selectedRound) {
      const cost = PILL_COSTS[tier]
      if (lower === 0) {
        return {
          rounds,
          saved: false,
          message: `Ability ${slot + 1}: a ${cost} point upgrade comes before the one under it.`,
        }
      }
      return {
        rounds,
        saved: false,
        message: `${abilityName}: buy the ${cost} point upgrade first, in round ${selectedRound} or an earlier one.`,
      }
    }
  }
  next[index] = selectedRound
  const problem = validateSpend(next)
  if (problem) return { rounds, saved: false, message: problem }
  return { rounds: next, saved: true, message: '' }
}

function validateSpend(rounds: number[]): string | null {
  for (let round = 1; round <= 5; round++) {
    const spent = spentBy(rounds, round)
    const cap = capAt(round)
    if (spent > cap) return `Round ${round}: ${spent} points spent by now, only ${cap} handed out.`
  }
  return null
}

export function evidenceLine(custom: number[] | null, plan: OrderPlan): string {
  if (custom && orderIsComplete(custom)) return 'Your order'
  if (!plan.reliable || plan.matches < 100) return 'Default order: No reliable order'
  return `Default order: ${plan.matches} matches, ${(plan.winRate * 100).toFixed(0)}% win rate`
}

export function summaryLine(heroName: string, custom: number[] | null): string {
  if (!custom) return `Ability order for ${heroName}: standard`
  if (orderIsComplete(custom)) return `Ability order for ${heroName}: yours`
  return `Ability order for ${heroName}: yours (not valid, using standard)`
}

export function activeOrder(custom: number[] | null, plan: OrderPlan): number[] {
  if (custom && orderIsComplete(custom)) return custom
  return plan.rounds
}
