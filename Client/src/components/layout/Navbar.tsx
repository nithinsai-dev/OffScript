import { useState, useEffect, useRef } from 'react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { REGISTRATION_URL_BASE } from '@/lib/config'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'
import { useTextScramble } from '@/hooks/useTextScramble'

const NAV_LINKS = [
  { label: 'Featured', id: 'featured' },
  { label: 'Countdown', id: 'countdown' },
  { label: 'Events', id: 'events' },
  { label: 'Sponsors', id: 'sponsors' },
  { label: 'Lineup', id: 'lineup' },
]

function NavLinkItem({
  label,
  id,
  isActive,
  onClick,
}: {
  label: string
  id: string
  isActive: boolean
  onClick: (id: string) => void
}) {
  const { displayText, scramble, reset } = useTextScramble(label)

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      onMouseEnter={() => scramble(280)}
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
  const isLandingPage = routerState.location.pathname === '/'

  const isLockedRef = useRef(false)
  const lockTimerRef = useRef<number | null>(null)

  // Active section detection via scroll position (40% viewport height trigger line)
  useEffect(() => {
    if (!isLandingPage) return

    let rafId: number | null = null

    const updateActiveSection = () => {
      if (isLockedRef.current) return

      const triggerLine = window.innerHeight * 0.4
      const sectionIds = NAV_LINKS.map((link) => link.id)

      let currentActive = ''

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        // If the 40% viewport line is inside the section
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

      {/* Floating Centered Chamfered Bar Navbar (NOT a pill) */}
      <header
        role="banner"
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[900px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          shouldHide ? '-translate-y-28 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="relative glass-panel clip-chamfer border-2 border-bone/20 px-3 py-2 sm:px-5 sm:py-2.5 shadow-2xl">
          <nav
            aria-label="Main Navigation"
            className="flex items-center justify-between gap-2 sm:gap-4"
          >
            {/* Wordmark (Left) */}
            <Link
              to="/"
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt px-1 py-0.5 group shrink-0"
            >
              <span className="w-2 h-2 bg-volt shrink-0 rotate-45" />
              <span className="font-display text-xl sm:text-2xl font-black text-bone tracking-tight uppercase group-hover:text-volt transition-colors">
                OFFSCRIPT
              </span>
            </Link>

            {/* Centered Links with Animated Active Indicator (Desktop) */}
            <div className="hidden md:flex items-center gap-1 relative bg-bone/[0.04] p-1 border border-bone/15">
              {NAV_LINKS.map((link) => (
                <NavLinkItem
                  key={link.id}
                  label={link.label}
                  id={link.id}
                  isActive={activeSection === link.id && isLandingPage}
                  onClick={handleLinkClick}
                />
              ))}
            </div>

            {/* Right Side: Chamfered Register Button + Mobile Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button
                variant="primary"
                size="sm"
                href={REGISTRATION_URL_BASE}
                target="_blank"
                rel="noreferrer"
                cursorLabel="Register"
                className="shadow-none px-3.5 py-1.5 text-xs font-bold font-mono tracking-wider"
              >
                Register
              </Button>

              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                className="md:hidden flex flex-col items-center justify-center w-8 h-8 border border-bone/30 text-bone hover:border-volt hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
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

      {/* Full-Screen Mobile Menu with Clip-Path Reveal */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            animate={{ opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            exit={{ opacity: 0, clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-ink/98 flex flex-col justify-between p-8 pt-28 md:hidden"
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
                    className="text-left font-display text-2xl sm:text-3xl font-black uppercase text-bone hover:text-volt transition-colors py-2 border-b border-bone/10 flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <span className="font-mono text-xs text-bone/40">0{idx + 1}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-bone/15">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                href={REGISTRATION_URL_BASE}
                target="_blank"
                rel="noreferrer"
              >
                Register For Fest
              </Button>
              <div className="text-center font-mono text-[11px] text-bone/40">
                #beoffscript // FEST PASS
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
