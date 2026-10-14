import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OFFSCRIPT ErrorBoundary] Captured crash:', error, errorInfo)
  }

  resetBoundary = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorState
          title={this.props.sectionName ? `${this.props.sectionName} Error` : 'Something Went Wrong'}
          message={this.state.error?.message || 'We ran into a hiccup loading this section.'}
          onRetry={this.resetBoundary}
        />
      )
    }

    return this.props.children
  }
}

/**
 * On-brand visual error block adhering strictly to three-color rules and soft brutalism
 */
export function ErrorState({
  title = 'Something Went Wrong',
  message = 'We ran into an unexpected error loading event data.',
  code,
  onRetry,
  showHome = false,
}: {
  title?: string
  message?: string
  code?: string
  onRetry?: () => void
  showHome?: boolean
}) {
  return (
    <div className="relative rounded-3xl border border-bone/20 bg-bone/[0.02] p-8 sm:p-12 shadow-hard-bone max-w-lg mx-auto my-8 select-none text-center space-y-6">
      <div className="flex items-center justify-between border-b border-bone/10 pb-4">
        <span className="font-mono text-xs uppercase tracking-wider text-volt font-bold">
          {code || 'Notice'}
        </span>
        <span className="font-mono text-xs text-bone/40">OFFSCRIPT</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-2xl sm:text-3xl font-black uppercase text-bone tracking-tight">
          {title}
        </h3>
        <p className="font-sans text-sm text-bone/70 leading-relaxed max-w-md mx-auto">
          {message}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            Try Again
          </Button>
        )}
        {showHome && (
          <Button variant="secondary" href="/">
            Back to Home
          </Button>
        )}
      </div>
    </div>
  )
}
