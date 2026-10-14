import { useState, useRef, useCallback } from 'react'

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*'

export function useTextScramble(originalText: string) {
  const [displayText, setDisplayText] = useState(originalText)
  const isScramblingRef = useRef(false)
  const intervalRef = useRef<number | null>(null)

  const scramble = useCallback(
    (durationMs = 300) => {
      if (isScramblingRef.current) return
      isScramblingRef.current = true

      const startTime = performance.now()
      const length = originalText.length

      if (intervalRef.current) clearInterval(intervalRef.current)

      intervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(1, elapsed / durationMs)
        const revealIndex = Math.floor(progress * length)

        const scrambled = originalText
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < revealIndex) return originalText[index]
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join('')

        setDisplayText(scrambled)

        if (progress >= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setDisplayText(originalText)
          isScramblingRef.current = false
        }
      }, 35)
    },
    [originalText]
  )

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setDisplayText(originalText)
    isScramblingRef.current = false
  }, [originalText])

  return { displayText, scramble, reset }
}
