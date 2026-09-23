import { Component, type ReactNode } from 'react'
import { reportClientError } from '../../services/monitoring'
import Button from '../ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch() {
    void reportClientError('react_render_error', window.location.pathname).catch(() => undefined)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Diese Ansicht konnte nicht geladen werden
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Es wurden keine Texte, E-Mail-Adressen oder technischen Details übertragen – nur ein anonymer Fehlercode innerhalb deines Betriebs.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            App neu laden
          </Button>
        </div>
      </main>
    )
  }
}
