import { useMemo, useState } from 'react'
import {
  POINT_BUDGETS,
  activeOrder,
  clickPill,
  evidenceLine,
  pointsLeft,
  standardOrder,
  summaryLine,
  type OrderPlan,
} from '../core/abilities'
import type { AbilityDef, HeroBrawl } from '../core/model'

const COSTS = [5, 2, 1]
const TIERS = [2, 1, 0]

export function AbilityEditor(props: {
  heroName: string
  abilities: AbilityDef[]
  brawl: HeroBrawl | null
  custom: number[] | null
  onChange: (next: number[] | null) => void
}) {
  const names = props.abilities.length === 4 ? props.abilities.map((a) => a.name) : ['Ability 1', 'Ability 2', 'Ability 3', 'Ability 4']
  const plan: OrderPlan = useMemo(() => standardOrder(props.abilities, props.brawl), [props.abilities, props.brawl])
  const [round, setRound] = useState(1)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  const shown = activeOrder(props.custom, plan)
  const summary = summaryLine(props.heroName, props.custom)
  return (
    <section className="group">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {summary}
      </button>
      {open && (
        <div>
          <p>Pick a round, then click a point to buy it in that round. Click a bought point to sell it.</p>
          <div className="rounds">
            {POINT_BUDGETS.map((points, index) => (
              <button key={points + index} type="button" aria-pressed={round === index + 1} onClick={() => setRound(index + 1)}>
                Round {index + 1}
              </button>
            ))}
          </div>
          <h3>
            Round {round}: {POINT_BUDGETS[round - 1]} points, {pointsLeft(shown, round)} left
          </h3>
          <div className="ap">
            {names.map((name, slot) => (
              <div className="col" key={name}>
                <div>{slot + 1}</div>
                {TIERS.map((tier, visual) => {
                  const bought = shown[slot * 3 + tier] ?? 0
                  const cost = COSTS[visual]
                  const label = bought
                    ? `${name} ${cost} point upgrade, round ${bought}`
                    : `${name} ${cost} point upgrade, not bought`
                  return (
                    <button
                      key={tier}
                      type="button"
                      className={`pill${bought ? ' bought' : ''}${bought && bought < round ? ' past' : ''}`}
                      aria-label={label}
                      onClick={() => {
                        const base = props.custom ?? new Array(12).fill(0)
                        const result = clickPill(base, slot, tier, round, name)
                        setMessage(result.message)
                        if (result.saved) props.onChange(result.rounds)
                      }}
                    >
                      {bought && bought < round ? '✓' : bought ? `R${bought}` : `◆ ${cost}`}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <p>{evidenceLine(props.custom, plan)}</p>
          {message && <p className="problem">{message}</p>}
          <button type="button" onClick={() => { props.onChange(null); setMessage('') }}>
            Reset to default order
          </button>
          <button type="button" onClick={() => props.onChange(new Array(12).fill(0))}>
            Start from empty
          </button>
        </div>
      )}
    </section>
  )
}
