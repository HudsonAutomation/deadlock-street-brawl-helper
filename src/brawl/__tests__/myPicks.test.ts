import { describe, expect, it } from 'vitest';
import {
  BuildImportError,
  SCARLET_CATEGORY_TIERS,
  catalogFromItems,
  categoryLabel,
  importHeroList,
  parseBuildPayload,
  tierForCard,
  tierForCategory,
} from '../buildImport';
import { MATCH_COPY_BUILD_IDS, OSES_ACCOUNT_ID, OSES_BUILDS, VIOLET_ID } from '../defaultBuilds';
import {
  DEFAULT_MY_PICKS,
  MY_PICKS_DEFAULTS,
  activeList,
  addPick,
  heroPicksFor,
  isMyPicksStore,
  listHeroFor,
  movePick,
  removePick,
  resetHero,
  saveImportedList,
  setActiveList,
  setMyPicksEnabled,
} from '../myPicks';
import { itemByName, items } from './testData';

const grit = itemByName('Grit');
const healbane = itemByName('Healbane');
const violet = MY_PICKS_DEFAULTS.heroes[String(VIOLET_ID)]!;
const scarlet = violet.lists.find((list) => list.id === '998571')!;
const { names } = catalogFromItems(items);

describe('My Picks defaults', () => {
  it('bundles all 37 oses builds plus Scarlet as Violet active list', () => {
    expect(OSES_BUILDS).toHaveLength(37);
    expect(violet.activeId).toBe('998571');
    expect(violet.lists.map((list) => list.id).sort()).toEqual(['897240', '998571']);
    expect(scarlet.source).toMatchObject({
      note: 'always use arcane surge on ult',
      buildId: 998571,
      version: 2,
      heroId: VIOLET_ID,
    });
    expect(scarlet.source?.credit).toContain('897240');
    expect(scarlet.source?.credit).toContain('twitch.tv/oses');
    for (const spec of OSES_BUILDS) {
      const picks = MY_PICKS_DEFAULTS.heroes[String(spec.heroId)];
      const list = picks?.lists.find((row) => row.id === String(spec.buildId));
      expect(list?.source, spec.hero).toMatchObject({
        author: 'oses',
        authorAccountId: OSES_ACCOUNT_ID,
        version: spec.version,
        buildId: spec.buildId,
        heroId: spec.heroId,
      });
      expect(list?.heroId).toBe(spec.heroId);
      expect(list!.entries.length).toBeGreaterThan(0);
    }
  });

  it('uses the named Scarlet tiers and the optional flag everywhere else', () => {
    for (const cat of scarlet.categories) expect(cat.tier).toBe(SCARLET_CATEGORY_TIERS[cat.name.toLowerCase()]);
    expect(scarlet.entries.find((entry) => entry.name === 'Extra Spirit')?.tier).toBe('main');
    expect(scarlet.entries.find((entry) => entry.name === 'Healbane')?.tier).toBe('secondary');
    expect(scarlet.entries.find((entry) => entry.name === 'Compress Cooldown')).toMatchObject({
      tier: 'main',
      detail: 'imbue target Abstract Landscape',
    });
    for (const id of MATCH_COPY_BUILD_IDS) {
      const spec = OSES_BUILDS.find((row) => row.buildId === id)!;
      const list = MY_PICKS_DEFAULTS.heroes[String(spec.heroId)]!.lists.find((row) => row.id === String(id))!;
      expect(list.source?.matchCopy).toBe(true);
    }
    expect(MY_PICKS_DEFAULTS.heroes['1']!.lists[0]!.source?.matchCopy).toBe(false);
  });

  it('resolves every default name against the recognizer, and reports the one it cannot', () => {
    const unknown: { heroId: number; name: string; detail?: string }[] = [];
    for (const picks of Object.values(MY_PICKS_DEFAULTS.heroes)) {
      for (const list of picks.lists) {
        for (const entry of list.entries) {
          if (entry.itemId == null) unknown.push({ heroId: picks.heroId, name: entry.name, detail: entry.detail });
          else expect(names[entry.itemId]).toBe(entry.name);
        }
      }
    }
    expect(unknown).toEqual([{ heroId: 27, name: 'ability 869090587', detail: 'need dmg take 1st' }]);
  });
});

describe('tier matching', () => {
  it('matches item ids and OCR-normalised names, and lets Main beat Secondary', () => {
    expect(tierForCard(grit.id, 'something else', scarlet)).toBe('main');
    expect(tierForCard(healbane.id, 'Healbane', scarlet)).toBe('secondary');
    expect(tierForCard(0, 'GRIT', scarlet)).toBe('main');
    expect(tierForCard(0, "Diviner's Kevlar", scarlet)).toBe('main');
    expect(tierForCard(0, 'Diviners Kevlar', scarlet)).toBe('main');
    expect(tierForCard(0, 'Gril', scarlet)).toBeNull();
    expect(tierForCard(itemByName('Mystic Shot').id, 'Mystic Shot', scarlet)).toBeNull();
    expect(tierForCard(0, 'Rusted Barrl', scarlet)).toBe('main');
    const both = {
      ...scarlet,
      entries: [
        { name: 'Grit', itemId: grit.id, tier: 'secondary' as const, category: 'a' },
        { name: 'Grit', itemId: grit.id, tier: 'main' as const, category: 'b' },
      ],
    };
    expect(tierForCard(grit.id, 'Grit', both)).toBe('main');
    expect(listHeroFor(1, false, VIOLET_ID)).toBe(1);
    expect(listHeroFor(1, true, VIOLET_ID)).toBe(VIOLET_ID);
  });

  it('maps optional categories to Secondary and leaves the rest on Main', () => {
    expect(tierForCategory('vs guns', false)).toBe('main');
    expect(tierForCategory('vs guns', false, SCARLET_CATEGORY_TIERS)).toBe('secondary');
    expect(tierForCategory('hard lane', true)).toBe('secondary');
    expect(tierForCategory('early spikes', null)).toBe('main');
    expect(categoryLabel('#Citadel_HeroBuilds_LateGame')).toBe('Late Game');
    expect(categoryLabel('early spikes')).toBe('early spikes');
  });
});

describe('My Picks persistence', () => {
  it('rejects a broken store and round-trips an edit back to the bundled default', () => {
    expect(isMyPicksStore(DEFAULT_MY_PICKS)).toBe(true);
    expect(isMyPicksStore({ enabled: true, fallbackHeroId: VIOLET_ID })).toBe(false);
    let store = addPick(DEFAULT_MY_PICKS, 11, { id: grit.id, name: grit.name }, 'main');
    expect(isMyPicksStore(JSON.parse(JSON.stringify(store)))).toBe(true);
    expect(activeList(heroPicksFor(store, 11))?.entries).toEqual([
      expect.objectContaining({ name: 'Grit', itemId: grit.id, tier: 'main', category: 'custom' }),
    ]);
    store = addPick(DEFAULT_MY_PICKS, 1, { id: grit.id, name: 'Grit' }, 'secondary');
    let list = activeList(heroPicksFor(store, 1))!;
    expect(list.entries.find((entry) => entry.itemId === grit.id)?.tier).toBe('secondary');
    const index = list.entries.findIndex((entry) => entry.itemId === grit.id);
    store = movePick(store, 1, index, 'main');
    expect(activeList(heroPicksFor(store, 1))!.entries.find((entry) => entry.itemId === grit.id)?.tier).toBe('main');
    store = removePick(store, 1, index);
    expect(activeList(heroPicksFor(store, 1))!.entries.some((entry) => entry.itemId === grit.id)).toBe(false);
    store = setActiveList(DEFAULT_MY_PICKS, VIOLET_ID, '897240');
    expect(activeList(heroPicksFor(store, VIOLET_ID))?.id).toBe('897240');
    expect(heroPicksFor(resetHero(store, VIOLET_ID), VIOLET_ID).activeId).toBe('998571');
    expect(resetHero(store, VIOLET_ID).overrides[String(VIOLET_ID)]).toBeUndefined();
    expect(setMyPicksEnabled(store, false).enabled).toBe(false);
  });
});

describe('build import parsing', () => {
  const assets = [
    { id: 1, name: 'Grit' },
    { id: 2, name: 'Healbane' },
    { id: 3, name: 'Abstract Landscape' },
    { id: 4, name: 'Not A Real Item' },
  ];
  const { list, names: catalogNames } = catalogFromItems(items);
  const payload = (description = '', heroId = 6, origin = 0) => [
    {
      hero_build: {
        hero_build_id: 42,
        version: 3,
        hero_id: heroId,
        name: 'Test build',
        description,
        author_account_id: OSES_ACCOUNT_ID,
        origin_build_id: origin,
        last_updated_timestamp: 1794940946,
        details: {
          mod_categories: [
            { name: 'core', optional: false, description: '', mods: [{ ability_id: 1 }] },
            {
              name: 'maybe',
              optional: true,
              description: '',
              mods: [{ ability_id: 2, imbue_target_ability_id: 3 }],
            },
            { name: 'later', optional: null, description: '', mods: [{ ability_id: 4 }] },
            { name: '#Citadel_HeroBuilds_LateGame', optional: false, mods: [{ ability_id: 1 }] },
          ],
        },
      },
    },
  ];

  it('tiers categories, keeps an imbue note, and reports an unknown name', () => {
    const parsed = parseBuildPayload(payload(), assets, list, catalogNames, {
      expectedBuildId: 42,
      expectedVersion: 3,
      expectedHeroId: 6,
    });
    expect(parsed.entries.find((entry) => entry.name === 'Grit')).toMatchObject({ tier: 'main', itemId: grit.id });
    expect(parsed.entries.find((entry) => entry.name === 'Healbane')).toMatchObject({
      tier: 'secondary',
      detail: 'imbue target Abstract Landscape',
    });
    expect(parsed.entries.find((entry) => entry.name === 'Not A Real Item')).toMatchObject({
      itemId: null,
      tier: 'main',
    });
    expect(parsed.categories.map((cat) => [cat.name, cat.tier])).toContainEqual(['Late Game', 'main']);
    expect(parsed.source).toMatchObject({ author: 'oses', updated: '2026-11-17', matchCopy: false });
  });

  it('flags a match copy and refuses a hero or version mismatch', () => {
    const copied = parseBuildPayload(payload('Created from MatchID 123.'), assets, list, catalogNames);
    expect(copied.source?.matchCopy).toBe(true);
    expect(() => parseBuildPayload(payload(), assets, list, catalogNames, { expectedHeroId: 1 })).toThrow(
      BuildImportError,
    );
    expect(() => parseBuildPayload(payload(), assets, list, catalogNames, { expectedVersion: 9 })).toThrow(/version 3/);
    expect(() =>
      parseBuildPayload(
        [{ hero_build: { hero_build_id: 1, version: 1, hero_id: 1, details: { mod_categories: [] } } }],
        assets,
        list,
        catalogNames,
      ),
    ).toThrow(/no items/);
  });

  it('downloads a build with the injected fetch and saves it as the active list', async () => {
    const fetchImpl = (async (url: string) => {
      if (String(url).includes('/builds?'))
        return { ok: true, status: 200, json: async () => payload('based off twitch.tv/oses', 6, 9) };
      if (String(url).includes('/assets/items')) return { ok: true, status: 200, json: async () => assets };
      throw new Error(String(url));
    }) as typeof fetch;
    const imported = await importHeroList(42, 3, items, fetchImpl);
    expect(imported.id).toBe('42');
    expect(imported.source?.credit).toBe('based on build 9 by twitch.tv/oses');
    const store = saveImportedList(DEFAULT_MY_PICKS, imported);
    expect(activeList(heroPicksFor(store, 6))?.id).toBe('42');
    const missing = (async (url: string) => {
      if (String(url).includes('/assets/items')) return { ok: true, status: 200, json: async () => assets };
      return { ok: false, status: 404, json: async () => ({}) };
    }) as typeof fetch;
    await expect(importHeroList(42, 3, items, missing)).rejects.toThrow(/not found/);
  });
});
