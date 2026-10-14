import { useState, useEffect } from 'react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

const ROTATING_PHRASES = [
  'find your event',
  'bring your friends',
  'skip the boring',
]

export function HeroTagline() {
  const prefersReduced = usePrefersReducedMotion()
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (prefersReduced) return

    const currentPhrase = ROTATING_PHRASES[phraseIndex]
    const typingSpeed = isDeleting ? 40 : 80
    const pauseDelay = isDeleting ? 250 : 1800

    if (!isDeleting && displayText === currentPhrase) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseDelay)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && displayText === '') {
      const timeout = setTimeout(() => {
        setIsDeleting(false)
        setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length)
      }, 200)
      return () => clearTimeout(timeout)
    }

    const timeout = setTimeout(() => {
      setDisplayText((prev) =>
        isDeleting
          ? currentPhrase.substring(0, prev.length - 1)
          : currentPhrase.substring(0, prev.length + 1)
      )
    }, typingSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, phraseIndex, prefersReduced])

  const activeText = prefersReduced ? ROTATING_PHRASES[0] : displayText

  return (
    <div className="space-y-3">
      {/* Huge Outlined #beoffscript Typographic Headline */}
      <div className="flex items-center text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight select-none">
        <span className="text-volt pr-1 select-none">#</span>
        <span className="stroke-text font-black hover:text-bone transition-colors duration-300">
          beoffscript
        </span>
      </div>

      {/* Typing Rotating Phrase with Blinking Block Caret */}
      <div className="flex items-center font-mono text-sm sm:text-base md:text-lg text-bone/70 uppercase tracking-widest h-7">
        <span className="text-volt font-bold pr-2">&gt;</span>
        <span>{activeText}</span>
        {!prefersReduced && (
          <span className="inline-block w-2.5 h-4 ml-1 bg-volt animate-pulse" />
        )}
      </div>
    </div>
  )
}
