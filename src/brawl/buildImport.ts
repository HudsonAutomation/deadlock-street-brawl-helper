// Turns a public deadlock-api.com build into a My Picks list. The screen reader never calls this;
// the settings button and scripts/import-default-builds.mjs do. Name matching uses the same
// letter key and fuzzy scorer as the card OCR (names.ts).

import { MATCH_COPY_BUILD_IDS, OSES_ACCOUNT_ID, SCARLET_BUILD_ID } from './defaultBuilds.ts';
import { matchItemName, nameList, normaliseName, type NameList } from './names.ts';

export type PickTier = 'main' | 'secondary';

export interface PickEntry {
  name: string;
  /** Recognizer item id, or null when this app has no such draft item. */
  itemId: number | null;
  tier: PickTier;
  /** Category label from the build. Empty when the build left it blank. */
  category: string;
  /** Extra build note, such as an imbue target. */
  detail?: string;
}

export interface PickCategory {
  name: string;
  tier: PickTier;
  optional: boolean;
  description: string;
}

export interface PickSource {
  buildId: number;
  version: number;
  name: string;
  heroId: number;
  author: string;
  authorAccountId: number | null;
  originBuildId: number | null;
  /** UTC day, YYYY-MM-DD. */
  updated: string;
  description: string;
  /** Short line worth keeping visible, such as the Scarlet ult note. */
  note: string;
  /** Where the build says it came from, when that is not the author. */
  credit: string;
  matchCopy: boolean;
}

export interface HeroPickList {
  id: string;
  heroId: number;
  entries: PickEntry[];
  categories: PickCategory[];
  source: PickSource | null;
}

export interface HeroPicks {
  heroId: number;
  activeId: string;
  lists: HeroPickList[];
}

export class BuildImportError extends Error {
  readonly reason: 'empty' | 'hero' | 'version' | 'build' | 'shape' | 'network' | 'not-found';
  constructor(message: string, reason: BuildImportError['reason']) {
    super(message);
    this.name = 'BuildImportError';
    this.reason = reason;
  }
}

/** Daihan's tiers for Scarlet 9X. Every other build uses the optional flag. */
export const SCARLET_CATEGORY_TIERS: Record<string, PickTier> = {
  'early spikes': 'main',
  midgame: 'main',
  'late options': 'main',
  'vs guns': 'secondary',
  'early options': 'secondary',
  'hard lane': 'secondary',
  counters: 'secondary',
  components: 'secondary',
  wip: 'secondary',
};

export const BUILDS_URL = 'https://api.deadlock-api.com/v1/builds';
export const ASSETS_URL = 'https://api.deadlock-api.com/v1/assets/items';

export interface AssetName {
  id: number;
  name: string;
}

export interface CatalogItem {
  id: number;
  name: string;
  disabled: boolean;
  item_tier: number;
}

/** Same rule as scripts/build-icon-index.mjs: the items the recognizer can name. */
export function isDraftItem(item: { disabled: boolean; item_tier: number; name: string }): boolean {
  return !item.disabled && item.item_tier >= 1 && !/^upgrade_|Disabled/.test(item.name);
}

export function catalogFromItems(items: CatalogItem[]): { list: NameList; names: Record<number, string> } {
  const usable = items.filter(isDraftItem);
  const names: Record<number, string> = {};
  for (const item of usable) names[item.id] = item.name;
  return {
    list: nameList(
      usable.map((item) => item.id),
      names,
    ),
    names,
  };
}

/** A category title a person can read. Localization keys become words; a blank stays blank. */
export function categoryLabel(name: string): string {
  const raw = name.trim();
  const loc = /^#Citadel_HeroBuilds_(.+)$/.exec(raw);
  const text = loc ? loc[1]! : raw;
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

/** Optional categories are Secondary. Anything else, including an unset flag, is Main. */
export function tierForCategory(
  name: string,
  optional: boolean | null | undefined,
  override?: Record<string, PickTier>,
): PickTier {
  const mapped = override?.[name.trim().toLowerCase()];
  if (mapped) return mapped;
  return optional === true ? 'secondary' : 'main';
}

export function authorFromAccount(accountId: number | null): string {
  if (accountId === OSES_ACCOUNT_ID) return 'oses';
  if (accountId == null) return 'unknown';
  return `account ${accountId}`;
}

export function isMatchCopy(description: string, buildId: number): boolean {
  if (/created from match\s*id/i.test(description)) return true;
  return MATCH_COPY_BUILD_IDS.includes(buildId);
}

/** The Scarlet line, when the description contains it. */
export function buildNote(description: string): string {
  const flat = description.replace(/\s+/g, ' ').trim();
  const hit = /always use arcane surge on ult/i.exec(flat);
  return hit ? hit[0].toLowerCase() : '';
}

export function buildCredit(description: string, originBuildId: number | null): string {
  const who = /twitch\.tv\/[A-Za-z0-9_]+/i.exec(description)?.[0];
  if (originBuildId && who) return `based on build ${originBuildId} by ${who}`;
  if (originBuildId) return `based on build ${originBuildId}`;
  return '';
}

export function utcDay(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return '';
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function assetNames(body: unknown): AssetName[] {
  if (!Array.isArray(body)) throw new BuildImportError('Item name list was not a list', 'shape');
  const out: AssetName[] = [];
  for (const row of body) {
    if (!row || typeof row !== 'object') continue;
    const id = (row as { id?: unknown }).id;
    const name = (row as { name?: unknown }).name;
    if (typeof id !== 'number' || typeof name !== 'string' || !name.trim()) continue;
    out.push({ id, name: name.trim() });
  }
  if (!out.length) throw new BuildImportError('Item name list was empty', 'shape');
  return out;
}

interface RawMod {
  abilityId: number;
  imbueId: number | null;
  annotation: string;
}
interface RawCategory {
  name: string;
  optional: boolean;
  description: string;
  mods: RawMod[];
}

function asRecord(v: unknown, message: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BuildImportError(message, 'shape');
  return v as Record<string, unknown>;
}

function heroBuildOf(body: unknown): Record<string, unknown> {
  const row = Array.isArray(body) ? body[0] : body;
  const rec = asRecord(row, 'Build response was empty');
  return asRecord(rec.hero_build, 'Build response had no hero_build');
}

function readCategories(details: unknown): RawCategory[] {
  const rec = asRecord(details, 'Build had no details');
  const cats = rec.mod_categories;
  if (!Array.isArray(cats)) throw new BuildImportError('Build had no categories', 'shape');
  return cats.map((cat) => {
    const c = asRecord(cat, 'Build category was not an object');
    const mods = Array.isArray(c.mods) ? c.mods : [];
    return {
      name: typeof c.name === 'string' ? c.name : '',
      optional: c.optional === true,
      description: typeof c.description === 'string' ? c.description : '',
      mods: mods.flatMap((mod) => {
        if (!mod || typeof mod !== 'object') return [];
        const abilityId = (mod as { ability_id?: unknown }).ability_id;
        if (typeof abilityId !== 'number' || abilityId <= 0) return [];
        const imbue = (mod as { imbue_target_ability_id?: unknown }).imbue_target_ability_id;
        const note = (mod as { annotation?: unknown }).annotation;
        return [
          {
            abilityId,
            imbueId: typeof imbue === 'number' && imbue > 0 ? imbue : null,
            annotation: typeof note === 'string' ? note.trim() : '',
          },
        ];
      }),
    };
  });
}

export interface ParseBuildOptions {
  expectedBuildId?: number;
  expectedVersion?: number;
  expectedHeroId?: number;
  /** Category label (lower case) to a tier. Scarlet 9X passes SCARLET_CATEGORY_TIERS. */
  categoryTiers?: Record<string, PickTier>;
}

function resolveName(
  apiName: string,
  catalog: NameList,
  names: Record<number, string>,
): { itemId: number; name: string } | null {
  const key = normaliseName(apiName);
  if (key) {
    const exact = catalog.find((row) => row.key === key);
    if (exact) return { itemId: exact.id, name: names[exact.id] ?? apiName };
  }
  const fuzzy = matchItemName(apiName, catalog);
  if (!fuzzy) return null;
  return { itemId: fuzzy.itemId, name: names[fuzzy.itemId] ?? apiName };
}

/** Parses one builds response plus the assets/items list. Throws BuildImportError on a bad payload. */
export function parseBuildPayload(
  body: unknown,
  assetsBody: unknown,
  catalog: NameList,
  names: Record<number, string>,
  opts: ParseBuildOptions = {},
): HeroPickList {
  const assets = assetNames(assetsBody);
  const byAsset = new Map<number, string>();
  for (const asset of assets) if (!byAsset.has(asset.id)) byAsset.set(asset.id, asset.name);

  const hb = heroBuildOf(body);
  const buildId = hb.hero_build_id;
  const version = hb.version;
  const heroId = hb.hero_id;
  if (typeof buildId !== 'number' || typeof version !== 'number' || typeof heroId !== 'number')
    throw new BuildImportError('Build was missing its id, version or hero', 'shape');
  if (opts.expectedBuildId != null && buildId !== opts.expectedBuildId)
    throw new BuildImportError(`Build ${buildId} did not match requested id ${opts.expectedBuildId}`, 'build');
  if (opts.expectedVersion != null && version !== opts.expectedVersion)
    throw new BuildImportError(`Build ${buildId} is version ${version}, expected ${opts.expectedVersion}`, 'version');
  if (opts.expectedHeroId != null && heroId !== opts.expectedHeroId)
    throw new BuildImportError(
      `Build ${buildId} version ${version} is hero ${heroId}, expected ${opts.expectedHeroId}`,
      'hero',
    );

  const description = typeof hb.description === 'string' ? hb.description.trim() : '';
  const buildName = typeof hb.name === 'string' ? hb.name.trim() : '';
  const accountId = typeof hb.author_account_id === 'number' ? hb.author_account_id : null;
  const origin = typeof hb.origin_build_id === 'number' && hb.origin_build_id > 0 ? hb.origin_build_id : null;
  const updated = typeof hb.last_updated_timestamp === 'number' ? utcDay(hb.last_updated_timestamp) : '';
  const tiers = opts.categoryTiers ?? (buildId === SCARLET_BUILD_ID ? SCARLET_CATEGORY_TIERS : undefined);

  const entries: PickEntry[] = [];
  const categories: PickCategory[] = [];
  const seen = new Map<string, number>();

  for (const cat of readCategories(hb.details)) {
    const label = categoryLabel(cat.name);
    const tier = tierForCategory(label, cat.optional, tiers);
    categories.push({ name: label, tier, optional: cat.optional, description: cat.description.trim() });
    for (const mod of cat.mods) {
      const apiName = byAsset.get(mod.abilityId)?.trim() ?? '';
      const resolved = apiName ? resolveName(apiName, catalog, names) : null;
      const name = resolved?.name ?? apiName;
      const imbueName = mod.imbueId ? byAsset.get(mod.imbueId)?.trim() : '';
      // Annotations are noisy on real items. Keep one only when the assets list has no name.
      const detail = imbueName ? `imbue target ${imbueName}` : !resolved && mod.annotation ? mod.annotation : undefined;
      const entry: PickEntry = {
        name: name || `ability ${mod.abilityId}`,
        itemId: resolved?.itemId ?? null,
        tier,
        category: label,
        ...(detail ? { detail } : {}),
      };
      const key = entry.itemId != null ? `id:${entry.itemId}` : `name:${normaliseName(entry.name)}`;
      const prev = seen.get(key);
      if (prev == null) {
        seen.set(key, entries.length);
        entries.push(entry);
        continue;
      }
      const old = entries[prev]!;
      if (old.tier !== 'main' && entry.tier === 'main')
        entries[prev] = { ...entry, detail: entry.detail ?? old.detail };
    }
  }

  if (!entries.length) throw new BuildImportError(`Build ${buildId} version ${version} has no items`, 'empty');

  return {
    id: String(buildId),
    heroId,
    entries,
    categories,
    source: {
      buildId,
      version,
      name: buildName,
      heroId,
      author: authorFromAccount(accountId),
      authorAccountId: accountId,
      originBuildId: origin,
      updated,
      description,
      note: buildNote(description),
      credit: buildCredit(description, origin),
      matchCopy: isMatchCopy(description, buildId),
    },
  };
}

async function readOk(res: Response, fail: (status: number) => BuildImportError): Promise<unknown> {
  if (!res.ok) throw fail(res.status);
  return res.json() as Promise<unknown>;
}

export async function fetchBuild(buildId: number, version: number, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const url = `${BUILDS_URL}?build_id=${buildId}&version=${version}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new BuildImportError(`Build ${buildId} version ${version} could not be downloaded (${String(e)})`, 'network');
  }
  return readOk(
    res,
    (status) => new BuildImportError(`Build ${buildId} version ${version} was not found (${status})`, 'not-found'),
  );
}

export async function fetchAssetNames(fetchImpl: typeof fetch = fetch): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(ASSETS_URL, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new BuildImportError(`Item names could not be downloaded (${String(e)})`, 'network');
  }
  return readOk(res, (status) => new BuildImportError(`Item names could not be loaded (${status})`, 'network'));
}

/** User-triggered import: one build id and version, names resolved against the app's draft items. */
export async function importHeroList(
  buildId: number,
  version: number,
  items: CatalogItem[],
  fetchImpl: typeof fetch = fetch,
): Promise<HeroPickList> {
  const { list, names } = catalogFromItems(items);
  const [body, assets] = await Promise.all([fetchBuild(buildId, version, fetchImpl), fetchAssetNames(fetchImpl)]);
  return parseBuildPayload(body, assets, list, names, { expectedBuildId: buildId, expectedVersion: version });
}

const tierRank = (t: PickTier) => (t === 'main' ? 2 : 1);

/** The tier a card belongs to, or null. Item id wins; otherwise the OCR name scorer is used. Main beats Secondary. */
export function tierForCard(itemId: number, name: string, list: HeroPickList | null): PickTier | null {
  if (!list) return null;
  let best: PickTier | null = null;
  for (const entry of list.entries) {
    if (entry.itemId != null && entry.itemId === itemId && (!best || tierRank(entry.tier) > tierRank(best)))
      best = entry.tier;
  }
  if (best) return best;
  const keys = new Map<string, { id: number; tier: PickTier }>();
  list.entries.forEach((entry, index) => {
    const key = normaliseName(entry.name);
    if (!key) return;
    const prev = keys.get(key);
    if (!prev || tierRank(entry.tier) > tierRank(prev.tier)) keys.set(key, { id: index + 1, tier: entry.tier });
  });
  const named: NameList = [...keys.entries()].map(([key, row]) => ({ id: row.id, key }));
  const hit = matchItemName(name, named);
  if (!hit) return null;
  for (const row of keys.values()) if (row.id === hit.itemId) return row.tier;
  return null;
}

export function tiersForOffers(
  offers: { itemId: number; name: string }[],
  list: HeroPickList | null,
): Record<number, PickTier> {
  const out: Record<number, PickTier> = {};
  for (const offer of offers) {
    const tier = tierForCard(offer.itemId, offer.name, list);
    if (tier) out[offer.itemId] = tier;
  }
  return out;
}

export function listLabel(list: HeroPickList): string {
  if (!list.source) return 'Custom';
  const name = list.source.name || `Build ${list.source.buildId}`;
  return `${name} v${list.source.version}`;
}
