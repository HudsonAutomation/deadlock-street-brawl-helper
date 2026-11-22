import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AbilityDef, Catalog, HeroBrawl, HeroDef, ItemDef, Manifest, ModeConfig } from './model'

const here = dirname(fileURLToPath(import.meta.url))

export function snapshotDir(): string {
  const candidates = [
    join(process.cwd(), 'data', 'snapshot'),
    join(here, '../../data/snapshot'),
    join(here, '../../../data/snapshot'),
  ]
  return candidates.find((dir) => existsSync(join(dir, 'manifest.json'))) ?? candidates[0]
}

export function snapshotReady(): boolean {
  return existsSync(join(snapshotDir(), 'manifest.json')) && existsSync(join(snapshotDir(), 'brawl'))
}

export function loadCatalog(): Catalog {
  const root = snapshotDir()
  const read = <T>(name: string): T => JSON.parse(readFileSync(join(root, name), 'utf8')) as T
  const brawl = new Map<number, HeroBrawl>()
  for (const file of readdirSync(join(root, 'brawl'))) {
    if (!file.endsWith('.json')) continue
    const row = read<HeroBrawl>(join('brawl', file))
    brawl.set(row.heroId, row)
  }
  return {
    heroes: read<HeroDef[]>('heroes.json'),
    abilities: read<AbilityDef[]>('abilities.json'),
    items: read<ItemDef[]>('items.json'),
    mode: read<ModeConfig>('mode.json'),
    brawl,
    heroStats: read<[number, number, number, number][]>('hero-stats.json'),
    manifest: read<Manifest>('manifest.json'),
  }
}
