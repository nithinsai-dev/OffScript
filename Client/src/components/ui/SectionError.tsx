import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Stamp } from '@/components/ui/Stamp'

interface SectionErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function SectionError({
  title = 'Could Not Load Passes',
  message = 'Check your campus network connection or retry the request.',
  onRetry,
  className = '',
}: SectionErrorProps) {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  useEffect(() => {
    const handleOnline = () => {
      onRetry?.()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [onRetry])

  return (
    <div
      className={`border-2 border-dashed border-bone/30 bg-bone/[0.02] p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto relative ${className}`}
    >
      <div className="flex items-center justify-between border-b border-bone/15 pb-3">
        <span className="font-mono text-[10px] text-bone/40 uppercase tracking-widest">
          ERROR STATUS // {isOffline ? 'OFFLINE' : 'SERVER'}
        </span>
        <Stamp variant="bone" rotate={2}>
          {isOffline ? 'OFFLINE' : 'ERROR'}
        </Stamp>
      </div>

      <div className="space-y-2 pt-2">
        <h3 className="font-display text-xl sm:text-2xl font-black uppercase text-bone">
          {isOffline ? 'Offline Mode' : title}
        </h3>
        <p className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed">
          {isOffline
            ? 'Your device appears offline. We will automatically reload when your connection returns.'
            : message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-3 flex justify-center">
          <Button variant="primary" size="sm" onClick={onRetry} cursorLabel="Retry">
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  )
}
