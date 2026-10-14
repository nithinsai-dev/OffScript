import { getSeatMetrics } from '@/lib/formatters'

interface SeatsBarProps {
  filled?: number
  seatsFilled?: number
  total?: number
  totalSeats?: number
  status?: string
  showLabel?: boolean
  showLabels?: boolean
  compact?: boolean
  className?: string
}

export function SeatsBar({
  filled,
  seatsFilled,
  total,
  totalSeats,
  status,
  showLabel = true,
  showLabels = true,
  compact = false,
  className = '',
}: SeatsBarProps) {
  const actualFilled = filled ?? seatsFilled ?? 0
  const actualTotal = total ?? totalSeats ?? 100
  const shouldShowLabel = showLabel && showLabels

  const { percentage, isCritical, remainingSeats } = getSeatMetrics(
    actualFilled,
    actualTotal
  )

  const isClosed = status && status !== 'OPEN'

  return (
    <div className={`space-y-1 select-none ${className}`}>
      {shouldShowLabel && (
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
          <span className="text-bone/60">
            {actualFilled}/{actualTotal} seats
          </span>
          {isClosed ? (
            <span className="text-bone/40 font-bold">Closed</span>
          ) : isCritical ? (
            <span className="text-volt font-bold">
              {remainingSeats} left
            </span>
          ) : (
            <span className="text-bone/70">{percentage}%</span>
          )}
        </div>
      )}

      {/* Progress track (Sharp ticket-style bar, no pill shape) */}
      <div className={`relative ${compact ? 'h-1.5' : 'h-2'} w-full bg-bone/10 border border-bone/25 overflow-hidden`}>
        <div
          className={`h-full transition-all duration-500 ease-out ${
            isCritical ? 'bg-volt' : 'bg-bone/80'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
