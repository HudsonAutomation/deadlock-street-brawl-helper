/** Item and hero name matching. Letters only, then the similarity rules in the spec. */

export function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

export function editDistance(a: string, b: string): number {
  const n = a.length
  const m = b.length
  const row = new Array<number>(m + 1)
  for (let j = 0; j <= m; j++) row[j] = j
  for (let i = 1; i <= n; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= m; j++) {
      const cur = row[j]
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = cur
    }
  }
  return row[m]
}

function similarity(read: string, name: string): number {
  if (!read || !name) return 0
  const whole = 1 - editDistance(read, name) / Math.max(read.length, name.length)
  let best = whole
  if (name.length >= 5 && read.includes(name)) {
    best = Math.max(best, 0.8 + 0.2 * (name.length / read.length))
  }
  if (read.length >= 6 && (name.startsWith(read) || name.endsWith(read))) {
    best = Math.max(best, 0.7 + 0.3 * (read.length / name.length))
  }
  if (read.length >= 6 && name.length > read.length) {
    let matched = 0
    const widths = [read.length - 1, read.length, read.length + 1].filter((w) => w > 0 && w <= name.length)
    for (const width of widths) {
      for (let i = 0; i <= name.length - width; i++) {
        const dist = editDistance(read, name.slice(i, i + width))
        if (dist <= 1) matched = Math.max(matched, read.length - dist)
      }
    }
    if (matched > 0) best = Math.max(best, 0.7 + 0.3 * (matched / name.length))
  }
  return best
}

export interface NameHit {
  id: number
  name: string
  score: number
}

export interface CatalogName {
  id: number
  name: string
}

/** First id wins when two catalog rows share a normalised name. */
export function nameList(items: CatalogName[]): CatalogName[] {
  const seen = new Set<string>()
  const out: CatalogName[] = []
  for (const item of items) {
    const key = normaliseName(item.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function matchName(raw: string, catalog: CatalogName[], acceptAt = 0.75): NameHit | null {
  const read = normaliseName(raw)
  if (read.length < 3) return null
  return finish(read, catalog, acceptAt)
}

function finish(read: string, catalog: CatalogName[], acceptAt: number): NameHit | null {
  const scored: NameHit[] = []
  for (const item of catalog) {
    const name = normaliseName(item.name)
    let score = similarity(read, name)
    if (read.length < 5) score = read === name ? 1 : 0
    scored.push({ id: item.id, name: item.name, score })
  }
  scored.sort((a, b) => b.score - a.score || a.id - b.id)
  const best = scored[0]
  if (!best) return null
  const second = scored[1]?.score ?? 0
  if (best.score < acceptAt) return null
  if (best.score < second + 0.08 && second > 0) return null
  return best
}

export function matchHeroName(raw: string, heroes: CatalogName[]): NameHit | null {
  return finish(normaliseName(raw), heroes, 0.85)
}
