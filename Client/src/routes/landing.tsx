import { useMemo, useState, useEffect, useDeferredValue } from 'react'
import { AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Stamp } from '@/components/ui/Stamp'
import { SplitText } from '@/components/effects/SplitText'
import { HeroTagline } from '@/components/effects/HeroTagline'
import { CountUp } from '@/components/effects/CountUp'
import { HeroStage } from '@/components/effects/HeroStage'
import { VelocityMarquee } from '@/components/events/VelocityMarquee'
import { FeaturedStack } from '@/components/events/FeaturedStack'
import { CountdownSection } from '@/components/events/CountdownSection'
import { FilterBar, EmptyState } from '@/components/events/FilterBar'
import { EventCard } from '@/components/events/EventCard'
import { WhySection } from '@/components/events/WhySection'
import { SponsorsSection } from '@/components/events/SponsorsSection'
import { LineupSection } from '@/components/events/LineupSection'
import { EventCardSkeleton } from '@/components/ui/Skeletons'
import { SectionError } from '@/components/ui/SectionError'
import { useEventsQuery } from '@/features/events/queries'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'
import type { EventFilterState } from '@/types/event'

export function LandingPage() {
  const { data, isLoading, isError, error, refetch } = useEventsQuery()
  const { scrollTo } = useLenis()

  const [filters, setFilters] = useState<EventFilterState>({
    searchQuery: '',
    category: 'ALL',
    mode: 'ALL',
    cost: 'ALL',
    status: 'ALL',
  })

  // Debounce search query by 150ms (Target #6)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery)
    }, 150)
    return () => clearTimeout(timer)
  }, [filters.searchQuery])

  const deferredSearch = useDeferredValue(debouncedSearch)

  const events = useMemo(() => data?.events ?? [], [data?.events])
  const hasCachedData = events.length > 0
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return Array.from(set).sort()
  }, [events])

  // Real-time campus fest stats
  const stats = useMemo(() => {
    const totalEvents = events.length
    const openRegistrations = events.filter((e) => e.registration_status === 'OPEN').length
    const remainingSeats = events.reduce(
      (acc, e) => acc + Math.max(0, (e.total_seats ?? 0) - (e.seats_filled ?? 0)),
      0
    )
    return { totalEvents, openRegistrations, remainingSeats }
  }, [events])

  // Filter events client-side using deferredSearch
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Search
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase()
        const matchesName = (e.name || '').toLowerCase().includes(query)
        const matchesBlurb = (e.blurb || '').toLowerCase().includes(query)
        const matchesCategory = (e.category || '').toLowerCase().includes(query)
        const matchesTags = e.tags?.some((t) => t.toLowerCase().includes(query))
        if (!matchesName && !matchesBlurb && !matchesCategory && !matchesTags) {
          return false
        }
      }

      // Category
      if (filters.category !== 'ALL' && e.category !== filters.category) {
        return false
      }

      // Mode
      if (filters.mode !== 'ALL' && e.event_mode !== filters.mode) {
        return false
      }

      // Cost
      if (filters.cost === 'FREE' && (e.price ?? 0) > 0) return false
      if (filters.cost === 'PAID' && (!e.price || e.price === 0)) return false

      // Status
      if (filters.status === 'OPEN' && e.registration_status !== 'OPEN') return false
      if (filters.status === 'CLOSED' && e.registration_status === 'OPEN') return false

      return true
    })
  }, [events, filters, deferredSearch])

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      category: 'ALL',
      mode: 'ALL',
      cost: 'ALL',
      status: 'ALL',
    })
  }

  const handleNav = (target: string) => {
    scrollTo(target, {
      offset: -96,
      duration: 0.9,
      easing: easeOutExpo,
    })
  }

  return (
    <div className="relative w-full">
      {/* 1. HERO */}
      <section
        id="hero"
        className="relative min-h-[90vh] pt-32 pb-20 md:pt-40 md:pb-28 flex flex-col justify-between border-b-2 border-bone/20 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-12">
          {/* Main Hero Header */}
          <div className="space-y-6 max-w-4xl">
            {/* Wordmark Headline */}
            <div className="space-y-2">
              <h1 className="font-display font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.88] tracking-tight text-bone uppercase">
                <SplitText text="OFFSCRIPT" tag="span" />
              </h1>

              {/* Typographic Outlined #beoffscript with Typing Loop */}
              <HeroTagline />
            </div>

            {/* Friendly One-Line Statement */}
            <p className="font-sans text-base sm:text-lg text-bone/75 max-w-xl leading-relaxed">
              Your campus. Your events. Zero boring. Discover and grab your passes for hackathons, jams, and festivals in seconds.
            </p>

            {/* Two Chamfered Rectangular Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                magnetic
                onClick={() => handleNav('#events')}
                cursorLabel="Explore"
              >
                Explore Events
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleNav('#lineup')}
                cursorLabel="Lineup"
              >
                See Lineup
              </Button>
            </div>
          </div>

          {/* 3 Big Stats with CountUp from API Data */}
          <div className="pt-8 border-t-2 border-bone/15 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
            <div className="p-4 border-2 border-bone/20 bg-bone/[0.02] space-y-1">
              <span className="font-mono text-xs text-bone/50 uppercase tracking-widest block">
                Live Events
              </span>
              <span className="font-display text-3xl sm:text-4xl font-black text-bone block">
                {isLoading ? '--' : <CountUp end={stats.totalEvents} />}
              </span>
            </div>

            <div className="p-4 border-2 border-bone/20 bg-bone/[0.02] space-y-1">
              <span className="font-mono text-xs text-bone/50 uppercase tracking-widest block">
                Open Registrations
              </span>
              <span className="font-display text-3xl sm:text-4xl font-black text-volt block">
                {isLoading ? '--' : <CountUp end={stats.openRegistrations} />}
              </span>
            </div>

            <div className="p-4 border-2 border-bone/20 bg-bone/[0.02] space-y-1">
              <span className="font-mono text-xs text-bone/50 uppercase tracking-widest block">
                Seats Left
              </span>
              <span className="font-display text-3xl sm:text-4xl font-black text-bone block">
                {isLoading ? '--' : <CountUp end={stats.remainingSeats} />}
              </span>
            </div>
          </div>

          {/* Invisible Reserved 3D Slot */}
          <HeroStage />
        </div>
      </section>

      {/* 2. VELOCITY-REACTIVE MARQUEE */}
      <VelocityMarquee />

      {/* 3. FEATURED VERTICAL STACKING PASSES */}
      {isLoading ? (
        <section id="featured" className="py-24 border-b-2 border-bone/15 bg-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="w-64 h-8 bg-bone/10 animate-pulse" />
            <div className="grid grid-cols-1 gap-6">
              <EventCardSkeleton />
            </div>
          </div>
        </section>
      ) : hasCachedData ? (
        <FeaturedStack events={events} />
      ) : isError || isOffline ? (
        <section id="featured" className="py-16 border-b-2 border-bone/15 bg-ink">
          <SectionError
            title="Featured Passes Unavailable"
            message={error instanceof Error ? error.message : 'Could not fetch featured passes.'}
            onRetry={() => refetch()}
          />
        </section>
      ) : null}

      {/* 4. COUNTDOWN (MOVED BEFORE ALL EVENTS AS SPECIFIED IN SECTION 2) */}
      <CountdownSection events={events} />

      {/* 5. ALL EVENTS DIRECTORY */}
      <section id="events" className="py-24 md:py-36 border-b-2 border-bone/20 bg-ink content-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="space-y-3 text-center max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
                EVENT PASS DIRECTORY
              </span>
              {/* Saved Data Indicator Stamp */}
              {(isError || isOffline) && hasCachedData && (
                <Stamp variant="bone" rotate={-1}>
                  showing saved data
                </Stamp>
              )}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-bone tracking-tight">
              All Campus Passes
            </h2>
            <p className="font-sans text-xs sm:text-sm text-bone/60">
              Filter by category, mode, or registration status to find your next plan.
            </p>
          </div>

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            categories={categories}
            totalCount={events.length}
            filteredCount={filteredEvents.length}
            onChange={setFilters}
            onReset={handleResetFilters}
          />

          {/* Skeletons Loading Grid (ONLY while first load is in flight) */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error Panel if no cached data exists */}
          {!isLoading && !hasCachedData && (isError || isOffline) && (
            <div className="my-8">
              <SectionError
                title="Could Not Load Events"
                message={error instanceof Error ? error.message : 'Please check your connection and try again.'}
                onRetry={() => refetch()}
              />
            </div>
          )}

          {/* Events Grid (Live or Saved Data) */}
          {!isLoading && hasCachedData && (
            <>
              {filteredEvents.length === 0 ? (
                <EmptyState onReset={handleResetFilters} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  <AnimatePresence>
                    {filteredEvents.map((event, index) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isEager={index < 3}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 6. WHY OFFSCRIPT (3 SIGNATURE HOVER CARDS) */}
      <WhySection />

      {/* 7. SPONSORS MARQUEE */}
      <SponsorsSection />

      {/* 8. EVENT LINEUP (HORIZONTAL STICKY SCROLL - LAST SECTION BEFORE FOOTER) */}
      {isLoading ? (
        <section id="lineup" className="py-20 border-b-2 border-bone/20 bg-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="w-48 h-8 bg-bone/10 animate-pulse" />
            <EventCardSkeleton />
          </div>
        </section>
      ) : hasCachedData ? (
        <LineupSection events={events} />
      ) : (
        <section id="lineup" className="py-16 border-b-2 border-bone/20 bg-ink">
          <SectionError
            title="Lineup Unavailable"
            message="Lineup passes could not be synchronized."
            onRetry={() => refetch()}
          />
        </section>
      )}
    </div>
  )
}
