// Regenerates src/brawl/myPicksDefaults.json from the public build API.
//   node scripts/import-default-builds.mjs
// Scarlet 9X v2 stays Violet's active list. Each oses build is that hero's default,
// and Violet also keeps oses's 897240 v19 as a second saved list.
// Optional categories are Secondary; every other category is Main. Scarlet uses the
// named category map in src/brawl/buildImport.ts instead of the optional flag.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!process.execArgv.includes('--experimental-strip-types')) {
  const child = spawnSync(process.execPath, ['--experimental-strip-types', ...process.argv.slice(1)], {
    stdio: 'inherit',
    cwd: root,
  });
  process.exit(child.status ?? 1);
}

const { catalogFromItems, fetchAssetNames, fetchBuild, parseBuildPayload, SCARLET_CATEGORY_TIERS } =
  await import('../src/brawl/buildImport.ts');
const { OSES_BUILDS, SCARLET_SPEC, VIOLET_ID } = await import('../src/brawl/defaultBuilds.ts');

const specs = [SCARLET_SPEC, ...OSES_BUILDS];

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const items = JSON.parse(readFileSync(join(root, 'public/data/items.json'), 'utf8'));
const { list, names } = catalogFromItems(items);
const heroName = new Map(
  JSON.parse(readFileSync(join(root, 'public/data/heroes.json'), 'utf8')).map((h) => [h.id, h.name]),
);

const assetsPromise = fetchAssetNames();
const fetched = await pool(specs, 6, async (spec) => {
  try {
    const body = await fetchBuild(spec.buildId, spec.version);
    return { spec, body };
  } catch (e) {
    return { spec, error: e instanceof Error ? e.message : String(e) };
  }
});
const assets = await assetsPromise;

const failures = [];
const byHero = new Map();
for (const row of fetched) {
  if (row.error) {
    failures.push({ ...row.spec, reason: row.error });
    continue;
  }
  try {
    const parsed = parseBuildPayload(row.body, assets, list, names, {
      expectedBuildId: row.spec.buildId,
      expectedVersion: row.spec.version,
      expectedHeroId: row.spec.heroId,
      categoryTiers: row.spec.buildId === SCARLET_SPEC.buildId ? SCARLET_CATEGORY_TIERS : undefined,
    });
    const bag = byHero.get(parsed.heroId) ?? [];
    bag.push(parsed);
    byHero.set(parsed.heroId, bag);
  } catch (e) {
    failures.push({ ...row.spec, reason: e instanceof Error ? e.message : String(e) });
  }
}

const osesIds = new Set(OSES_BUILDS.map((s) => s.buildId));
const importedOses = OSES_BUILDS.filter((s) => (byHero.get(s.heroId) ?? []).some((l) => l.id === String(s.buildId)));

if (failures.length || importedOses.length !== OSES_BUILDS.length || !byHero.has(VIOLET_ID)) {
  console.error(`imported ${importedOses.length}/${OSES_BUILDS.length} oses builds`);
  for (const f of failures) console.error(`FAIL ${f.hero} ${f.buildId} v${f.version}: ${f.reason}`);
  process.exit(1);
}

const heroes = {};
for (const [heroId, lists] of byHero) {
  const ordered = [...lists].sort((a, b) => {
    if (heroId === VIOLET_ID)
      return a.id === String(SCARLET_SPEC.buildId) ? -1 : b.id === String(SCARLET_SPEC.buildId) ? 1 : 0;
    return 0;
  });
  const active =
    ordered.find((l) => (heroId === VIOLET_ID ? l.id === String(SCARLET_SPEC.buildId) : osesIds.has(Number(l.id)))) ??
    ordered[0];
  heroes[String(heroId)] = { heroId, activeId: active.id, lists: ordered };
}

const file = { generator: 'scripts/import-default-builds.mjs', heroes };
writeFileSync(join(root, 'src/brawl/myPicksDefaults.json'), `${JSON.stringify(file, null, 2)}\n`);

console.log(
  `imported ${importedOses.length}/${OSES_BUILDS.length} oses builds, plus Scarlet ${SCARLET_SPEC.buildId} v${SCARLET_SPEC.version}`,
);
const unknownAll = [];
for (const spec of OSES_BUILDS) {
  const listFor = heroes[String(spec.heroId)].lists.find((l) => l.id === String(spec.buildId));
  const main = listFor.entries.filter((e) => e.tier === 'main').length;
  const secondary = listFor.entries.filter((e) => e.tier === 'secondary').length;
  const unknown = listFor.entries.filter((e) => e.itemId == null);
  const flag = listFor.source.matchCopy ? ' match-copy' : '';
  console.log(
    `${spec.hero} (${spec.heroId}) build ${spec.buildId} v${spec.version} main ${main} secondary ${secondary} unknown ${unknown.length}${flag} updated ${listFor.source.updated}`,
  );
  for (const entry of unknown) unknownAll.push(`${spec.hero}: ${entry.name} [${entry.category}]`);
}
const scarlet = heroes[String(VIOLET_ID)].lists.find((l) => l.id === String(SCARLET_SPEC.buildId));
const sMain = scarlet.entries.filter((e) => e.tier === 'main').length;
const sSec = scarlet.entries.filter((e) => e.tier === 'secondary').length;
const sUnknown = scarlet.entries.filter((e) => e.itemId == null);
console.log(
  `Violet active ${heroes[String(VIOLET_ID)].activeId} scarlet main ${sMain} secondary ${sSec} unknown ${sUnknown.length} note ${JSON.stringify(scarlet.source.note)}`,
);
console.log(`app hero name check: ${heroName.get(VIOLET_ID)}`);
if (unknownAll.length) {
  console.log('unknown item names:');
  for (const line of unknownAll) console.log(`  ${line}`);
} else console.log('unknown item names: none');
for (const entry of sUnknown) console.log(`  scarlet unknown: ${entry.name}`);
