import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface RevealProps {
  children: ReactNode
  className?: string
  variant?: 'clip-up' | 'clip-right' | 'scale-snap' | 'slide-in'
  delay?: number
  duration?: number
}

export function Reveal({
  children,
  className = '',
  variant = 'clip-up',
  delay = 0,
  duration = 0.75,
}: RevealProps) {
  const prefersReduced = usePrefersReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  const variants = {
    'clip-up': {
      initial: {
        clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)',
        y: 30,
        opacity: 0,
      },
      animate: {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        y: 0,
        opacity: 1,
      },
    },
    'clip-right': {
      initial: {
        clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
        opacity: 0,
      },
      animate: {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        opacity: 1,
      },
    },
    'scale-snap': {
      initial: {
        scale: 0.94,
        opacity: 0,
        y: 20,
      },
      animate: {
        scale: 1,
        opacity: 1,
        y: 0,
      },
    },
    'slide-in': {
      initial: {
        x: -40,
        opacity: 0,
      },
      animate: {
        x: 0,
        opacity: 1,
      },
    },
  }

  const selected = variants[variant]

  return (
    <motion.div
      className={className}
      initial={selected.initial}
      whileInView={selected.animate}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
