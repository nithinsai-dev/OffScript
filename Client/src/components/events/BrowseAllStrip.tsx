import { Link, useRouter } from '@tanstack/react-router'
import { CountUp } from '@/components/effects/CountUp'
import { useCursor } from '@/hooks/useCursor'

interface BrowseAllStripProps {
  totalEvents: number
  openRegistrations?: number
}

export function BrowseAllStrip({ totalEvents, openRegistrations }: BrowseAllStripProps) {
  const router = useRouter()
  const { setCursor, resetCursor } = useCursor()

  const handlePrefetch = () => {
    router.preloadRoute({ to: '/events' })
  }

  return (
    <section className="py-12 md:py-16 bg-ink border-b-2 border-bone/20 select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative border-2 border-bone/25 bg-bone/[0.02] p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
          {/* Subtle Corner Chamfer Accents */}
          <div aria-hidden="true" className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-volt" />
          <div aria-hidden="true" className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-volt" />

          {/* Left info */}
          <div className="space-y-2 text-center sm:text-left">
            <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
              FULL CATALOGUE
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black uppercase text-bone tracking-tight">
              Looking for more plans?
            </h2>
            <p className="font-sans text-xs sm:text-sm text-bone/60 max-w-md">
              Explore all college hackathons, gaming tournaments, paper presentations, and cultural fests.
            </p>
          </div>

          {/* Big Chamfered Button */}
          <div className="shrink-0 w-full sm:w-auto">
            <Link
              to="/events"
              preload="intent"
              onMouseEnter={() => {
                handlePrefetch()
                setCursor('card', 'Explore')
              }}
              onFocus={handlePrefetch}
              onMouseLeave={resetCursor}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 sm:py-5 bg-volt text-ink font-mono font-black text-sm uppercase tracking-wider clip-chamfer-btn hover:bg-bone transition-colors shadow-hard-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
            >
              <span>Browse All Events</span>
              <span className="bg-ink text-volt text-xs px-2 py-0.5 border border-ink font-mono font-black">
                {totalEvents > 0 ? <CountUp end={totalEvents} /> : '--'} PASSES
              </span>
              <span aria-hidden="true" className="text-base font-bold">→</span>
            </Link>
            {openRegistrations !== undefined && openRegistrations > 0 && (
              <span className="block text-center sm:text-right font-mono text-[10px] text-bone/40 uppercase tracking-widest pt-2">
                {openRegistrations} registrations currently open
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
