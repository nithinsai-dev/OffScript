import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { EventFilterState, EventFilterMode, EventFilterCost, EventFilterStatus } from '@/types/event'

interface FilterBarProps {
  filters: EventFilterState
  categories: string[]
  totalCount: number
  filteredCount: number
  onChange: (updater: (prev: EventFilterState) => EventFilterState) => void
  onReset: () => void
}

export function FilterBar({
  filters,
  categories,
  totalCount,
  filteredCount,
  onChange,
  onReset,
}: FilterBarProps) {
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const bottomSheetRef = useRef<HTMLDivElement | null>(null)

  const activeCount = [
    filters.category !== 'ALL',
    filters.mode !== 'ALL',
    filters.cost !== 'ALL',
    filters.status !== 'ALL',
  ].filter(Boolean).length

  const isFiltered =
    Boolean(filters.searchQuery) ||
    filters.category !== 'ALL' ||
    filters.mode !== 'ALL' ||
    filters.cost !== 'ALL' ||
    filters.status !== 'ALL'

  // Lock scroll while mobile bottom sheet is open
  useEffect(() => {
    if (bottomSheetOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [bottomSheetOpen])

  // Escape key closes bottom sheet
  useEffect(() => {
    if (!bottomSheetOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBottomSheetOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bottomSheetOpen])

  // Focus trap inside bottom sheet
  useEffect(() => {
    if (!bottomSheetOpen) return
    const container = bottomSheetRef.current
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
  }, [bottomSheetOpen])

  const handleClearFilters = () => {
    onChange((prev) => ({
      ...prev,
      category: 'ALL',
      mode: 'ALL',
      cost: 'ALL',
      status: 'ALL',
    }))
  }

  return (
    <div className="space-y-6">
      {/* Search Input & Status Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            placeholder="Search by event name, category, or tag..."
            className="w-full bg-bone/[0.03] border-2 border-bone/20 px-4 py-2.5 font-sans text-sm text-bone placeholder:text-bone/40 focus:border-volt focus:outline-none transition-colors"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, searchQuery: '' }))}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-bone/50 hover:text-bone p-1"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Counter & Reset (Desktop only; mobile shows under filters button) */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-xs">
          <span className="text-bone/60">
            Showing <span className="text-volt font-bold">{filteredCount}</span> of {totalCount} events
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="text-volt underline hover:text-bone transition-colors uppercase font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* MOBILE ONLY: Single Chamfered "Filters" Button with Count + Counter */}
      <div className="md:hidden flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => setBottomSheetOpen(true)}
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
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-volt text-ink font-mono text-[11px] font-black tracking-normal">
              {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-bone/60 text-[11px]">
            <span className="text-volt font-bold">{filteredCount}</span>/{totalCount}
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="text-volt underline text-[11px] uppercase font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP ONLY: Category Chips with Notched Rectangles */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {['ALL', ...categories].map((cat) => {
          const isActive = filters.category === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, category: cat }))}
              className={`relative px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt select-none border ${
                isActive
                  ? 'text-ink font-black border-volt'
                  : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="filter-active-pill"
                  className="absolute inset-0 bg-volt z-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          )
        })}
      </div>

      {/* DESKTOP ONLY: Secondary Quick Toggles: Mode, Cost, Status */}
      <div className="hidden md:flex flex-wrap items-center gap-6 pt-2 font-mono text-xs text-bone/60">
        {/* Mode */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-bone/40 uppercase mr-1">Mode:</span>
          {(['ALL', 'OFFLINE', 'ONLINE'] as const).map((mode: EventFilterMode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, mode }))}
              className={`px-2.5 py-1 text-[11px] border transition-colors ${
                filters.mode === mode
                  ? 'bg-bone text-ink font-bold border-bone'
                  : 'hover:text-bone bg-bone/[0.03] border-bone/15 text-bone/60'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Cost */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-bone/40 uppercase mr-1">Cost:</span>
          {(['ALL', 'FREE', 'PAID'] as const).map((cost: EventFilterCost) => (
            <button
              key={cost}
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, cost }))}
              className={`px-2.5 py-1 text-[11px] border transition-colors ${
                filters.cost === cost
                  ? 'bg-bone text-ink font-bold border-bone'
                  : 'hover:text-bone bg-bone/[0.03] border-bone/15 text-bone/60'
              }`}
            >
              {cost}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-bone/40 uppercase mr-1">Status:</span>
          {(['ALL', 'OPEN', 'CLOSED'] as const).map((status: EventFilterStatus) => (
            <button
              key={status}
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, status }))}
              className={`px-2.5 py-1 text-[11px] border transition-colors ${
                filters.status === status
                  ? 'bg-volt text-ink font-bold border-volt'
                  : 'hover:text-bone bg-bone/[0.03] border-bone/15 text-bone/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE ONLY: BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {bottomSheetOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBottomSheetOpen(false)}
              className="fixed inset-0 bg-ink/80 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              ref={bottomSheetRef}
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
                    Filters {activeCount > 0 && `(${activeCount})`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBottomSheetOpen(false)}
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
                      const isActive = filters.category === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => onChange((prev) => ({ ...prev, category: cat }))}
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
                    {(['ALL', 'OFFLINE', 'ONLINE'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onChange((prev) => ({ ...prev, mode }))}
                        className={`py-2 px-3 border text-center font-bold min-h-[44px] transition-colors ${
                          filters.mode === mode
                            ? 'bg-bone text-ink border-bone'
                            : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Cost */}
                <div className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-volt font-bold block">
                    Cost
                  </span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {(['ALL', 'FREE', 'PAID'] as const).map((cost) => (
                      <button
                        key={cost}
                        type="button"
                        onClick={() => onChange((prev) => ({ ...prev, cost }))}
                        className={`py-2 px-3 border text-center font-bold min-h-[44px] transition-colors ${
                          filters.cost === cost
                            ? 'bg-bone text-ink border-bone'
                            : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                        }`}
                      >
                        {cost}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Status */}
                <div className="space-y-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-volt font-bold block">
                    Status
                  </span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {(['ALL', 'OPEN', 'CLOSED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onChange((prev) => ({ ...prev, status }))}
                        className={`py-2 px-3 border text-center font-bold min-h-[44px] transition-colors ${
                          filters.status === status
                            ? 'bg-volt text-ink border-volt'
                            : 'text-bone/70 border-bone/20 hover:border-bone/50 bg-bone/[0.02]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Clear & Apply */}
              <div className="p-4 border-t-2 border-bone/15 flex items-center justify-between gap-4 shrink-0 bg-bone/[0.02]">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="font-mono text-xs uppercase font-bold text-bone/70 hover:text-bone py-2 px-4 min-h-[44px] border border-bone/20 transition-colors"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setBottomSheetOpen(false)}
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
  )
}

export function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="relative p-12 text-center border-2 border-dashed border-bone/20 bg-bone/[0.02] space-y-4 max-w-lg mx-auto overflow-hidden">
      {/* Decorative static splash */}
      <div className="w-16 h-16 mx-auto opacity-25 pointer-events-none select-none text-volt" aria-hidden="true">
        <svg viewBox="0 0 560 560" className="w-full h-full fill-current">
          <path d="M 400.1 270.3 C 400.0 283.7, 378.3 285.3, 406.3 301.3 C 434.3 317.3, 569.2 362.5, 568.0 366.3 C 566.8 370.0, 430.2 321.5, 399.0 323.6 C 367.9 325.6, 386.2 362.5, 381.1 378.7 C 375.9 394.9, 359.5 391.1, 368.2 420.7 C 376.8 450.4, 436.3 554.9, 433.1 556.7 C 430.0 558.5, 372.8 450.1, 349.1 431.6 C 325.4 413.1, 309.2 445.8, 291.0 445.5 C 272.9 445.3, 261.2 398.4, 240.3 430.2 C 219.4 462.0, 170.8 637.8, 165.6 636.3 C 160.4 634.9, 208.4 462.1, 209.1 421.4 C 209.9 380.8, 181.8 404.4, 170.3 392.5 C 158.8 380.5, 148.0 362.1, 140.4 349.5 C 132.8 337.0, 153.9 319.0, 124.8 317.1 C 95.7 315.3, -33.1 343.3, -34.2 338.5 C -35.3 333.7, 91.1 303.3, 118.2 288.3 C 145.2 273.2, 141.5 260.4, 128.1 248.3 C 114.7 236.2, 36.9 219.4, 37.8 215.6 C 38.7 211.9, 114.9 228.7, 133.3 225.7 C 151.7 222.7, 141.5 208.5, 148.1 197.8 C 154.7 187.1, 176.5 180.3, 172.9 161.5 C 169.3 142.6, 123.8 86.8, 126.5 84.7 C 129.3 82.6, 172.7 143.8, 189.2 148.9 C 205.7 154.0, 211.1 121.5, 225.6 115.3 C 240.1 109.0, 263.6 132.3, 276.2 111.3 C 288.9 90.3, 297.8 -11.1, 301.4 -10.6 C 305.1 -10.2, 290.3 94.3, 297.9 113.8 C 305.5 133.4, 332.3 101.0, 347.3 106.5 C 362.3 112.0, 364.9 151.6, 387.9 146.7 C 410.9 141.8, 482.7 74.1, 485.5 77.3 C 488.2 80.4, 419.1 144.8, 404.6 165.6 C 390.1 186.4, 382.5 201.4, 398.6 202.0 C 414.7 202.7, 499.8 166.3, 501.1 169.5 C 502.5 172.6, 423.6 204.2, 406.7 221.1 C 389.9 237.9, 400.2 256.9, 400.1 270.3 Z" />
        </svg>
      </div>
      <div className="font-mono text-xs uppercase tracking-widest text-volt">
        NO PASSES FOUND
      </div>
      <h3 className="font-display text-2xl font-black uppercase text-bone">
        No Matching Campus Events
      </h3>
      <p className="font-sans text-xs sm:text-sm text-bone/60">
        Try relaxing your search terms or toggling category filters to find upcoming events.
      </p>
      {onReset && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-2.5 bg-volt text-ink font-mono text-xs uppercase font-bold tracking-wider hover:bg-bone transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}
