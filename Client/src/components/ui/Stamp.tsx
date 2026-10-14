import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface StampProps {
  children: string
  variant?: 'volt' | 'bone'
  className?: string
  rotate?: number
}

export function Stamp({
  children,
  variant = 'volt',
  className = '',
  rotate = -3,
}: StampProps) {
  const prefersReduced = usePrefersReducedMotion()

  return (
    <motion.span
      initial={prefersReduced ? { opacity: 0 } : { scale: 1.8, opacity: 0, rotate: rotate - 8 }}
      whileInView={
        prefersReduced
          ? { opacity: 1 }
          : {
              scale: [1.8, 0.92, 1.05, 1],
              opacity: 1,
              rotate: [rotate - 8, rotate + 2, rotate - 1, rotate],
            }
      }
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        duration: 0.5,
        ease: [0.175, 0.885, 0.32, 1.275],
      }}
      className={`inline-flex items-center justify-center font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest px-2.5 py-1 select-none ${
        variant === 'volt'
          ? 'border-2 border-dashed border-volt text-volt bg-ink/90 shadow-[2px_2px_0px_#D4FF3F]'
          : 'border-2 border-dashed border-bone/70 text-bone bg-ink/90 shadow-[2px_2px_0px_rgba(237,235,224,0.4)]'
      } ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {children}
    </motion.span>
  )
}
