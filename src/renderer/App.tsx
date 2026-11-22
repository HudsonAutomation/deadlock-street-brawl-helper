import { useEffect, useMemo, useState } from 'react'
import { AbilityEditor } from './AbilityEditor'
import { heroNotRead, problemLine, readerLine, statusLine, type StatusInput } from '../core/status'
import { readStored, writeStored, type Stored, type TabId } from '../core/storage'
import { gradePopulation } from '../core/grades'
import { sourceLine, splitBuild, type HeroBuild, type PickList } from '../core/builds'
import type { HeroDef, ItemDef, Manifest } from '../core/model'

const devTools = __DEV_TOOLS__

function memoryStore(): { get: (k: string) => string | null; set: (k: string, v: string) => void } {
  const bag = new Map<string, string>()
  const ls = typeof localStorage === 'undefined' ? null : localStorage
  return {
    get: (key) => (ls ? ls.getItem(key) : bag.get(key) ?? null),
    set: (key, value) => {
      if (ls) ls.setItem(key, value)
      else bag.set(key, value)
    },
  }
}

export function App() {
  const store = useMemo(memoryStore, [])
  const [saved, setSaved] = useState<Stored>(() => readStored(store.get))
  const [debug, setDebug] = useState(devTools || !window.brawlAPI)
  const [status, setStatus] = useState<StatusInput>(() => ({
    platformOk: !window.brawlAPI || window.brawlAPI.platform === 'win32',
    resync: null,
    heroSource: 'window',
    heroName: 'Infernus',
    gameFound: false,
    testMode: false,
    draftUp: false,
    advising: false,
    detecting: false,
    detectMiss: false,
    readerDown: Boolean(window.brawlAPI && window.brawlAPI.platform !== 'win32'),
    black: false,
    tooSmall: false,
    captureDenied: false,
    f8Taken: false,
  }))
  const [firstRun, setFirstRun] = useState(!saved.firstRunDone)
  const [heroes, setHeroes] = useState<HeroDef[]>([])
  const [items, setItems] = useState<ItemDef[]>([])
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [heroStats, setHeroStats] = useState<[number, number, number, number][]>([])
  const [lists, setLists] = useState<PickList[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tierView, setTierView] = useState<'Heroes' | 'Items'>('Heroes')
  const [tierFilter, setTierFilter] = useState(0)
  const [importId, setImportId] = useState('')
  const [importVersion, setImportVersion] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [query, setQuery] = useState('')
  const [addTier, setAddTier] = useState<'Main' | 'Secondary'>('Main')

  useEffect(() => {
    writeStored(saved, store.set)
  }, [saved, store])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const manifestRes = await fetch('snapshot/manifest.json')
        if (!manifestRes.ok) throw new Error('snapshot missing')
        const [heroRes, itemRes, statRes, buildRes] = await Promise.all([
          fetch('snapshot/heroes.json'),
          fetch('snapshot/items.json'),
          fetch('snapshot/hero-stats.json'),
          fetch('snapshot/builds.json'),
        ])
        if (cancelled) return
        const itemRows = (await itemRes.json()) as ItemDef[]
        setManifest((await manifestRes.json()) as Manifest)
        setHeroes((await heroRes.json()) as HeroDef[])
        setItems(itemRows)
        setHeroStats((await statRes.json()) as [number, number, number, number][])
        const raw = (await buildRes.json()) as { role: string; heroBuild: HeroBuild }[]
        const byId = new Map(itemRows.filter((row) => !row.disabled && row.tier >= 1 && !row.name.startsWith('upgrade_')).map((row) => [row.id, row]))
        const byName = new Map(itemRows.map((row) => [row.name.toLowerCase().replace(/[^a-z]/g, ''), row]))
        setLists(raw.map((row) => splitBuild(row.heroBuild, byId, byName)))
        setLoading(false)
      } catch (error) {
        if (!cancelled) {
          setLoading(false)
          setLoadError(error instanceof Error ? error.message : 'snapshot missing')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const hero = heroes.find((row) => row.id === saved.heroId) ?? heroes[0]
  const heroName = hero?.name ?? 'Infernus'
  const line = statusLine({ ...status, heroName })
  const problem = problemLine(status)
  const reader = readerLine(status)
  const missingHero = heroNotRead({ ...status, heroName })

  const setTab = (tab: TabId) => setSaved((current) => ({ ...current, tab }))

  return (
    <div>
      <header className="titlebar">
        <img src="snapshot/images/heroes/1-small.webp" alt="" width={16} height={16} />
        <span>Deadlock Street Brawl Helper</span>
        {debug && <span className="debug">DEBUG</span>}
        <span className="grow" />
        <button type="button" aria-label="Minimise" onClick={() => window.brawlAPI?.minimise()}>
          _
        </button>
        <button type="button" aria-label="Close" onClick={() => window.brawlAPI?.close()}>
          ×
        </button>
      </header>
      {loadError && <p className="problem">{loadError}</p>}
      {loading && <p>Loading snapshots…</p>}
      <nav className="tabs">
        <button type="button" aria-pressed={saved.tab === 'advisor'} onClick={() => setTab('advisor')}>
          Draft advisor
        </button>
        <button type="button" aria-pressed={saved.tab === 'picks'} onClick={() => setTab('picks')}>
          My Picks
        </button>
        <button type="button" aria-pressed={saved.tab === 'tiers'} onClick={() => setTab('tiers')}>
          Street Brawl Tier List
        </button>
      </nav>
      {saved.tab === 'advisor' && (
        <main className="body">
          <div className="hero-row">
            {hero?.smallImage && <img src={`snapshot/images/${hero.smallImage}`} alt="" width={32} height={32} />}
            <strong>{heroName}</strong>
            {status.heroSource === 'loading' && (
              <span className="tag" title="Read from the loading screen">
                auto
              </span>
            )}
            {status.heroSource === 'portrait' && (
              <span className="tag" title="Guessed from the scoreboard portraits">
                guessed
              </span>
            )}
            <button type="button">change</button>
            <label>
              Hero
              <select
                aria-label="Hero"
                value={saved.heroId}
                onChange={(event) => setSaved((current) => ({ ...current, heroId: Number(event.target.value) }))}
              >
                {(heroes.length ? [...heroes].sort((a, b) => a.name.localeCompare(b.name)) : [{ id: 1, name: 'Infernus' } as HeroDef]).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setStatus((current) => ({ ...current, heroSource: 'window' }))}>
              auto-detect
            </button>
          </div>
          <p className="status">{line}</p>
          {problem && <p className="problem">{problem}</p>}
          {reader && <p>{reader}</p>}
          {missingHero && <p>{missingHero}</p>}
          {firstRun && (
            <section className="group" aria-label="First-run check">
              <p>Deadlock found</p>
              <p>Borderless Windowed</p>
              <p>Resolution readable</p>
              <button
                type="button"
                onClick={() => {
                  setFirstRun(false)
                  setSaved((current) => ({ ...current, firstRunDone: true }))
                  setStatus((current) => ({ ...current, testMode: true, gameFound: true }))
                  window.brawlAPI?.toggleTestMode()
                }}
              >
                Show me
              </button>
              <button
                type="button"
                onClick={() => {
                  setFirstRun(false)
                  setSaved((current) => ({ ...current, firstRunDone: true }))
                }}
              >
                Got it
              </button>
            </section>
          )}
          <AbilityEditor heroName={heroName} abilities={[]} brawl={null} custom={saved.customOrders[String(saved.heroId)] ?? null} onChange={(next) => {
            setSaved((current) => {
              const customOrders = { ...current.customOrders }
              if (next) customOrders[String(current.heroId)] = next
              else delete customOrders[String(current.heroId)]
              return { ...current, customOrders }
            })
          }} />
          {__DEV_TOOLS__ && (debug || !window.brawlAPI) && (
            <DebugTools status={status} setStatus={setStatus} saved={saved} setSaved={setSaved} />
          )}
          <Settings saved={saved} setSaved={setSaved} />
        </main>
      )}
      {saved.tab === 'picks' && (
        <Picks
          heroes={heroes}
          items={items}
          lists={lists}
          saved={saved}
          setSaved={setSaved}
          query={query}
          setQuery={setQuery}
          addTier={addTier}
          setAddTier={setAddTier}
          importId={importId}
          importVersion={importVersion}
          setImportId={setImportId}
          setImportVersion={setImportVersion}
          importMessage={importMessage}
          setImportMessage={setImportMessage}
          draftHero={status.heroSource === 'window' ? null : heroName}
        />
      )}
      {saved.tab === 'tiers' && (
        <Tiers
          loading={loading}
          manifest={manifest}
          heroes={heroes}
          heroStats={heroStats}
          view={tierView}
          setView={setTierView}
          filter={tierFilter}
          setFilter={setTierFilter}
          realWindow={saved.realWindowCopy}
        />
      )}
      <footer className="footer">
        Data from <a href="https://deadlock-api.com">deadlock-api.com</a>. Advice is computed on this machine. The app does not talk to the game.
      </footer>
    </div>
  )
}

function DebugTools(props: {
  status: StatusInput
  setStatus: (next: StatusInput | ((current: StatusInput) => StatusInput)) => void
  saved: Stored
  setSaved: (next: Stored | ((current: Stored) => Stored)) => void
}) {
  return (
    <section className="group" aria-label="Debug panel">
      <button type="button">Start capture</button>
      <button type="button">Stop capture</button>
      <button type="button" disabled={!props.status.gameFound || props.status.detecting}>
        Detect now (F8)
      </button>
      <button type="button" onClick={() => props.setStatus((current) => ({ ...current, testMode: !current.testMode, gameFound: true }))}>
        {props.status.testMode ? 'Turn test mode off' : 'Test mode (dummy Deadlock window)'}
      </button>
      <label>
        Screenshot
        <select aria-label="Screenshot" defaultValue="choice1">
          <option value="choice1">choice1</option>
          <option value="choice2">choice2</option>
          <option value="draft-r2c3-reroll">draft-r2c3-reroll</option>
        </select>
      </label>
      <label>
        Round
        <select
          aria-label="Round"
          value={props.saved.round}
          onChange={(event) => props.setSaved((current) => ({ ...current, round: Number(event.target.value) }))}
        >
          <option value={1}>1 (5600 souls)</option>
          <option value={2}>2 (7400 souls)</option>
          <option value={3}>3 (9400 souls)</option>
          <option value={4}>4 (11600 souls)</option>
          <option value={5}>5 (14000 souls)</option>
        </select>
      </label>
      <p>No cards yet. Start the screen capture above, or pick the three cards yourself in "Cards on screen" below.</p>
      <p>No drafts recorded yet.</p>
      <button type="button">Play a video</button>
      <button type="button">Save this draft</button>
      <button type="button" onClick={() => window.brawlAPI?.retryReader()}>
        Try the name reader again
      </button>
    </section>
  )
}

function Settings(props: { saved: Stored; setSaved: (next: Stored | ((current: Stored) => Stored)) => void }) {
  const set = (patch: Partial<Stored>) => props.setSaved((current) => ({ ...current, ...patch }))
  return (
    <section className="group" aria-label="Settings">
      <h2>Settings</h2>
      <label>
        <input type="checkbox" checked={props.saved.myPicks.enabled} onChange={(event) => set({ myPicks: { ...props.saved.myPicks, enabled: event.target.checked } })} />
        Highlight My Picks
      </label>
      <p>Overlay hotkey {props.saved.overlayHotkey}. Detect hotkey {props.saved.detectHotkey}.</p>
      <label>
        <input type="checkbox" checked={props.saved.abilityPicture} onChange={(event) => set({ abilityPicture: event.target.checked })} />
        Ability picture
      </label>
      <label>
        <input type="checkbox" checked={props.saved.lobbyDot} onChange={(event) => set({ lobbyDot: event.target.checked })} />
        Lobby dot
      </label>
      <button type="button" onClick={() => set({ overlayHotkey: 'Ctrl+Shift+O', detectHotkey: 'F8' })}>
        Reset hotkeys
      </button>
    </section>
  )
}

function Picks(props: {
  heroes: HeroDef[]
  items: ItemDef[]
  lists: PickList[]
  saved: Stored
  setSaved: (next: Stored | ((current: Stored) => Stored)) => void
  query: string
  setQuery: (value: string) => void
  addTier: 'Main' | 'Secondary'
  setAddTier: (value: 'Main' | 'Secondary') => void
  importId: string
  importVersion: string
  setImportId: (value: string) => void
  setImportVersion: (value: string) => void
  importMessage: string
  setImportMessage: (value: string) => void
  draftHero: string | null
}) {
  const heroId = props.saved.myPicks.fallbackHeroId
  const hero = props.heroes.find((row) => row.id === heroId)
  const heroLists = props.lists.filter((list) => list.heroId === heroId)
  const active = heroLists[0]
  const suggestions = props.query.replace(/[^a-z]/gi, '').length >= 2
    ? props.items.filter((item) => !item.disabled && item.tier >= 1 && item.name.toLowerCase().includes(props.query.toLowerCase())).slice(0, 8)
    : []
  return (
    <main className="body">
      <h1>My Picks</h1>
      <p>Choose a hero to edit that list. During a draft the app uses the hero it read. When it has not read a hero, it uses the hero chosen here.</p>
      {props.draftHero && <p>This draft highlights {props.draftHero}.</p>}
      <label>
        Hero
        <select
          aria-label="Hero"
          value={heroId}
          onChange={(event) =>
            props.setSaved((current) => ({
              ...current,
              myPicks: { ...current.myPicks, fallbackHeroId: Number(event.target.value) },
            }))
          }
        >
          {(props.heroes.length ? props.heroes : [{ id: 86, name: 'Violet' } as HeroDef]).map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={props.saved.myPicks.enabled}
          onChange={(event) =>
            props.setSaved((current) => ({ ...current, myPicks: { ...current.myPicks, enabled: event.target.checked } }))
          }
        />
        Highlight My Picks
      </label>
      <p className="muted">{hero?.name ?? 'Violet'}</p>
      {heroLists.length > 1 && (
        <label>
          Saved list
          <select aria-label="Saved list" defaultValue={active?.buildId}>
            {heroLists.map((list) => (
              <option key={list.buildId} value={list.buildId}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {active && (
        <p>
          {sourceLine(active)}
          {active.matchCopy ? '. match copy, not oses\'s own build' : ''}
        </p>
      )}
      <section>
        <h2>Main</h2>
        <p>Strong gold ring and a MY PICK tag.</p>
        {active && active.mainCategories.length > 0 && <p>{active.mainCategories.join(', ')}</p>}
        {(!active || active.main.length === 0) && <p>No items.</p>}
        {active?.main.map((row) => (
          <p key={row.name}>
            {row.name} <span className="muted">{row.category}</span>
            {!row.draftable && ' Not in Street Brawl'}
          </p>
        ))}
      </section>
      <section>
        <h2>Secondary</h2>
        <p>Softer ring and an ALT tag.</p>
        {active && active.secondaryCategories.length > 0 && <p>{active.secondaryCategories.join(', ')}</p>}
        {(!active || active.secondary.length === 0) && <p>No items.</p>}
        {active?.secondary.map((row) => (
          <p key={row.name}>
            {row.name} <span className="muted">{row.category}</span>
            {!row.draftable && ' Not in Street Brawl'}
          </p>
        ))}
      </section>
      <label>
        Add an item
        <input aria-label="Add an item" placeholder="Item name" value={props.query} onChange={(event) => props.setQuery(event.target.value)} />
      </label>
      <label>
        Tier
        <select aria-label="Tier" value={props.addTier} onChange={(event) => props.setAddTier(event.target.value as 'Main' | 'Secondary')}>
          <option>Main</option>
          <option>Secondary</option>
        </select>
      </label>
      <ul>
        {suggestions.map((item) => (
          <li key={item.id}>
            <button type="button">{item.name}</button>
          </li>
        ))}
      </ul>
      <section>
        <h2>Import a build</h2>
        <p>Loads a public build from deadlock-api.com. Optional categories go to Secondary. The rest go to Main. Nothing is sent to the game.</p>
        <label>
          Build id
          <input aria-label="Build id" value={props.importId} onChange={(event) => props.setImportId(event.target.value)} />
        </label>
        <label>
          Version
          <input aria-label="Version" value={props.importVersion} onChange={(event) => props.setImportVersion(event.target.value)} />
        </label>
        <button
          type="button"
          onClick={() => {
            const id = Number(props.importId)
            const version = Number(props.importVersion)
            if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(version) || version <= 0) {
              props.setImportMessage('Enter a build id and a version.')
              return
            }
            props.setImportMessage('Importing')
            void window.brawlAPI?.importBuild(id, version).then((result) => {
              props.setImportMessage(result.ok ? `Imported build for ${hero?.name ?? 'hero'}.` : result.message)
            })
          }}
        >
          Import
        </button>
        {props.importMessage && <p>{props.importMessage}</p>}
      </section>
      <button type="button">Reset to default</button>
      <button type="button">Remove this list</button>
      <button type="button">Save my lists</button>
      <button type="button">Load my lists</button>
    </main>
  )
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

function Tiers(props: {
  loading: boolean
  manifest: Manifest | null
  heroes: HeroDef[]
  heroStats: [number, number, number, number][]
  view: 'Heroes' | 'Items'
  setView: (view: 'Heroes' | 'Items') => void
  filter: number
  setFilter: (filter: number) => void
  realWindow: boolean
}) {
  const fetchDate = props.manifest ? new Date(props.manifest.fetchedAt * 1000).toISOString().slice(0, 10) : ''
  const ageDays = props.manifest ? Math.floor((Date.now() - props.manifest.fetchedAt * 1000) / 86400000) : 0
  const stale = ageDays > 14
  const grades = gradePopulation(
    props.heroStats.map(([id, wins, , matches]) => ({ id, wins, matches })),
    props.manifest?.heroGames ?? 1,
  )
  const names = new Map(props.heroes.map((hero) => [hero.id, hero.name]))
  return (
    <main className="body">
      <h1>Street Brawl Tier List</h1>
      {props.loading && <p>Loading Street Brawl tier list…</p>}
      <p>
        Heroes and items graded by win rate and usage, data from the 30 days to {fetchDate}{' '}
        <span className={stale ? 'stale' : undefined}>
          ({ageDays === 1 ? '1 day old' : `${ageDays} days old`})
        </span>
      </p>
      {props.realWindow && props.manifest && (
        <p>
          This snapshot is from {props.manifest.windowStart} to {props.manifest.windowEnd}.
        </p>
      )}
      <div className="tabs">
        <button type="button" aria-pressed={props.view === 'Heroes'} onClick={() => props.setView('Heroes')}>
          Heroes
        </button>
        <button type="button" aria-pressed={props.view === 'Items'} onClick={() => props.setView('Items')}>
          Items
        </button>
      </div>
      {props.view === 'Heroes' ? (
        <p>Every hero graded against the rest of the roster. Win rate counts for 70% of the grade, how often the hero is picked for 30%.</p>
      ) : (
        <>
          <label>
            All tiers
            <select aria-label="All tiers" value={props.filter} onChange={(event) => props.setFilter(Number(event.target.value))}>
              <option value={0}>All tiers</option>
              {[1, 2, 3, 4, 5].map((tier) => (
                <option key={tier} value={tier}>
                  Tier {ROMAN[tier]}
                </option>
              ))}
            </select>
          </label>
          <p>Each item is graded against the other items of its own draft tier, because the tier decides which round it can be offered in. Win rate counts for 70% of the grade, how often the item is drafted for 30%.</p>
        </>
      )}
      <div className="board">
        {(['S', 'A', 'B', 'C'] as const).map((letter) => {
          const rows = grades.filter((row) => row.grade === letter)
          return (
            <section className="lane" key={letter}>
              <h3>
                {letter} {rows.length}
              </h3>
              {rows.length === 0 && <p>{props.filter ? `No tier ${ROMAN[props.filter]} item lands here.` : 'Nothing lands here.'}</p>}
              <div className="cells">
                {rows.map((row) => (
                  <div className={`cell ${letter}`} key={row.id}>
                    <div>{names.get(row.id) ?? row.id}</div>
                    <div>{(row.winRate * 100).toFixed(1)}%</div>
                    <div>{(row.usage * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      {props.manifest && (
        <p className="footer">
          Percentages under each entry are its win rate and its usage, the share of hero-games it appeared in. Based on {props.manifest.heroGames} hero-games of Street Brawl over the 5 days to {props.manifest.windowEnd}, all ranks.
        </p>
      )}
    </main>
  )
}
