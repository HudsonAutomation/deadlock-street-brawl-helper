import { loadCatalog, snapshotReady } from '../core/load'
import { advise, buildHeroModel, itemGrades } from '../core/score'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function main(): void {
  if (!snapshotReady()) {
    console.error('Snapshot is not built yet. Run npm run fetch-data.')
    process.exit(1)
  }
  const catalog = loadCatalog()
  const heroId = Number(arg('--hero') ?? 1)
  const round = Number(arg('--round') ?? 2)
  const choice = Number(arg('--choice') ?? 1)
  const set = arg('--set') ?? ''
  const names = set.split(',').map((part) => part.trim()).filter(Boolean)
  const model = buildHeroModel(catalog, heroId)
  const grades = itemGrades(catalog)
  const cards = names.map((name) => {
    const item = model.draftable.find((row) => row.name.toLowerCase() === name.toLowerCase())
    if (!item) throw new Error(`Unknown item: ${name}`)
    const normal = catalog.mode.rounds[round - 1]?.choices[choice - 1]?.normal ?? item.tier
    return { itemId: item.id, rare: item.tier > normal, enhanced: false }
  })
  const advice = advise(catalog, model, {
    heroId,
    round,
    choice,
    cards,
    owned: [],
    enemies: [],
    rerollsLeft: null,
  }, grades)
  const ranked = advice.cards
    .filter((card) => !card.unknown)
    .slice()
    .sort((a, b) => b.score - a.score || (a.itemId ?? 0) - (b.itemId ?? 0))
  for (const [index, card] of ranked.entries()) {
    const mark = advice.reroll ? 'hold' : card.itemId === advice.takeId ? 'TAKE' : `#${index + 1}`
    console.log(`${mark}  ${card.name}  ${card.score.toFixed(2)}  ${card.grade}${card.enhanced ? ' enhanced' : ''}`)
  }
  if (advice.reroll) {
    console.log(`Re-roll this set: expected best ${advice.expectedBest.toFixed(2)} vs ${advice.currentBest.toFixed(2)} on screen`)
    if (advice.hold > 0) console.log(`saving this set for a later choice is worth ${advice.hold.toFixed(2)}`)
  } else if (advice.rerollsLeft <= 0) {
    console.log('Keep this set (no re-rolls left).')
  } else {
    console.log('Keep this set')
  }
}

main()
