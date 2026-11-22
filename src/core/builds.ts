/** Turn a public build into Main and Secondary lists. */

export interface BuildMod {
  ability_id?: number
  annotation?: string | null
}

export interface BuildCategory {
  name?: string
  optional?: boolean
  mods?: BuildMod[]
  description?: string
}

export interface HeroBuild {
  hero_id: number
  hero_build_id: number
  author_account_id?: number | null
  last_updated_timestamp?: number | null
  name?: string
  description?: string | null
  version: number
  origin_build_id?: number | null
  details?: { mod_categories?: BuildCategory[] }
}

export interface CatalogItemRef {
  id: number
  name: string
  className?: string
}

export interface PickRow {
  itemId: number | null
  name: string
  category: string
  detail: string
  draftable: boolean
}

export interface PickList {
  heroId: number
  buildId: number
  version: number
  name: string
  author: string
  updated: string | null
  matchCopy: boolean
  note: string
  credit: string
  description: string
  mainCategories: string[]
  secondaryCategories: string[]
  main: PickRow[]
  secondary: PickRow[]
}

const OSES = 1840902834
const MATCH_COPY_IDS = new Set([526641, 513995, 333337])
const SCARLET_ID = 998571

const SCARLET_MAIN = new Set(['early spikes', 'midgame', 'late options'])
const SCARLET_SECONDARY = new Set(['vs guns', 'early options', 'hard lane', 'counters', 'components', 'wip'])

export function categoryTitle(name: string | undefined): string {
  if (!name) return ''
  const key = name.startsWith('#Citadel_HeroBuilds_') ? name.slice('#Citadel_HeroBuilds_'.length) : name
  if (!key) return ''
  if (key === name && !name.startsWith('#Citadel_HeroBuilds_')) return name
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
}

export function authorLabel(accountId: number | null | undefined): string {
  if (accountId == null) return 'unknown'
  if (accountId === OSES) return 'oses'
  return `account ${accountId}`
}

export function updatedDay(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function isSecondary(build: HeroBuild, category: string, optional: boolean | undefined): boolean {
  if (build.hero_build_id === SCARLET_ID) {
    const key = category.toLowerCase()
    if (SCARLET_MAIN.has(key)) return false
    if (SCARLET_SECONDARY.has(key)) return true
    return Boolean(optional)
  }
  return Boolean(optional)
}

export function splitBuild(build: HeroBuild, itemsById: Map<number, CatalogItemRef>, names: Map<string, CatalogItemRef>): PickList {
  const description = build.description ?? ''
  const categories = build.details?.mod_categories ?? []
  const main: PickRow[] = []
  const secondary: PickRow[] = []
  const mainCategories: string[] = []
  const secondaryCategories: string[] = []
  const seen = new Set<string>()
  for (const category of categories) {
    const title = categoryTitle(category.name)
    const secondaryTier = isSecondary(build, title, category.optional)
    if (title) (secondaryTier ? secondaryCategories : mainCategories).push(title)
    for (const mod of category.mods ?? []) {
      const byId = mod.ability_id != null ? itemsById.get(mod.ability_id) : undefined
      const row = byId ?? null
      const name = row?.name ?? (mod.ability_id != null ? `item ${mod.ability_id}` : '')
      if (!name) continue
      const key = name.toLowerCase().replace(/[^a-z]/g, '')
      if (seen.has(key)) continue
      seen.add(key)
      const named = row ?? names.get(key)
      const pick: PickRow = {
        itemId: named?.id ?? null,
        name: named?.name ?? name,
        category: title || 'custom',
        detail: mod.annotation ?? '',
        draftable: named != null,
      }
      ;(secondaryTier ? secondary : main).push(pick)
    }
  }
  const lowered = description.toLowerCase()
  let note = ''
  if (lowered.includes('always use arcane surge on ult')) note = 'always use arcane surge on ult'
  let credit = ''
  const twitch = description.match(/twitch\.tv\/([A-Za-z0-9_]+)/i)
  if (twitch && build.origin_build_id) credit = `based on build ${build.origin_build_id} by ${twitch[1]}`
  else if (build.origin_build_id) credit = `based on build ${build.origin_build_id}`
  const matchCopy = MATCH_COPY_IDS.has(build.hero_build_id) || /created from match id/i.test(description)
  return {
    heroId: build.hero_id,
    buildId: build.hero_build_id,
    version: build.version,
    name: (build.name || `build ${build.hero_build_id}`).replace(/!/g, ''),
    author: authorLabel(build.author_account_id),
    updated: updatedDay(build.last_updated_timestamp),
    matchCopy,
    note,
    credit,
    description,
    mainCategories: [...new Set(mainCategories)],
    secondaryCategories: [...new Set(secondaryCategories)],
    main,
    secondary,
  }
}

export function sourceLine(list: PickList): string {
  const date = list.updated ? `, updated ${list.updated}` : ''
  return `${list.author}, build ${list.buildId}, version ${list.version}${date}`
}
