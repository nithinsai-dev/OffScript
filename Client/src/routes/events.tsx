import { useMemo, useState, useEffect, useDeferredValue } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { EventCard } from '@/components/events/EventCard'
import { EventCardSkeleton } from '@/components/ui/Skeletons'
import { SectionError } from '@/components/ui/SectionError'
import { useEventsQuery } from '@/features/events/queries'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { handleRouteChangeReveals } from '@/lib/reveal'
import type { Event } from '@/types/event'

export interface EventsSearchSchema {
  q?: string
  category?: string
  mode?: 'OFFLINE' | 'ONLINE'
  price?: 'free' | 'paid'
  status?: 'OPEN' | 'CLOSED'
}

export function EventsPage() {
  const { data, isLoading, isError, error, refetch } = useEventsQuery()
  const searchParams = useSearch({ from: '/events' }) as EventsSearchSchema
  const navigate = useNavigate({ from: '/events' })
  const prefersReduced = usePrefersReducedMotion()

  const [shutterDone, setShutterDone] = useState(false)
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Shutter transition failsafe timer so content is never blocked
  useEffect(() => {
    const t = setTimeout(() => setShutterDone(true), 500)
    return () => clearTimeout(t)
  }, [])

  // Per-route SEO title and meta
  useEffect(() => {
    document.title = 'All Events — OFFSCRIPT'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Browse and secure your pass for all college events, hackathons, competitions, and campus festivals at OFFSCRIPT.'
      )
    }
    return () => {
      document.title = 'OFFSCRIPT — #beoffscript | Event Discovery Platform'
    }
  }, [])

  // Local search query synced with URL search params
  const [searchInput, setSearchInput] = useState(searchParams.q || '')
  const [prevQ, setPrevQ] = useState(searchParams.q || '')

  // Keep local input in sync when searchParams change externally (e.g., Back/Forward navigation)
  if ((searchParams.q || '') !== prevQ) {
    setPrevQ(searchParams.q || '')
    setSearchInput(searchParams.q || '')
  }

  // Debounce search input by 150ms before updating URL search
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      const currentQ = searchParams.q || ''
      if (trimmed !== currentQ) {
        navigate({
          search: (prev: EventsSearchSchema) => ({
            ...prev,
            q: trimmed || undefined,
          }),
          replace: true,
        })
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [searchInput, searchParams.q, navigate])

  const deferredSearch = useDeferredValue(searchParams.q || '')

  const events = useMemo(() => data?.events ?? [], [data?.events])
  const hasCachedData = events.length > 0
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Categories extracted from loaded events
  const categories = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return Array.from(set).sort()
  }, [events])

  // Filter events client-side using URL params and deferred search query
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // 1. Search query
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

      // 2. Category
      if (searchParams.category && searchParams.category !== 'ALL') {
        if (e.category?.toLowerCase() !== searchParams.category.toLowerCase()) {
          return false
        }
      }

      // 3. Mode
      if (searchParams.mode && e.event_mode !== searchParams.mode) {
        return false
      }

      // 4. Price (free or paid)
      if (searchParams.price === 'free' && (e.price ?? 0) > 0) return false
      if (searchParams.price === 'paid' && (!e.price || e.price === 0)) return false

      // 5. Status
      if (searchParams.status === 'OPEN' && e.registration_status !== 'OPEN') return false
      if (searchParams.status === 'CLOSED' && e.registration_status === 'OPEN') return false

      return true
    })
  }, [events, searchParams, deferredSearch])

  // Progressive rendering: initial 12 cards, rest progressively
  const [visibleCount, setVisibleCount] = useState(12)
  const filterKey = `${searchParams.q || ''}_${searchParams.category || ''}_${searchParams.mode || ''}_${searchParams.price || ''}_${searchParams.status || ''}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)

  // Reset visibleCount when filters change
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setVisibleCount(12)
  }

  const displayedEvents = filteredEvents.slice(0, visibleCount)
  const hasMore = visibleCount < filteredEvents.length

  // Re-scan and reveal in-view cards immediately when displayed events update or filters change
  useEffect(() => {
    handleRouteChangeReveals()
  }, [displayedEvents.length, filterKey])

  // Near-end observer to automatically load more cards when scrolled close to bottom
  useEffect(() => {
    if (!hasMore) return

    const sentinel = document.getElementById('events-load-more-sentinel')
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 12)
        }
      },
      { rootMargin: '350px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore])

  // Filter Updater Handlers
  const handleCategorySelect = (cat: string) => {
    navigate({
      search: (prev: EventsSearchSchema) => ({
        ...prev,
        category: cat === 'ALL' ? undefined : cat,
      }),
    })
  }

  const handleModeSelect = (mode: 'ALL' | 'OFFLINE' | 'ONLINE') => {
    navigate({
      search: (prev: EventsSearchSchema) => ({
        ...prev,
        mode: mode === 'ALL' ? undefined : mode,
      }),
    })
  }

  const handlePriceSelect = (price: 'all' | 'free' | 'paid') => {
    navigate({
      search: (prev: EventsSearchSchema) => ({
        ...prev,
        price: price === 'all' ? undefined : price,
      }),
    })
  }

  const handleStatusSelect = (status: 'ALL' | 'OPEN' | 'CLOSED') => {
    navigate({
      search: (prev: EventsSearchSchema) => ({
        ...prev,
        status: status === 'ALL' ? undefined : status,
      }),
    })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    navigate({
      search: () => ({}),
      replace: true,
    })
  }

  const isFiltered = Boolean(
    searchParams.q ||
    searchParams.category ||
    searchParams.mode ||
    searchParams.price ||
    searchParams.status
  )

  return (
    <div className="relative w-full min-h-screen pt-28 pb-32">
      {/* Route Shutter Transition: fast Volt curtain swipe on entry */}
      {!shutterDone && !isLite && !prefersReduced && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 bg-volt border-b-4 border-ink"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ originY: 0 }}
          onAnimationComplete={() => setShutterDone(true)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Heading & One Supporting Line */}
        <div className="space-y-3 border-b-2 border-bone/15 pb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-volt rotate-45 shrink-0" />
            <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold">
              EVENT DIRECTORY
            </span>
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-bone leading-[0.95]">
            All events
          </h1>
          <p className="font-sans text-sm sm:text-base text-bone/70 max-w-2xl leading-relaxed">
            Browse and filter through every upcoming hackathon, competition, workshop, and cultural fest on campus.
          </p>
        </div>

        {/* Search Input & Status Summary */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by event name, category, or tag..."
                aria-label="Search events"
                className="w-full bg-bone/[0.03] border-2 border-bone/20 px-4 py-3 font-sans text-sm text-bone placeholder:text-bone/40 focus:border-volt focus:outline-none transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search query"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-bone/50 hover:text-bone p-1 font-mono text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Result Count & Reset Button */}
            <div className="flex items-center justify-between sm:justify-end gap-4 font-mono text-xs">
              <span className="text-bone/60">
                Showing <span className="text-volt font-bold">{filteredEvents.length}</span> of {events.length} events
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-volt underline hover:text-bone transition-colors uppercase font-bold"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips with Sliding Indicator */}
          <div className="flex flex-wrap items-center gap-2 select-none" role="tablist" aria-label="Event categories">
            {['ALL', ...categories].map((cat) => {
              const currentCat = searchParams.category || 'ALL'
              const isActive = currentCat.toLowerCase() === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleCategorySelect(cat)}
                  className={`relative px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt border ${
                    isActive
                      ? 'text-ink font-black border-volt'
                      : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="events-active-cat-indicator"
                      className="absolute inset-0 bg-volt z-0"
                      transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              )
            })}
          </div>

          {/* Secondary Quick Filter Toggles: Mode, Price, Status */}
          <div className="flex flex-wrap items-center gap-6 pt-1 font-mono text-xs text-bone/60 border-t border-bone/10">
            {/* Mode: OFFLINE / ONLINE */}
            <div className="flex items-center gap-1.5 pt-2">
              <span className="text-[10px] text-bone/40 uppercase mr-1">Mode:</span>
              {(['ALL', 'OFFLINE', 'ONLINE'] as const).map((mode) => {
                const currentMode = searchParams.mode || 'ALL'
                const isActive = currentMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeSelect(mode)}
                    className={`px-2.5 py-1 text-[11px] border transition-colors ${
                      isActive
                        ? 'bg-bone text-ink font-bold border-bone'
                        : 'hover:text-bone bg-bone/[0.03] border-bone/15 text-bone/60'
                    }`}
                  >
                    {mode}
                  </button>
                )
              })}
            </div>

            {/* Price: Free / Paid */}
            <div className="flex items-center gap-1.5 pt-2">
              <span className="text-[10px] text-bone/40 uppercase mr-1">Price:</span>
              {(['all', 'free', 'paid'] as const).map((price) => {
                const currentPrice = searchParams.price || 'all'
                const isActive = currentPrice === price
                return (
                  <button
                    key={price}
                    type="button"
                    onClick={() => handlePriceSelect(price)}
                    className={`px-2.5 py-1 text-[11px] border uppercase transition-colors ${
                      isActive
                        ? 'bg-bone text-ink font-bold border-bone'
                        : 'hover:text-bone bg-bone/[0.03] border-bone/15 text-bone/60'
                    }`}
                  >
                    {price}
                  </button>
                )
              })}
            </div>

            {/* Status: Open / Closed */}
            <div className="flex items-center gap-1.5 pt-2">
              <span className="text-[10px] text-bone/40 uppercase mr-1">Status:</span>
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((status) => {
                const currentStatus = searchParams.status || 'ALL'
                const isActive = currentStatus === status
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusSelect(status)}
                    className={`px-2.5 py-1 text-[11px] border transition-colors ${
                      isActive
                        ? 'bg-volt text-ink font-bold border-volt'
                        : 'hover:text-bone bg-bone/[0.03] border-bone/15 text-bone/60'
                    }`}
                  >
                    {status}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Loading Skeletons: rendered ONLY while initial data is in flight */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Offline / Error Panel with Retry */}
        {!isLoading && !hasCachedData && (isError || isOffline) && (
          <div className="py-12">
            <SectionError
              title="Could Not Load Events"
              message={error instanceof Error ? error.message : 'Please check your connection and try again.'}
              onRetry={() => refetch()}
            />
          </div>
        )}

        {/* Events Grid (Live or Cached) */}
        {!isLoading && hasCachedData && (
          <>
            {filteredEvents.length === 0 ? (
              /* Designed Empty State */
              <div className="p-12 text-center border-2 border-dashed border-bone/25 bg-bone/[0.02] space-y-4 max-w-lg mx-auto my-12">
                <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
                  NO PASSES FOUND
                </span>
                <h3 className="font-display text-2xl font-black uppercase text-bone">
                  No Matching Campus Events
                </h3>
                <p className="font-sans text-xs sm:text-sm text-bone/60 leading-relaxed">
                  We could not find any events matching your selected filters or search terms. Try clearing some filters.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-6 py-2.5 bg-volt text-ink font-mono text-xs uppercase font-bold tracking-wider hover:bg-bone transition-colors"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  <AnimatePresence>
                    {displayedEvents.map((event: Event, index: number) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isEager={index < 3}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Progressive load more: Sentinel & Manual Button */}
                {hasMore && (
                  <div id="events-load-more-sentinel" className="flex justify-center pt-8">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="px-8 py-3.5 border-2 border-bone/30 text-bone hover:border-volt hover:text-volt font-mono text-xs uppercase tracking-widest transition-colors duration-200"
                    >
                      Load More Passes ({filteredEvents.length - visibleCount} Remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
