import { useEffect } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { usePageRevealed, logAnimationStart } from '@/lib/pageReady'

interface SplitTextProps {
  text: string
  className?: string
  charClassName?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p' | 'div'
  delay?: number
  stagger?: number
  by?: 'chars' | 'words'
  isHeroTitle?: boolean
}

export function SplitText({
  text,
  className = '',
  charClassName = '',
  tag = 'h1',
  delay = 0,
  stagger = 0.025,
  by = 'chars',
  isHeroTitle = false,
}: SplitTextProps) {
  const prefersReduced = usePrefersReducedMotion()
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'
  const isRevealed = usePageRevealed()
  const Tag = tag

  useEffect(() => {
    if (isHeroTitle && isRevealed) {
      logAnimationStart('Landing Hero Title')
    }
  }, [isHeroTitle, isRevealed])

  if (prefersReduced || isLite) {
    return <Tag className={className}>{text}</Tag>
  }

  // PART 2 & PART 8.1: Hero title starts in transform-only pose and animates when revealed
  if (isHeroTitle) {
    const words = text.split(' ')
    let globalCharIndex = 0

    return (
      <Tag className={`inline-flex flex-wrap ${className}`}>
        {words.map((word, wordIdx) => (
          <span key={wordIdx} className="inline-flex whitespace-nowrap mr-[0.28em] last:mr-0">
            {Array.from(word).map((char, charIdx) => {
              const charIndex = globalCharIndex++
              return (
                <span key={charIdx} className="inline-block overflow-hidden">
                  <span
                    className={`hero-title-char ${isRevealed ? 'hero-title-char-animate' : 'hero-title-char-pending'} ${charClassName}`}
                    style={
                      {
                        '--char-index': charIndex,
                      } as React.CSSProperties
                    }
                  >
                    {char}
                  </span>
                </span>
              )
            })}
          </span>
        ))}
      </Tag>
    )
  }

  if (by === 'words') {
    const words = text.split(' ')

    return (
      <Tag className={`inline-flex flex-wrap ${className}`}>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
            <motion.span
              className={`inline-block ${charClassName}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
                delay: delay + i * stagger,
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </Tag>
    )
  }

  // Split by characters (motion fallback)
  const words = text.split(' ')

  return (
    <Tag className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-flex whitespace-nowrap mr-[0.28em] last:mr-0">
          {Array.from(word).map((char, charIdx) => {
            const index = wordIdx * 10 + charIdx
            return (
              <span key={charIdx} className="inline-block overflow-hidden">
                <motion.span
                  className={`inline-block ${charClassName}`}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                    delay: delay + index * stagger,
                  }}
                >
                  {char}
                </motion.span>
              </span>
            )
          })}
        </span>
      ))}
    </Tag>
  )
}
