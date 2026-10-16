import { useState, useEffect, useRef } from 'react'
import { Link, useRouterState, useNavigate, useRouter } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { RegisterButton } from '@/components/ui/RegisterButton'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'
import { useTextScramble } from '@/hooks/useTextScramble'

const NAV_LINKS = [
  { label: 'Featured', id: 'featured' },
  { label: 'Countdown', id: 'countdown' },
  { label: 'Events', id: 'events', isRoute: true },
  { label: 'Sponsors', id: 'sponsors' },
  { label: 'Lineup', id: 'lineup' },
]

function NavLinkItem({
  label,
  id,
  isRoute,
  isActive,
  onClick,
  onPrefetch,
}: {
  label: string
  id: string
  isRoute?: boolean
  isActive: boolean
  onClick: (id: string) => void
  onPrefetch?: () => void
}) {
  const { displayText, scramble, reset } = useTextScramble(label)

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      onMouseEnter={() => {
        scramble(280)
        if (isRoute) onPrefetch?.()
      }}
      onFocus={() => {
        if (isRoute) onPrefetch?.()
      }}
      onMouseLeave={reset}
      className={`relative px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt ${
        isActive ? 'text-ink font-black' : 'text-bone/70 hover:text-bone'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="navbar-active-indicator"
          className="absolute inset-0 bg-volt z-0"
          style={{
            clipPath:
              'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative z-10">{displayText}</span>
    </button>
  )
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('featured')
  const { progress, isNavHidden, scrollY } = useScrollProgress()
  const { scrollTo, getLenis } = useLenis()
  const routerState = useRouterState()
  const navigate = useNavigate()
  const router = useRouter()

  const isLandingPage = routerState.location.pathname === '/'
  const isEventsPage = routerState.location.pathname === '/events'

  const isLockedRef = useRef(false)
  const lockTimerRef = useRef<number | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [routerState.location.pathname])

  // Lock scroll while mobile menu is open, ALWAYS unlock after
  useEffect(() => {
    const lenis = getLenis()
    if (mobileMenuOpen) {
      lenis?.stop()
      document.body.style.overflow = 'hidden'
    } else {
      lenis?.start()
      document.body.style.overflow = ''
    }

    return () => {
      lenis?.start()
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen, getLenis])

  // Escape key closes mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  // Focus trap inside mobile menu drawer
  useEffect(() => {
    if (!mobileMenuOpen) return
    const container = mobileMenuRef.current
    if (!container) return

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )
    if (focusable.length > 0) {
      focusable[0].focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const currentFocusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (currentFocusable.length === 0) return

      const firstEl = currentFocusable[0]
      const lastEl = currentFocusable[currentFocusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTabKey)
    return () => window.removeEventListener('keydown', handleTabKey)
  }, [mobileMenuOpen])

  const handlePrefetchEvents = () => {
    router.preloadRoute({ to: '/events' })
  }

  // Active section detection via scroll position (Landing page only, IGNORES Events link)
  useEffect(() => {
    if (!isLandingPage) return

    let rafId: number | null = null

    const updateActiveSection = () => {
      if (isLockedRef.current) return

      const triggerLine = window.innerHeight * 0.4
      // Ignore Events in active-section detection on landing page as required
      const sectionIds = NAV_LINKS.filter((l) => l.id !== 'events').map((link) => link.id)

      let currentActive = ''

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= triggerLine && rect.bottom > triggerLine) {
          currentActive = id
          break
        }
      }

      // Fallback for bottom of page
      if (!currentActive && window.scrollY > 300) {
        for (let i = sectionIds.length - 1; i >= 0; i--) {
          const el = document.getElementById(sectionIds[i])
          if (el && el.getBoundingClientRect().top <= triggerLine) {
            currentActive = sectionIds[i]
            break
          }
        }
      }

      if (currentActive && currentActive !== activeSection) {
        setActiveSection(currentActive)
      }
    }

    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        updateActiveSection()
        rafId = null
      })
    }

    const lenis = getLenis()
    if (lenis) {
      lenis.on('scroll', onScroll)
    } else {
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Initial check
    setTimeout(updateActiveSection, 150)

    return () => {
      if (lenis) lenis.off('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  }, [isLandingPage, getLenis, activeSection])

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false)

    if (id === 'events') {
      navigate({ to: '/events' })
      return
    }

    setActiveSection(id)

    // Lock detection until the Lenis scrollTo finishes
    isLockedRef.current = true
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)

    const unlock = () => {
      isLockedRef.current = false
    }

    lockTimerRef.current = window.setTimeout(unlock, 950)

    if (isLandingPage) {
      scrollTo(`#${id}`, {
        offset: -96,
        duration: 0.9,
        easing: easeOutExpo,
        onComplete: unlock,
      })
    } else {
      // When navigating from /events or elsewhere, navigate to "/" and scroll after route settles
      navigate({ to: '/', hash: id })
    }
  }

  // Navbar stays visible when near top (< 120px)
  const shouldHide = isNavHidden && scrollY > 120

  return (
    <>
      {/* Skip to Content Accessibility Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10001] focus:bg-volt focus:text-ink focus:px-4 focus:py-2 focus:font-mono focus:font-bold border border-ink"
      >
        Skip to main content
      </a>

      {/* Full-width fixed wrapper for rock-solid flex centering (zero transform horizontal dependency) */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-2 sm:px-4">
        <header
          role="banner"
          className={`pointer-events-auto w-full max-w-[880px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            shouldHide ? '-translate-y-28 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
        {/* Solid Ink background (~90% opacity) so page content never shows through and clashes */}
        <div className="relative bg-[#111210]/92 backdrop-blur-md clip-chamfer border-2 border-bone/20 px-2.5 py-1.5 sm:px-5 sm:py-2.5 shadow-2xl">
          <nav
            aria-label="Main Navigation"
            className="flex items-center justify-between gap-1.5 sm:gap-4"
          >
            {/* Wordmark (Left) */}
            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt px-1 py-0.5 group shrink-0"
            >
              <span className="w-2 h-2 bg-volt shrink-0 rotate-45" />
              <span className="font-display text-lg sm:text-2xl font-black text-bone tracking-tight uppercase group-hover:text-volt transition-colors">
                OFFSCRIPT
              </span>
            </Link>

            {/* Centered Links with Animated Active Indicator (Desktop) */}
            <div className="hidden md:flex items-center gap-1 relative bg-bone/[0.04] p-1 border border-bone/15">
              {NAV_LINKS.map((link) => {
                const isActive = isEventsPage
                  ? link.id === 'events'
                  : isLandingPage && activeSection === link.id && link.id !== 'events'

                return (
                  <NavLinkItem
                    key={link.id}
                    label={link.label}
                    id={link.id}
                    isRoute={link.isRoute}
                    isActive={isActive}
                    onClick={handleLinkClick}
                    onPrefetch={handlePrefetchEvents}
                  />
                )
              })}
            </div>

            {/* Right Side: Chamfered Register Button + Mobile Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <RegisterButton
                variant="compact"
                cursorLabel="Register"
                className="shadow-none px-2.5 py-1 text-[11px] sm:px-3.5 sm:py-1.5 sm:text-xs font-bold font-mono tracking-wider"
              >
                Register
              </RegisterButton>

              {/* Mobile Hamburger Toggle (At least 44x44px tap target) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                className="md:hidden flex flex-col items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] border border-bone/30 text-bone hover:border-volt hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt select-none"
              >
                <span
                  className={`block h-0.5 w-4 bg-current transition-transform duration-200 ${
                    mobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'
                  }`}
                />
                <span
                  className={`block h-0.5 w-4 bg-current transition-transform duration-200 ${
                    mobileMenuOpen ? '-rotate-45 -translate-y-0.5' : 'translate-y-1'
                  }`}
                />
              </button>
            </div>
          </nav>

          {/* Thin Volt Scroll-Progress Line Along Bottom Edge */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-bone/10 overflow-hidden"
          >
            <div
              className="h-full bg-volt origin-left transition-transform duration-75 ease-out"
              style={{
                transform: `scaleX(${progress})`,
              }}
            />
          </div>
        </div>
      </header>
    </div>

      {/* Full-Screen Mobile Menu with Clip-Path Reveal */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            initial={{ opacity: 0, clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            animate={{ opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            exit={{ opacity: 0, clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-ink/98 flex flex-col justify-between p-6 sm:p-8 pt-24 md:hidden overflow-y-auto"
          >
            <div className="space-y-6">
              <span className="font-mono text-xs uppercase tracking-widest text-volt block">
                CAMPUS NAVIGATION
              </span>

              <div className="flex flex-col space-y-3">
                {NAV_LINKS.map((link, idx) => (
                  <motion.button
                    key={link.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx, duration: 0.25 }}
                    type="button"
                    onClick={() => handleLinkClick(link.id)}
                    className="text-left font-display text-2xl sm:text-3xl font-black uppercase text-bone hover:text-volt transition-colors py-3 min-h-[48px] border-b border-bone/10 flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <span className="font-mono text-xs text-bone/40">0{idx + 1}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-bone/15">
              <RegisterButton
                variant="chamfered"
                size="lg"
                fullWidth
                onClick={() => setMobileMenuOpen(false)}
              >
                Register For Fest
              </RegisterButton>
              <div className="text-center font-mono text-[11px] text-bone/40">
                #beoffscript
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
