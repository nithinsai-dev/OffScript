import { EventRail } from '@/components/events/EventRail'
import type { Event } from '@/types/event'

interface FeaturedHorizontalProps {
  events: Event[]
}

export function FeaturedHorizontal({ events }: FeaturedHorizontalProps) {
  const featured = events.filter((e) => e.is_featured)
  const displayEvents = featured.length > 0 ? featured : events.slice(0, 6)

  return (
    <section id="featured" className="py-20 md:py-28 border-b border-bone/15 bg-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EventRail
          events={displayEvents}
          title="Featured Events"
          subtitle="Handpicked on Campus"
        />
      </div>
    </section>
  )
}
