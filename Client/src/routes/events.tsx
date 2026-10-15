import { useMemo, useState, useEffect, useDeferredValue, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { EventCard } from '@/components/events/EventCard'
import { EventCardSkeleton } from '@/components/ui/Skeletons'
import { SectionError } from '@/components/ui/SectionError'
import { useEventsQuery } from '@/features/events/queries'
import { handleRouteChangeReveals } from '@/lib/reveal'
import type { Event } from '@/types/event'

export interface EventsSearchSchema {
  q?: string
  category?: string
  mode?: 'OFFLINE' | 'ONLINE'
  price?: 'free' | 'paid'
  status?: 'OPEN' | 'CLOSED'
}

const DEFAULT_CATEGORIES = [
  'Aerial Robotics',
  'Art & Design',
  'Artificial Intelligence',
  'Arts & Craft',
  'Astronomy',
  'Coding',
  'Cybersecurity',
  'Dance',
  'Debate & Literary',
  'Design',
  'Design & Product',
  'Engineering',
  'Entrepreneurship',
  'Film & Media',
  'Food & Culture',
  'Gaming',
  'Hackathon',
  'Literary Arts',
  'Music',
  'Photography',
  'Quiz & Culture',
  'Robotics',
  'Robotics & Electronics',
  'Sustainability',
  'Theatre',
  'Visual Arts',
  'Web Development',
]

export function EventsPage() {
  const { data, isLoading, isError, error, refetch } = useEventsQuery()
  const searchParams = useSearch({ from: '/events' }) as EventsSearchSchema
  const navigate = useNavigate({ from: '/events' })

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

  // Categories extracted from loaded events with DEFAULT_CATEGORIES to eliminate height jump
  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES)
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

  // Progressive rendering: initial 9 cards on first paint, rest progressively
  const [visibleCount, setVisibleCount] = useState(9)
  const filterKey = `${searchParams.q || ''}_${searchParams.category || ''}_${searchParams.mode || ''}_${searchParams.price || ''}_${searchParams.status || ''}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)

  // Reset visibleCount when filters change
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setVisibleCount(9)
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
          setVisibleCount((prev) => prev + 9)
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

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const mobileFiltersRef = useRef<HTMLDivElement | null>(null)

  const activeFiltersCount = [
    Boolean(searchParams.category && searchParams.category.toLowerCase() !== 'all'),
    Boolean(searchParams.mode),
    Boolean(searchParams.price),
    Boolean(searchParams.status),
  ].filter(Boolean).length

  // Lock scroll while mobile filters sheet is open
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileFiltersOpen])

  // Escape key closes mobile filters sheet
  useEffect(() => {
    if (!mobileFiltersOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileFiltersOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileFiltersOpen])

  // Focus trap inside mobile filters sheet
  useEffect(() => {
    if (!mobileFiltersOpen) return
    const container = mobileFiltersRef.current
    if (!container) return

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )
    if (focusable.length > 0) {
      focusable[0].focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const current = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (current.length === 0) return

      const first = current[0]
      const last = current[current.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTabKey)
    return () => window.removeEventListener('keydown', handleTabKey)
  }, [mobileFiltersOpen])

  return (
    <div className="relative w-full min-h-screen pt-28 pb-32">

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

            {/* Live Result Count & Reset Button (Desktop) */}
            <div className="hidden md:flex items-center justify-between sm:justify-end gap-4 font-mono text-xs">
              <span className="text-bone/60 tabular-nums inline-block min-w-[190px]">
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

          {/* MOBILE ONLY: Single Chamfered "Filters" Button with Count + Result Summary */}
          <div className="md:hidden flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 min-h-[44px] bg-bone/[0.04] border-2 border-bone/25 text-bone hover:border-volt hover:text-volt font-mono text-xs uppercase font-bold tracking-wider transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
              style={{
                clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <svg className="w-4 h-4 text-volt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-volt text-ink font-mono text-[11px] font-black tracking-normal">
                  {activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-bone/60 text-[11px]">
                <span className="text-volt font-bold">{filteredEvents.length}</span>/{events.length}
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-volt underline text-[11px] uppercase font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP ONLY: Category Filter Chips & Secondary Toggles */}
          <div className="hidden md:block space-y-6">
            {/* Category Filter Chips with Sliding Indicator */}
            <div className="flex overflow-x-auto sm:flex-wrap items-center gap-2 select-none py-1 scrollbar-none" role="tablist" aria-label="Event categories">
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
                    className={`relative shrink-0 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt border ${
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

          {/* MOBILE ONLY: BOTTOM SHEET MODAL */}
          <AnimatePresence>
            {mobileFiltersOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileFiltersOpen(false)}
                  className="fixed inset-0 bg-ink/80 backdrop-blur-sm"
                  aria-hidden="true"
                />

                {/* Bottom Sheet Card */}
                <motion.div
                  ref={mobileFiltersRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filter events"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative z-10 bg-ink border-t-2 border-bone/30 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,16px))]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b-2 border-bone/15 shrink-0 bg-bone/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-volt rotate-45" />
                      <h3 className="font-display font-black text-lg uppercase text-bone">
                        Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="font-mono text-xs uppercase font-bold text-bone/60 hover:text-volt px-2 py-1 min-h-[44px] min-w-[44px] flex items-center justify-center border border-bone/20"
                    >
                      Close
                    </button>
                  </div>

                  {/* Scrollable Filters Content */}
                  <div className="p-4 overflow-y-auto space-y-6 flex-1">
                    {/* 1. Category */}
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-volt font-bold block">
                        Category
                      </span>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-bone/15 bg-bone/[0.02]">
                        {['ALL', ...categories].map((cat) => {
                          const currentCat = searchParams.category || 'ALL'
                          const isActive = currentCat.toLowerCase() === cat.toLowerCase()
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategorySelect(cat)}
                              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border min-h-[38px] transition-colors ${
                                isActive
                                  ? 'bg-volt text-ink font-bold border-volt'
                                  : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                              }`}
                            >
                              {cat}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 2. Mode */}
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-volt font-bold block">
                        Event Mode
                      </span>
                      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        {(['ALL', 'OFFLINE', 'ONLINE'] as const).map((mode) => {
                          const currentMode = searchParams.mode || 'ALL'
                          const isActive = currentMode === mode
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => handleModeSelect(mode)}
                              className={`py-2 px-3 border text-center font-bold min-h-[44px] transition-colors ${
                                isActive
                                  ? 'bg-bone text-ink border-bone'
                                  : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                              }`}
                            >
                              {mode}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 3. Cost */}
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-volt font-bold block">
                        Cost
                      </span>
                      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        {(['all', 'free', 'paid'] as const).map((price) => {
                          const currentPrice = searchParams.price || 'all'
                          const isActive = currentPrice === price
                          return (
                            <button
                              key={price}
                              type="button"
                              onClick={() => handlePriceSelect(price)}
                              className={`py-2 px-3 border text-center font-bold min-h-[44px] uppercase transition-colors ${
                                isActive
                                  ? 'bg-bone text-ink border-bone'
                                  : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                              }`}
                            >
                              {price}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 4. Status */}
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-volt font-bold block">
                        Status
                      </span>
                      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        {(['ALL', 'OPEN', 'CLOSED'] as const).map((status) => {
                          const currentStatus = searchParams.status || 'ALL'
                          const isActive = currentStatus === status
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusSelect(status)}
                              className={`py-2 px-3 border text-center font-bold min-h-[44px] transition-colors ${
                                isActive
                                  ? 'bg-volt text-ink border-volt'
                                  : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                              }`}
                            >
                              {status}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions: Clear & Apply */}
                  <div className="p-4 border-t-2 border-bone/15 flex items-center justify-between gap-4 shrink-0 bg-bone/[0.02]">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="font-mono text-xs uppercase font-bold text-bone/70 hover:text-bone py-2 px-4 min-h-[44px] border border-bone/20 transition-colors"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="flex-1 py-2.5 px-6 bg-volt text-ink font-mono text-xs uppercase font-black tracking-wider hover:bg-bone transition-colors min-h-[44px] text-center"
                      style={{
                        clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                      }}
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading Skeletons: rendered ONLY while initial data is in flight and no cached data exists */}
        {isLoading && !hasCachedData && (
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
        {hasCachedData && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
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
