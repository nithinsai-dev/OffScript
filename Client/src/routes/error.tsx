import type { ErrorComponentProps } from '@tanstack/react-router'
import { ErrorState } from '@/components/ui/ErrorBoundary'

export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'A catastrophic telemetry anomaly interrupted this view.'

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-24">
      <ErrorState
        title="Telemetry Signal Severed"
        message={errorMessage}
        onRetry={reset}
        showHome
      />
    </div>
  )
}
