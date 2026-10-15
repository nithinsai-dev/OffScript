import { useRef, useState, type MouseEvent } from 'react'
import { EventCard } from '@/components/events/EventCard'
import { useCursor } from '@/hooks/useCursor'
import type { Event } from '@/types/event'

interface EventRailProps {
  events: Event[]
  title?: string
  subtitle?: string
  className?: string
}

export function EventRail({
  events,
  title,
  subtitle,
  className = '',
}: EventRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const { setCursor, resetCursor } = useCursor()

  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!railRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - railRef.current.offsetLeft)
    setScrollLeft(railRef.current.scrollLeft)
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !railRef.current) return
    e.preventDefault()
    const x = e.pageX - railRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // Scroll speed multiplier
    railRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
    resetCursor()
  }

  const scrollByAmount = (distance: number) => {
    if (!railRef.current) return
    railRef.current.scrollBy({ left: distance, behavior: 'smooth' })
  }

  if (events.length === 0) return null

  return (
    <div data-reveal="rail" className={`space-y-6 ${className}`}>
      {/* Header with Title and Prev/Next Navigation Controls */}
      {(title || subtitle) && (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            {subtitle && (
              <span className="font-mono text-xs uppercase tracking-wider text-volt font-bold block">
                {subtitle}
              </span>
            )}
            {title && (
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-bone tracking-tight">
                {title}
              </h2>
            )}
          </div>

          {/* Prev / Next Arrow Buttons */}
          <div className="flex items-center gap-2 select-none">
            <button
              type="button"
              onClick={() => scrollByAmount(-360)}
              aria-label="Scroll left"
              className="w-9 h-9 border-2 border-bone/25 flex items-center justify-center text-bone hover:border-volt hover:text-volt hover:bg-bone/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt font-mono font-bold text-sm"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(360)}
              aria-label="Scroll right"
              className="w-9 h-9 border-2 border-bone/25 flex items-center justify-center text-bone hover:border-volt hover:text-volt hover:bg-bone/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt font-mono font-bold text-sm"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Native Drag-To-Scroll Snap Rail (Wheel is never hijacked) */}
      <div
        ref={railRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onMouseEnter={() => setCursor('drag', 'Drag')}
        className={`flex gap-6 overflow-x-auto snap-x snap-mandatory py-4 no-scrollbar cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'pointer-events-none' : ''
        }`}
      >
        {events.map((event, idx) => (
          <div
            key={event.id}
            className="w-[85vw] sm:w-[360px] md:w-[380px] shrink-0 snap-start"
          >
            <EventCard event={event} isEager={idx === 0} />
          </div>
        ))}
      </div>
    </div>
  )
}
