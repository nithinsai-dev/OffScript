import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  getRegistrationNoticeState,
  openRegistrationNotice,
  closeRegistrationNotice,
  subscribeRegistrationNotice,
  REGISTRATION_COPY,
  type RegistrationNoticePayload,
} from '@/lib/registration'
import { MOTION } from '@/lib/motion'

export function RegistrationNotice() {
  const [state, setState] = useState<RegistrationNoticePayload>(getRegistrationNoticeState)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const navigate = useNavigate()

  const dialogRef = useRef<HTMLDivElement | null>(null)
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null)

  // Subscribe to open/close requests from the registration store
  useEffect(() => {
    return subscribeRegistrationNotice((nextState) => {
      setState(nextState)
    })
  }, [])

  // Process any pending register click that occurred in the static shell before React mounted
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __registerPending?: boolean }).__registerPending) {
      ;(window as unknown as { __registerPending?: boolean }).__registerPending = false
      const shellMsg = document.getElementById('static-shell-reg-msg')
      if (shellMsg) shellMsg.remove()
      openRegistrationNotice()
    }
  }, [])

  // Auto-close and unlock on route transition
  const prevPathnameRef = useRef(pathname)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      if (state.isOpen) {
        closeRegistrationNotice()
      }
    }
  }, [pathname, state.isOpen])

  // Body scroll lock management with failsafe cleanup
  useEffect(() => {
    if (state.isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow || ''
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [state.isOpen])

  // Focus management: move focus into dialog on open & trap focus
  useEffect(() => {
    if (!state.isOpen) return

    const timer = setTimeout(() => {
      if (firstFocusableRef.current) {
        firstFocusableRef.current.focus()
      } else if (dialogRef.current) {
        dialogRef.current.focus()
      }
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRegistrationNotice()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.isOpen])

  const handleBrowseEvents = useCallback(() => {
    closeRegistrationNotice()
    navigate({ to: '/events' })
  }, [navigate])

  if (!state.isOpen) return null
  if (typeof document === 'undefined') return null

  const isOnEventsPage = pathname === '/events'
  const isLite =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-perf') === 'lite'
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const durationBackdrop = isLite || prefersReduced
    ? MOTION.registrationDialog.reducedFade
    : MOTION.registrationDialog.backdropFade
  const durationDialog = isLite || prefersReduced
    ? MOTION.registrationDialog.reducedFade
    : MOTION.registrationDialog.dialogRise

  const modalContent = (
    <div
      id="registration-notice-portal"
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col justify-end sm:justify-center sm:items-center"
      style={{ isolation: 'isolate' }}
    >
      {/* 1. Backdrop */}
      <div
        onClick={closeRegistrationNotice}
        aria-hidden="true"
        className="fixed inset-0 bg-ink/80 backdrop-blur-sm transition-opacity cursor-pointer"
        style={{
          animation: `noticeBackdropFade ${durationBackdrop}s ease-out forwards`,
        }}
      />

      {/* 2. Dialog Container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-notice-title"
        aria-describedby="reg-notice-desc"
        tabIndex={-1}
        className="relative z-10 w-full sm:max-w-[420px] bg-ink text-bone focus:outline-none shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6"
        style={{
          animation: isLite || prefersReduced
            ? `noticeSimpleFade ${durationDialog}s ease-out forwards`
            : `noticeDialogRise ${durationDialog}s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        {/* Ticket notch border SVG container */}
        <div className="relative border-2 border-volt bg-ink p-6 sm:p-7 space-y-5">
          {/* Top Inward Notch Left & Right */}
          <span
            aria-hidden="true"
            className="absolute -top-3 left-8 w-6 h-3 bg-ink border-b-2 border-volt rounded-b-full pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute -top-3 right-8 w-6 h-3 bg-ink border-b-2 border-volt rounded-b-full pointer-events-none"
          />

          {/* Side Ticket Notches */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 -left-3 -translate-y-1/2 w-3 h-6 bg-ink border-r-2 border-volt rounded-r-full pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-3 h-6 bg-ink border-l-2 border-volt rounded-l-full pointer-events-none"
          />

          {/* Header row */}
          <div className="flex items-center justify-between border-b border-bone/15 pb-3">
            <span className="font-mono text-[11px] text-volt uppercase font-bold tracking-widest block">
              // {REGISTRATION_COPY.eyebrow}
            </span>
            <button
              type="button"
              onClick={closeRegistrationNotice}
              aria-label="Close dialog"
              className="text-bone/50 hover:text-volt p-1 font-mono text-xs uppercase font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-volt"
            >
              [ESC]
            </button>
          </div>

          {/* Heading & Body */}
          <div className="space-y-3">
            <h2
              id="reg-notice-title"
              className="font-display font-black text-2xl sm:text-3xl text-bone uppercase tracking-tight leading-tight"
            >
              {REGISTRATION_COPY.heading}
            </h2>

            <div id="reg-notice-desc" className="space-y-2 text-bone/75 font-sans text-sm sm:text-base leading-relaxed">
              <p>{REGISTRATION_COPY.body}</p>
              {state.eventName && (
                <p className="font-bold text-volt font-mono text-xs sm:text-sm pt-1">
                  {REGISTRATION_COPY.eventSubtext(state.eventName)}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-bone/15">
            {!isOnEventsPage && (
              <button
                type="button"
                onClick={handleBrowseEvents}
                className="w-full sm:w-auto px-5 py-2.5 bg-volt text-ink font-mono text-xs uppercase font-black tracking-wider hover:bg-bone transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone text-center"
              >
                {REGISTRATION_COPY.browseButton}
              </button>
            )}

            <button
              ref={firstFocusableRef}
              type="button"
              onClick={closeRegistrationNotice}
              className="w-full sm:w-auto px-5 py-2.5 border-2 border-bone/30 text-bone hover:border-volt hover:text-volt font-mono text-xs uppercase font-black tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt text-center"
            >
              {REGISTRATION_COPY.gotItButton}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes noticeBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes noticeSimpleFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes noticeDialogRise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )

  return createPortal(modalContent, document.body)
}
export default RegistrationNotice
