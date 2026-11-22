import { Component, type ReactNode } from 'react'
import { log } from '../core/log'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    log('ui.error', { message: error.message })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="body">
          <p>The page hit an error.</p>
          <button type="button" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
