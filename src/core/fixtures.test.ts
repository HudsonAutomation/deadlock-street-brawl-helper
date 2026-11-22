import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('B16 card sample', () => {
  it('counts 4 rare and 3 enhanced cards out of 27', () => {
    const labels = JSON.parse(readFileSync('scripts/fixtures/brawl-cards/labels.json', 'utf8')) as Record<
      string,
      { rare?: boolean; enhanced?: boolean }
    >
    const rows = Object.values(labels)
    expect(rows).toHaveLength(27)
    expect(rows.filter((row) => row.rare).length).toBe(4)
    expect(rows.filter((row) => row.enhanced).length).toBe(3)
  })
})
