import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'
import { BRAND } from '@/lib/config'
import { RegisterButton } from '@/components/ui/RegisterButton'

export function Footer() {
  const { scrollTo } = useLenis()
  const routerState = useRouterState()
  const navigate = useNavigate()
  const isLandingPage = routerState.location.pathname === '/'

  const handleSectionNav = (id: string) => {
    if (isLandingPage) {
      scrollTo(`#${id}`, {
        offset: -96,
        duration: 0.9,
        easing: easeOutExpo,
      })
    } else {
      navigate({ to: '/', hash: id })
    }
  }

  return (
    <footer id="footer" className="relative border-t-2 border-bone/20 bg-ink pt-20 pb-12 select-none overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Top Content Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-start">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-volt rotate-45" />
              <span className="font-display text-3xl font-black text-bone tracking-tight uppercase">
                {BRAND.name}
              </span>
            </div>
            <div className="font-mono text-xs text-volt uppercase tracking-widest font-bold">
              {BRAND.tagline}
            </div>
            <p className="font-sans text-xs sm:text-sm text-bone/60 max-w-sm leading-relaxed">
              Your one-stop campus fest hub to find, organize, and attend college events with zero friction.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="text-bone/40 uppercase tracking-widest text-[10px]">Navigation</div>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionNav('featured')}
                  className="text-bone/80 hover:text-volt transition-colors uppercase"
                >
                  Featured Passes
                </button>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-bone/80 hover:text-volt transition-colors uppercase block"
                >
                  All Events
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionNav('countdown')}
                  className="text-bone/80 hover:text-volt transition-colors uppercase"
                >
                  Countdown
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionNav('lineup')}
                  className="text-bone/80 hover:text-volt transition-colors uppercase"
                >
                  Event Lineup
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSectionNav('sponsors')}
                  className="text-bone/80 hover:text-volt transition-colors uppercase"
                >
                  Partners
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="text-bone/40 uppercase tracking-widest text-[10px]">Organizers</div>
            <p className="text-bone/70">
              Hosting an event on campus? Get listed in minutes.
            </p>
            <div className="pt-2">
              <RegisterButton
                variant="outline"
                size="sm"
                className="inline-block px-4 py-2 uppercase font-bold text-bone/90 hover:border-volt hover:text-volt"
              >
                Submit an Event ↗
              </RegisterButton>
            </div>
          </div>
        </div>

        {/* Big Wordmark */}
        <div className="border-t border-b border-bone/15 py-10 text-center overflow-hidden">
          <span className="font-display font-black text-6xl sm:text-8xl md:text-[13vw] leading-none tracking-tight text-bone/90 uppercase block select-none">
            OFFSCRIPT
          </span>
        </div>

        {/* Bottom Bar with in-footer Back to top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-bone/40">
          <div>
            <span>© {new Date().getFullYear()} OFFSCRIPT. Built for college students.</span>
          </div>

          <button
            type="button"
            onClick={() => scrollTo(0, { duration: 0.9, easing: easeOutExpo })}
            className="flex items-center gap-2 border-2 border-bone/20 px-4 py-2 text-bone hover:border-volt hover:text-volt transition-colors uppercase font-bold"
          >
            <span>Back to top</span>
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </footer>
  )
}
