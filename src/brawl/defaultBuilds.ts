// The bundled My Picks lists. `scripts/import-default-builds.mjs` fetches these exact versions and
// rewrites src/brawl/myPicksDefaults.json. Violet's active list is Scarlet 9X (not in this table);
// oses's Violet build is stored beside it. Extra creator lists are saved too, and they do not
// replace Scarlet or an oses list as the active one.

/** Scarlet 9X v2. The builds API last_updated_timestamp is 1794940946, which is 2026-11-17 18:42:26 UTC
 *  (10:42 AM Pacific). The description credits twitch.tv/oses and origin build 897240. */

export const OSES_ACCOUNT_ID = 1840902834;
export const VIOLET_ID = 86;
export const SCARLET_BUILD_ID = 998571;
export const SCARLET_VERSION = 2;

export interface DefaultBuildSpec {
  hero: string;
  heroId: number;
  buildId: number;
  version: number;
}

export const SCARLET_SPEC: DefaultBuildSpec = {
  hero: 'Violet',
  heroId: VIOLET_ID,
  buildId: SCARLET_BUILD_ID,
  version: SCARLET_VERSION,
};

/** One oses build per hero, at the version recorded in this table. Account 1840902834. */
export const OSES_BUILDS: DefaultBuildSpec[] = [
  { hero: 'Abrams', heroId: 6, buildId: 526641, version: 1 },
  { hero: 'Apollo', heroId: 77, buildId: 353960, version: 49 },
  { hero: 'Bebop', heroId: 15, buildId: 386845, version: 3 },
  { hero: 'Calico', heroId: 16, buildId: 683397, version: 1 },
  { hero: 'Celeste', heroId: 81, buildId: 814860, version: 76 },
  { hero: 'Deadman Danny', heroId: 78, buildId: 887853, version: 1 },
  { hero: 'Drifter', heroId: 64, buildId: 716382, version: 3 },
  { hero: 'Graves', heroId: 76, buildId: 546331, version: 54 },
  { hero: 'Grey Talon', heroId: 17, buildId: 723432, version: 5 },
  { hero: 'Haze', heroId: 13, buildId: 514170, version: 115 },
  { hero: 'Holliday', heroId: 14, buildId: 360573, version: 8 },
  { hero: 'Infernus', heroId: 1, buildId: 715046, version: 10 },
  { hero: 'Ivy', heroId: 20, buildId: 816348, version: 21 },
  { hero: 'Lady Geist', heroId: 4, buildId: 749269, version: 27 },
  { hero: 'Lash', heroId: 31, buildId: 335499, version: 110 },
  { hero: 'McGinnis', heroId: 8, buildId: 981244, version: 22 },
  { hero: 'Mina', heroId: 63, buildId: 832489, version: 271 },
  { hero: 'Mirage', heroId: 52, buildId: 492664, version: 99 },
  { hero: 'Nurse Harrow', heroId: 87, buildId: 933260, version: 2 },
  { hero: 'Paige', heroId: 67, buildId: 406689, version: 1 },
  { hero: 'Paradox', heroId: 10, buildId: 513995, version: 1 },
  { hero: 'Pocket', heroId: 50, buildId: 718792, version: 24 },
  { hero: 'Rat King', heroId: 84, buildId: 841603, version: 36 },
  { hero: 'Seven', heroId: 2, buildId: 378177, version: 68 },
  { hero: 'Shiv', heroId: 19, buildId: 879365, version: 14 },
  { hero: 'Silver', heroId: 80, buildId: 589785, version: 31 },
  { hero: 'Sinclair', heroId: 60, buildId: 668231, version: 7 },
  { hero: 'Solomon', heroId: 85, buildId: 872540, version: 9 },
  { hero: 'The Doorman', heroId: 69, buildId: 323949, version: 15 },
  { hero: 'Venator', heroId: 65, buildId: 905815, version: 138 },
  { hero: 'Victor', heroId: 66, buildId: 333337, version: 1 },
  { hero: 'Vindicta', heroId: 3, buildId: 881792, version: 1 },
  { hero: 'Violet', heroId: 86, buildId: 897240, version: 19 },
  { hero: 'Vyper', heroId: 58, buildId: 763021, version: 1 },
  { hero: 'Warden', heroId: 25, buildId: 357243, version: 132 },
  { hero: 'Wraith', heroId: 7, buildId: 341736, version: 129 },
  { hero: 'Yamato', heroId: 27, buildId: 250970, version: 31 },
];

/** Descriptions on these say "Created from MatchID": a copied match, not a build oses wrote. */
export const MATCH_COPY_BUILD_IDS: readonly number[] = [526641, 513995, 333337];

/** Other public builds saved beside the oses lists. They do not become the active list when an oses
 *  list or Scarlet is already the default. Mo & Krill, Viscous, Dynamo and Kelvin have no oses row
 *  in `OSES_BUILDS`, so the build here is the only bundled list for that hero. */
export const EXTRA_BUILDS: DefaultBuildSpec[] = [
  // 2bStron9er, Deadlock Aura. API author_account_id 150070196. v7 updated 2026-11-02 17:18 UTC.
  { hero: 'Mo & Krill', heroId: 18, buildId: 805628, version: 7 },
  // Same author. v9 updated 2026-09-17 12:50 UTC.
  { hero: 'Viscous', heroId: 35, buildId: 793000, version: 9 },
  // Same author. Only version the API returned. Updated 2026-02-26 02:10 UTC. Build name "Dynamo Aura".
  { hero: 'Dynamo', heroId: 11, buildId: 495688, version: 1 },
  // Lockbuilds. API author_account_id 489411562. v341 is the newest "Beam 'em Down" version fetched
  // on 2026-11-20; last_updated_timestamp is 2026-11-20 22:07 UTC. API title includes a Lockbuilds suffix.
  { hero: 'Kelvin', heroId: 12, buildId: 632883, version: 341 },
];
