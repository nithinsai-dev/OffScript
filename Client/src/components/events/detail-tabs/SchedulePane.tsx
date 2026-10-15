import { useMemo } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import type { ScheduleItem, ScheduleSummary } from '@/types/event'

interface SchedulePaneProps {
  schedules?: ScheduleItem[]
  scheduleSummary?: ScheduleSummary
}

function parseDate(dateStr?: string) {
  if (!dateStr) return { day: '--', month: 'TBA' }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { day: dateStr.slice(-2) || '--', month: 'TBA' }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  }
}

export function SchedulePane({ schedules, scheduleSummary }: SchedulePaneProps) {
  const prefersReduced = usePrefersReducedMotion()

  const items = useMemo(() => {
    if (schedules && schedules.length > 0) {
      return schedules
    }
    if (scheduleSummary?.start_date) {
      return [
        {
          event_date: scheduleSummary.start_date,
          start_time: scheduleSummary.start_time,
          end_time: scheduleSummary.end_time,
          venue: 'Main Campus Hall',
        },
      ]
    }
    return []
  }, [schedules, scheduleSummary])

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          TIMELINE & VENUE
        </span>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Event Schedule
        </h3>
      </div>

      {items.length === 0 ? (
        <p className="font-sans text-sm text-bone/70">
          The full schedule is currently being finalized by the organizing crew. Check back soon.
        </p>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Vertical timeline line drawing in as pane enters */}
          <motion.div
            initial={prefersReduced ? false : { height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-volt/80 origin-top shadow-[0_0_8px_#D4FF3F]"
          />

          {items.map((item, idx) => {
            const { day, month } = parseDate(item.event_date)
            return (
              <motion.div
                key={idx}
                initial={prefersReduced ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: prefersReduced ? 0 : idx * 0.08 + 0.1, duration: 0.3 }}
                className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 border border-bone/15 bg-bone/[0.02]"
              >
                {/* Timeline node marker */}
                <div className="absolute -left-[27px] sm:-left-[35px] top-6 w-3 h-3 bg-volt rotate-45 border-2 border-ink shadow-[0_0_6px_#D4FF3F]" />

                {/* Date Block */}
                <div className="border-2 border-bone/20 p-2 sm:p-3 text-center min-w-[64px] bg-ink select-none shrink-0">
                  <span className="font-display text-2xl sm:text-3xl font-black text-volt block leading-none">
                    {day}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-bone/60 block pt-1 font-bold">
                    {month}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    {(item.start_time || item.end_time) && (
                      <span className="text-volt font-bold">
                        {item.start_time || 'Start TBA'} {item.end_time ? `– ${item.end_time}` : ''}
                      </span>
                    )}
                    {item.venue && (
                      <span className="bg-bone/10 px-2 py-0.5 text-bone/80 text-[11px] border border-bone/10 font-mono">
                        <span className="text-volt mr-1 font-bold">VENUE:</span>
                        {item.venue}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed">
                    Official sessions, workshops, and review rounds at {item.venue || 'assigned campus venue'}.
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default SchedulePane
