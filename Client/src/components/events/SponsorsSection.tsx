import { SPONSORS } from '@/lib/sponsors'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

export function SponsorsSection() {
  const prefersReduced = usePrefersReducedMotion()
  const repeatedSponsors = [...SPONSORS, ...SPONSORS]

  return (
    <section
      id="sponsors"
      className="py-24 md:py-36 border-b-2 border-bone/15 bg-ink select-none overflow-hidden content-auto"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-center">
        {/* Section Header */}
        <div className="space-y-2 max-w-xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
            CAMPUS PARTNERS
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-bone tracking-tight">
            Backed By Great Teams
          </h2>
          <p className="font-sans text-xs sm:text-sm text-bone/60">
            Organizations that power student clubs, hackathons, and creative fests.
          </p>
        </div>

        {/* Slow Logo Marquee Track */}
        <div className="group relative flex w-full overflow-hidden border-y-2 border-bone/20 bg-bone/[0.01] py-8">
          <div
            className={`flex shrink-0 items-center gap-6 sm:gap-10 ${
              prefersReduced
                ? 'flex-wrap justify-center'
                : 'animate-marquee group-hover:[animation-play-state:paused]'
            }`}
            style={{ animationDuration: '45s' }}
          >
            {repeatedSponsors.map((sponsor, idx) => (
              <a
                key={`${sponsor.id}-${idx}`}
                href={sponsor.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="group/item flex items-center gap-3 px-5 py-2.5 border-2 border-bone/20 bg-ink hover:border-volt hover:shadow-hard-volt transition-all duration-200"
              >
                <span className="font-display text-base sm:text-lg font-black uppercase text-bone/70 group-hover/item:text-volt transition-colors">
                  {sponsor.name}
                </span>
                <span className="font-mono text-[10px] text-bone/40 uppercase">
                  {sponsor.industry}
                </span>
              </a>
            ))}
          </div>

          {!prefersReduced && (
            <div
              className="flex shrink-0 items-center gap-6 sm:gap-10 animate-marquee group-hover:[animation-play-state:paused]"
              style={{ animationDuration: '45s' }}
              aria-hidden="true"
            >
              {repeatedSponsors.map((sponsor, idx) => (
                <a
                  key={`repeat-${sponsor.id}-${idx}`}
                  href={sponsor.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="group/item flex items-center gap-3 px-5 py-2.5 border-2 border-bone/20 bg-ink hover:border-volt hover:shadow-hard-volt transition-all duration-200"
                >
                  <span className="font-display text-base sm:text-lg font-black uppercase text-bone/70 group-hover/item:text-volt transition-colors">
                    {sponsor.name}
                  </span>
                  <span className="font-mono text-[10px] text-bone/40 uppercase">
                    {sponsor.industry}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
