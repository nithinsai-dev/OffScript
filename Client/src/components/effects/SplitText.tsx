import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface SplitTextProps {
  text: string
  className?: string
  charClassName?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p' | 'div'
  delay?: number
  stagger?: number
  by?: 'chars' | 'words'
}

export function SplitText({
  text,
  className = '',
  charClassName = '',
  tag = 'h1',
  delay = 0,
  stagger = 0.025,
  by = 'chars',
}: SplitTextProps) {
  const prefersReduced = usePrefersReducedMotion()
  const Tag = tag

  if (prefersReduced) {
    return <Tag className={className}>{text}</Tag>
  }

  if (by === 'words') {
    const words = text.split(' ')

    return (
      <Tag className={`inline-flex flex-wrap ${className}`}>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
            <motion.span
              className={`inline-block ${charClassName}`}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
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

  // Split by characters
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
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
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
