/** S/A/B/C grades. Population standard deviation, 70/30 mix, fixed cuts. */

export type GradeLetter = 'S' | 'A' | 'B' | 'C'

export interface GradeInput {
  id: number
  wins: number
  matches: number
}

export interface GradeResult {
  id: number
  grade: GradeLetter
  combined: number
  winRate: number
  usage: number
}

export function populationZ(values: number[]): number[] {
  if (values.length < 2) return values.map(() => 0)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  const sd = Math.sqrt(variance)
  if (sd === 0) return values.map(() => 0)
  return values.map((v) => (v - mean) / sd)
}

export function letterFor(z: number): GradeLetter {
  if (z >= 1.15) return 'S'
  if (z >= 0.35) return 'A'
  if (z >= -0.6) return 'B'
  return 'C'
}

/** Grade one population. Rows with no matches are left out by the caller. */
export function gradePopulation(rows: GradeInput[], heroGames: number): GradeResult[] {
  const live = rows.filter((row) => row.matches > 0)
  if (!live.length) return []
  const games = heroGames > 0 ? heroGames : live.reduce((s, row) => s + row.matches, 0)
  const popMatches = live.reduce((s, row) => s + row.matches, 0)
  const popWins = live.reduce((s, row) => s + row.wins, 0)
  const popRate = popMatches > 0 ? popWins / popMatches : 0.5
  const shrunk = live.map((row) => (row.wins + 500 * popRate) / (row.matches + 500))
  const usage = live.map((row) => Math.log(Math.max(1, row.matches) / games))
  const mix = populationZ(shrunk).map((z, i) => 0.7 * z + 0.3 * populationZ(usage)[i])
  const combined = populationZ(mix)
  const ranked = live.map((row, i) => ({
    id: row.id,
    grade: letterFor(combined[i]),
    combined: combined[i],
    winRate: row.matches > 0 ? row.wins / row.matches : 0,
    usage: games > 0 ? row.matches / games : 0,
  }))
  ranked.sort((a, b) => b.combined - a.combined || a.id - b.id)
  return ranked
}
