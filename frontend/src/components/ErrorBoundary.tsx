import { Component, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Erreur inattendue interceptée par ErrorBoundary :', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
          <p className="text-lg font-medium text-slate-900">Une erreur inattendue est survenue.</p>
          <p className="text-sm text-slate-500">
            Recharge la page ; si le problème persiste, contacte le support.
          </p>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      )
    }
    return this.props.children
  }
}
