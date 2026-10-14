import { motion } from 'motion/react'
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
  const isFiltered =
    Boolean(filters.searchQuery) ||
    filters.category !== 'ALL' ||
    filters.mode !== 'ALL' ||
    filters.cost !== 'ALL' ||
    filters.status !== 'ALL'

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

        {/* Counter & Reset */}
        <div className="flex items-center gap-4 font-mono text-xs">
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

      {/* Category Chips with Notched Rectangles & Animated Sliding Indicator */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* Secondary Quick Toggles: Mode, Cost, Status */}
      <div className="flex flex-wrap items-center gap-6 pt-2 font-mono text-xs text-bone/60">
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
    </div>
  )
}

export function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="p-12 text-center border-2 border-dashed border-bone/20 bg-bone/[0.02] space-y-4 max-w-lg mx-auto">
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
