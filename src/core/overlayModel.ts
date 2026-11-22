/** What the overlay draws. Colours match the control window. */

export const PALETTE = {
  teal: '#2ec4b6',
  tealInk: '#06201d',
  page: '#101314',
  text: '#ece6da',
  muted: '#a39e92',
  grey: '#8a9092',
  gold: '#e6b325',
  goldInk: '#1b1408',
  alt: '#8d7b58',
  amber: '#f0a830',
  veil: 'rgba(0,0,0,0.35)',
  plate: 'rgba(16, 19, 20, 0.85)',
}

export interface PlateDraw {
  slot: number
  kind: 'take' | 'other' | 'unknown'
  fill: string
  text: string
  badge: string
  opacity: number
  veil: boolean
  enhancedLabel: string | null
  scoreText: string
  circle: boolean
}

export interface OverlayDraw {
  visible: boolean
  reading: boolean
  plates: PlateDraw[]
  reroll: boolean
  rerollText: string | null
  myPicks: { slot: number; tier: 'main' | 'secondary' }[]
}

export function platesWouldTouch(widths: number[], gap: number): boolean {
  for (let i = 0; i < widths.length - 1; i++) {
    if (gap < widths[i] / 2 + widths[i + 1] / 2 + 2) return true
  }
  return gap < 2
}

export function enhancedLabel(bonus: number, tight: boolean): string {
  const n = bonus.toFixed(2)
  return tight ? `Enh: (+${n})` : `Enhanced: (+${n})`
}

export function drawAdvice(input: {
  draft: boolean
  ids: (number | null)[]
  scores: (number | null)[]
  grades: string[]
  names: string[]
  enhancedBonus: number[]
  takeId: number | null
  reroll: boolean
  expected: number | null
  current: number | null
  picks: ('main' | 'secondary' | null)[]
  tight: boolean
  panel: boolean
  dot: boolean
  suppressed: boolean
}): OverlayDraw {
  const hasAdvice = input.scores.some((score) => score != null)
  const plates: PlateDraw[] = []
  if (input.draft && hasAdvice) {
    input.ids.forEach((id, slot) => {
      const unknown = id == null || input.scores[slot] == null
      const take = !input.reroll && id != null && id === input.takeId
      const veil = input.reroll || (!unknown && !take) || (unknown && (input.takeId != null || input.reroll))
      const kind = unknown ? 'unknown' : take ? 'take' : 'other'
      plates.push({
        slot,
        kind,
        fill: take ? PALETTE.teal : PALETTE.plate,
        text: take ? PALETTE.tealInk : PALETTE.grey,
        badge: unknown ? '?' : input.grades[slot] || '-',
        opacity: take ? 1 : 0.6,
        veil: Boolean(veil) && (input.takeId != null || input.reroll),
        enhancedLabel:
          !unknown && input.enhancedBonus[slot] > 0 ? enhancedLabel(input.enhancedBonus[slot], input.tight) : null,
        scoreText: unknown ? '?' : `Score: ${input.scores[slot]!.toFixed(2)}`,
        circle: take,
      })
    })
  }
  const content = plates.length > 0 || input.panel || input.dot || (input.draft && !hasAdvice)
  return {
    visible: content && !input.suppressed,
    reading: input.draft && !hasAdvice,
    plates,
    reroll: input.reroll && plates.length > 0,
    rerollText:
      input.reroll && input.expected != null && input.current != null
        ? `Re-roll: ${input.expected.toFixed(2)} vs ${input.current.toFixed(2)}`
        : null,
    myPicks: input.picks.flatMap((tier, slot) => (tier && input.ids[slot] != null ? [{ slot, tier }] : [])),
  }
}

export function devToolsEnabled(version: string, dev: boolean): boolean {
  if (dev) return true
  return /-rc(\.|$)/.test(version)
}
