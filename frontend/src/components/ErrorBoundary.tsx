import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // In production this is where we'd report to an error-tracking service (Sentry, etc.).
    console.error('Unhandled UI error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-6">
          <div className="max-w-md text-center">
            <p className="text-5xl font-semibold tracking-tight text-gradient-gold">Oops</p>
            <h1 className="mt-4 text-xl font-semibold text-ink">Something went wrong.</h1>
            <p className="mt-2 text-sm text-ink-muted">
              An unexpected error interrupted the page. Reloading usually fixes it.
            </p>
            <button onClick={() => window.location.reload()} className="btn-gold mt-6">
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
