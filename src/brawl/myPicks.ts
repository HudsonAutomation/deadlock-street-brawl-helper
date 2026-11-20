// Per-hero My Picks: the bundled defaults, plus the edits kept in localStorage under brawl.myPicks.
// Highlights never change scores. A hero with no saved edit uses the bundled list (empty when
// that hero has none). Violet's active default is Scarlet 9X; oses's Violet list is the other saved one.

import { VIOLET_ID } from './defaultBuilds.ts';
import type { HeroPickList, HeroPicks, PickEntry, PickTier } from './buildImport.ts';
import file from './myPicksDefaults.json' with { type: 'json' };

export type { HeroPickList, HeroPicks, PickEntry, PickTier };

export interface MyPicksDefaultsFile {
  generator: string;
  heroes: Record<string, HeroPicks>;
}

export const MY_PICKS_DEFAULTS = file as MyPicksDefaultsFile;

export interface MyPicksStore {
  enabled: boolean;
  /** Hero whose list is used when the draft hero was not read. Starts as Violet. */
  fallbackHeroId: number;
  /** Edits. A missing hero still uses the bundled default. */
  overrides: Record<string, HeroPicks>;
}

export const DEFAULT_MY_PICKS: MyPicksStore = {
  enabled: true,
  fallbackHeroId: VIOLET_ID,
  overrides: {},
};

/** The hero a draft should highlight. A hero the app did not read uses the settings selector. */
export function listHeroFor(currentHeroId: number, heroNotRead: boolean, fallbackHeroId: number): number {
  return heroNotRead ? fallbackHeroId : currentHeroId;
}

export function heroPicksFor(store: MyPicksStore, heroId: number): HeroPicks {
  return (
    store.overrides[String(heroId)] ?? MY_PICKS_DEFAULTS.heroes[String(heroId)] ?? { heroId, activeId: '', lists: [] }
  );
}

export function activeList(picks: HeroPicks): HeroPickList | null {
  if (!picks.lists.length) return null;
  return picks.lists.find((list) => list.id === picks.activeId) ?? picks.lists[0]!;
}

function isTier(v: unknown): v is PickTier {
  return v === 'main' || v === 'secondary';
}

function isEntry(v: unknown): v is PickEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as PickEntry;
  return (
    typeof e.name === 'string' &&
    (e.itemId === null || typeof e.itemId === 'number') &&
    isTier(e.tier) &&
    typeof e.category === 'string' &&
    (e.detail === undefined || typeof e.detail === 'string')
  );
}

function isSource(v: unknown): boolean {
  if (v === null) return true;
  if (!v || typeof v !== 'object') return false;
  const s = v as HeroPickList['source'];
  if (!s) return false;
  return (
    typeof s.buildId === 'number' &&
    typeof s.version === 'number' &&
    typeof s.name === 'string' &&
    typeof s.heroId === 'number' &&
    typeof s.author === 'string' &&
    (s.authorAccountId === null || typeof s.authorAccountId === 'number') &&
    (s.originBuildId === null || typeof s.originBuildId === 'number') &&
    typeof s.updated === 'string' &&
    typeof s.description === 'string' &&
    typeof s.note === 'string' &&
    typeof s.credit === 'string' &&
    typeof s.matchCopy === 'boolean'
  );
}

function isList(v: unknown): v is HeroPickList {
  if (!v || typeof v !== 'object') return false;
  const list = v as HeroPickList;
  return (
    typeof list.id === 'string' &&
    typeof list.heroId === 'number' &&
    Array.isArray(list.entries) &&
    list.entries.every(isEntry) &&
    Array.isArray(list.categories) &&
    list.categories.every(
      (c) =>
        !!c &&
        typeof c.name === 'string' &&
        isTier(c.tier) &&
        typeof c.optional === 'boolean' &&
        typeof c.description === 'string',
    ) &&
    isSource(list.source)
  );
}

function isPicks(v: unknown): v is HeroPicks {
  if (!v || typeof v !== 'object') return false;
  const p = v as HeroPicks;
  return (
    typeof p.heroId === 'number' && typeof p.activeId === 'string' && Array.isArray(p.lists) && p.lists.every(isList)
  );
}

export function isMyPicksStore(v: unknown): v is MyPicksStore {
  if (!v || typeof v !== 'object') return false;
  const s = v as MyPicksStore;
  if (
    typeof s.enabled !== 'boolean' ||
    typeof s.fallbackHeroId !== 'number' ||
    !s.overrides ||
    typeof s.overrides !== 'object'
  )
    return false;
  return Object.values(s.overrides).every(isPicks);
}

function materialize(store: MyPicksStore, heroId: number): MyPicksStore {
  const key = String(heroId);
  if (store.overrides[key]) return store;
  const picks = structuredClone(heroPicksFor(store, heroId));
  return { ...store, overrides: { ...store.overrides, [key]: picks } };
}

function writePicks(store: MyPicksStore, heroId: number, picks: HeroPicks): MyPicksStore {
  return { ...store, overrides: { ...store.overrides, [String(heroId)]: picks } };
}

export function setMyPicksEnabled(store: MyPicksStore, enabled: boolean): MyPicksStore {
  return { ...store, enabled };
}

export function setFallbackHero(store: MyPicksStore, heroId: number): MyPicksStore {
  return { ...store, fallbackHeroId: heroId };
}

export function setActiveList(store: MyPicksStore, heroId: number, listId: string): MyPicksStore {
  const next = materialize(store, heroId);
  const picks = next.overrides[String(heroId)];
  if (!picks || !picks.lists.some((list) => list.id === listId)) return store;
  return writePicks(next, heroId, { ...picks, activeId: listId });
}

export function resetHero(store: MyPicksStore, heroId: number): MyPicksStore {
  const key = String(heroId);
  if (!store.overrides[key]) return store;
  const { [key]: _drop, ...rest } = store.overrides;
  return { ...store, overrides: rest };
}

function editActive(store: MyPicksStore, heroId: number, edit: (list: HeroPickList) => HeroPickList): MyPicksStore {
  let next = materialize(store, heroId);
  let picks = next.overrides[String(heroId)]!;
  let index = picks.lists.findIndex((list) => list.id === picks.activeId);
  if (index < 0) {
    const created: HeroPickList = { id: `custom-${Date.now()}`, heroId, entries: [], categories: [], source: null };
    picks = { heroId, activeId: created.id, lists: [...picks.lists, created] };
    index = picks.lists.length - 1;
    next = writePicks(next, heroId, picks);
  }
  const lists = picks.lists.slice();
  lists[index] = edit(lists[index]!);
  return writePicks(next, heroId, { ...picks, lists });
}

export function addPick(
  store: MyPicksStore,
  heroId: number,
  item: { id: number; name: string },
  tier: PickTier,
): MyPicksStore {
  return editActive(store, heroId, (list) => {
    const entries = list.entries.slice();
    const at = entries.findIndex((entry) => entry.itemId === item.id);
    const next: PickEntry = {
      name: item.name,
      itemId: item.id,
      tier,
      category: at >= 0 ? entries[at]!.category : 'custom',
    };
    if (at >= 0) entries[at] = next;
    else entries.push(next);
    const categories = list.categories.some((c) => c.name === 'custom' && c.tier === tier)
      ? list.categories
      : [...list.categories, { name: 'custom', tier, optional: tier === 'secondary', description: '' }];
    return { ...list, entries, categories };
  });
}

export function movePick(store: MyPicksStore, heroId: number, index: number, tier: PickTier): MyPicksStore {
  return editActive(store, heroId, (list) => {
    if (!list.entries[index]) return list;
    const entries = list.entries.slice();
    entries[index] = { ...entries[index]!, tier };
    return { ...list, entries };
  });
}

export function removePick(store: MyPicksStore, heroId: number, index: number): MyPicksStore {
  return editActive(store, heroId, (list) => ({ ...list, entries: list.entries.filter((_, i) => i !== index) }));
}

export function removeActiveList(store: MyPicksStore, heroId: number): MyPicksStore {
  const next = materialize(store, heroId);
  const picks = next.overrides[String(heroId)];
  if (!picks) return store;
  const lists = picks.lists.filter((list) => list.id !== picks.activeId);
  return writePicks(next, heroId, { heroId, activeId: lists[0]?.id ?? '', lists });
}

/** Saves an imported build on its own hero and makes it the list in use. */
export function saveImportedList(store: MyPicksStore, list: HeroPickList): MyPicksStore {
  const next = materialize(store, list.heroId);
  const picks = next.overrides[String(list.heroId)] ?? { heroId: list.heroId, activeId: '', lists: [] };
  const lists = picks.lists.filter((have) => have.id !== list.id);
  lists.push(list);
  return writePicks(next, list.heroId, { heroId: list.heroId, activeId: list.id, lists });
}
