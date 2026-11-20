import { useMemo, useState } from 'react';
import type { Hero, Item } from '../types';
import {
  activeList,
  addPick,
  heroPicksFor,
  movePick,
  removeActiveList,
  removePick,
  resetHero,
  saveImportedList,
  setActiveList,
  setFallbackHero,
  setMyPicksEnabled,
  type MyPicksStore,
  type PickTier,
} from '../brawl/myPicks';
import { categoryLabel, importHeroList, isDraftItem, listLabel } from '../brawl/buildImport';
import { normaliseName } from '../brawl/names';

interface Props {
  heroes: Hero[];
  items: Item[];
  store: MyPicksStore;
  setStore: (next: MyPicksStore | ((prev: MyPicksStore) => MyPicksStore)) => void;
  /** Hero highlighted on the current draft. */
  liveHeroId: number;
  heroNotRead: boolean;
}

/** Settings for My Picks: two tiers, saved lists, and an optional build import. */
export function MyPicksPanel({ heroes, items, store, setStore, liveHeroId, heroNotRead }: Props) {
  const heroId = store.fallbackHeroId;
  const picks = heroPicksFor(store, heroId);
  const list = activeList(picks);
  const [query, setQuery] = useState('');
  const [addTier, setAddTier] = useState<PickTier>('main');
  const [buildId, setBuildId] = useState('');
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const draftItems = useMemo(() => items.filter(isDraftItem).sort((a, b) => a.name.localeCompare(b.name)), [items]);
  const taken = new Set(list?.entries.map((entry) => entry.itemId) ?? []);
  const q = normaliseName(query);
  const suggestions =
    q.length < 2
      ? []
      : draftItems.filter((item) => !taken.has(item.id) && normaliseName(item.name).includes(q)).slice(0, 8);

  const liveName = heroes.find((hero) => hero.id === liveHeroId)?.name;
  const rows = (tier: PickTier) =>
    (list?.entries ?? []).map((entry, index) => ({ entry, index })).filter((row) => row.entry.tier === tier);

  const catLine = (tier: PickTier) => {
    const names = (list?.categories ?? []).filter((cat) => cat.tier === tier).map((cat) => cat.name || 'untitled');
    return [...new Set(names)].join(', ');
  };

  const addItem = (item: Item) => {
    setStore((prev) => addPick(prev, heroId, { id: item.id, name: item.name }, addTier));
    setQuery('');
  };

  const onImport = async () => {
    const id = Number(buildId);
    const ver = Number(version);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(ver) || ver <= 0) {
      setMessage('Enter a build id and a version.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const imported = await importHeroList(id, ver, items);
      if (!heroes.some((hero) => hero.id === imported.heroId)) {
        setMessage(`This build is for hero ${imported.heroId}, which this app does not have.`);
        return;
      }
      setStore((prev) => setFallbackHero(saveImportedList(prev, imported), imported.heroId));
      const heroName = heroes.find((hero) => hero.id === imported.heroId)?.name ?? String(imported.heroId);
      const unknown = imported.entries.filter((entry) => entry.itemId == null).map((entry) => entry.name);
      setMessage(
        unknown.length
          ? `Imported ${listLabel(imported)} for ${heroName}. Not in Street Brawl: ${unknown.join(', ')}.`
          : `Imported ${listLabel(imported)} for ${heroName}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'The build could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel my-picks" aria-label="My Picks">
      <label className="my-picks-toggle">
        <input
          type="checkbox"
          checked={store.enabled}
          onChange={(e) => setStore((prev) => setMyPicksEnabled(prev, e.target.checked))}
        />
        Highlight My Picks
      </label>
      <p className="muted">
        Choose a hero to edit that list. During a draft the app uses the hero it read. When it has not read a hero, it
        uses the hero chosen here.
      </p>
      <label className="my-picks-field">
        Hero
        <select
          aria-label="My Picks hero"
          value={heroId}
          onChange={(e) => setStore((prev) => setFallbackHero(prev, Number(e.target.value)))}
        >
          {heroes.map((hero) => (
            <option key={hero.id} value={hero.id}>
              {hero.name}
            </option>
          ))}
        </select>
      </label>
      {!heroNotRead && liveHeroId !== heroId && liveName && <p className="muted">This draft highlights {liveName}.</p>}

      {picks.lists.length > 0 && (
        <label className="my-picks-field">
          Saved list
          <select
            aria-label="Saved list"
            value={picks.activeId}
            onChange={(e) => setStore((prev) => setActiveList(prev, heroId, e.target.value))}
          >
            {picks.lists.map((saved) => (
              <option key={saved.id} value={saved.id}>
                {listLabel(saved)}
              </option>
            ))}
          </select>
        </label>
      )}

      {list?.source && (
        <div className="my-picks-meta">
          <p className="muted">
            {list.source.author}, build {list.source.buildId}, version {list.source.version}
            {list.source.updated ? `, updated ${list.source.updated}` : ''}
          </p>
          {list.source.matchCopy && <p className="my-picks-flag">match copy, not oses&apos;s own build</p>}
          {list.source.note && <p>{list.source.note}</p>}
          {list.source.credit && <p className="muted">{list.source.credit}</p>}
          {list.source.description && (
            <details>
              <summary>Build description</summary>
              <p className="muted">{list.source.description}</p>
            </details>
          )}
        </div>
      )}

      {(['main', 'secondary'] as const).map((tier) => (
        <div key={tier} className="my-picks-tier">
          <h2>{tier === 'main' ? 'Main' : 'Secondary'}</h2>
          <p className="muted">
            {tier === 'main' ? 'Strong gold ring and a MY PICK tag.' : 'Softer ring and an ALT tag.'}
            {catLine(tier) ? ` ${catLine(tier)}.` : ''}
          </p>
          {rows(tier).length === 0 && <p className="muted">No items.</p>}
          <ul>
            {rows(tier).map(({ entry, index }) => (
              <li key={`${entry.itemId ?? entry.name}-${index}`} className="pick-row">
                <span className="pick-row-name">
                  {entry.name}
                  {entry.category && <small>{categoryLabel(entry.category)}</small>}
                  {entry.detail && <small>{entry.detail}</small>}
                  {entry.itemId == null && <small className="pick-unknown">Not in Street Brawl</small>}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setStore((prev) => movePick(prev, heroId, index, tier === 'main' ? 'secondary' : 'main'))
                  }
                >
                  {tier === 'main' ? 'To secondary' : 'To main'}
                </button>
                <button type="button" onClick={() => setStore((prev) => removePick(prev, heroId, index))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="my-picks-add">
        <label className="my-picks-field">
          Add an item
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Add an item"
            placeholder="Item name"
          />
        </label>
        <select
          aria-label="Tier for the new item"
          value={addTier}
          onChange={(e) => setAddTier(e.target.value as PickTier)}
        >
          <option value="main">Main</option>
          <option value="secondary">Secondary</option>
        </select>
        {suggestions.length > 0 && (
          <ul className="my-picks-suggest">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => addItem(item)}>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="my-picks-import"
        onSubmit={(e) => {
          e.preventDefault();
          void onImport();
        }}
      >
        <h2>Import a build</h2>
        <p className="muted">
          Loads a public build from deadlock-api.com. Optional categories go to Secondary. The rest go to Main. Nothing
          is sent to the game.
        </p>
        <div className="my-picks-import-row">
          <label>
            Build id
            <input
              inputMode="numeric"
              value={buildId}
              onChange={(e) => setBuildId(e.target.value)}
              aria-label="Build id"
            />
          </label>
          <label>
            Version
            <input
              inputMode="numeric"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              aria-label="Build version"
            />
          </label>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Importing' : 'Import'}
          </button>
        </div>
        {message && <p className="my-picks-message">{message}</p>}
      </form>

      <div className="my-picks-actions">
        <button type="button" className="btn" onClick={() => setStore((prev) => resetHero(prev, heroId))}>
          Reset to default
        </button>
        {list && (
          <button type="button" className="btn" onClick={() => setStore((prev) => removeActiveList(prev, heroId))}>
            Remove this list
          </button>
        )}
      </div>
    </section>
  );
}
