import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './ErrorBoundary'
import './styles.css'

interface Plate {
  slot: number
  kind: 'take' | 'other' | 'unknown'
  scoreText: string
  badge: string
  enhancedLabel: string | null
}

interface OverlayState {
  visible?: boolean
  reading?: boolean
  plates?: Plate[]
  reroll?: boolean
  rerollText?: string | null
  problem?: string | null
  heroNote?: string | null
  dot?: { show: boolean; mode: 'watching' | 'reading' | 'failed'; text: string }
}

const DOT: Record<string, { colour: string; line: string; hover: string }> = {
  watching: {
    colour: 'teal',
    line: 'Watching for the draft, F8',
    hover: 'Brawl Helper: watching for draft. F8 = detect now',
  },
  reading: {
    colour: 'amber',
    line: 'Reading the draft, F8',
    hover: 'Brawl Helper: reading draft. F8 = detect now',
  },
  failed: {
    colour: 'grey',
    line: 'Capture failed, F8',
    hover: 'Brawl Helper: capture failed. F8 = detect now',
  },
}

function OverlayApp() {
  const [state, setState] = useState<OverlayState>({})
  const [hover, setHover] = useState<string | null>(null)
  useEffect(() => {
    return window.brawlAPI?.onOverlay((payload) => setState(payload as OverlayState))
  }, [])
  const dot = state.dot?.show ? DOT[state.dot.mode] : null
  return (
    <div className="overlay-root">
      {dot && (
        <div className="badge" title={dot.hover} onMouseEnter={() => setHover(dot.hover)} onMouseLeave={() => setHover(null)}>
          <span className={`dot ${dot.colour}`} />
          <strong>STREET BRAWL ADVISOR</strong>
          <span>{dot.line}</span>
        </div>
      )}
      {hover && <div className="plate">{hover}</div>}
      {state.reading && <div className="plate">Reading</div>}
      {state.heroNote && <div className="plate">{state.heroNote}</div>}
      {state.problem && <div className="plate">{state.problem}</div>}
      {state.plates?.map((plate) => (
        <div key={plate.slot} className={`plate ${plate.kind}`}>
          <span>{plate.badge}</span> {plate.scoreText}
          {plate.enhancedLabel && <span> {plate.enhancedLabel}</span>}
        </div>
      ))}
      {state.reroll && <div className="plate take">RE-ROLL</div>}
      {state.rerollText && <div className="plate">{state.rerollText.toUpperCase()}</div>}
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <ErrorBoundary>
      <OverlayApp />
    </ErrorBoundary>,
  )
}
