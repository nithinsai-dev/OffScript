import { type ReactNode } from 'react'

export type BadgeVariant = 'volt' | 'bone' | 'outline' | 'critical'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  rotate?: boolean | number
  className?: string
}

export function Badge({
  children,
  variant = 'bone',
  rotate = false,
  className = '',
}: BadgeProps) {
  const variantStyles = {
    volt: 'bg-volt text-ink font-bold border border-ink shadow-[2px_2px_0px_#111210]',
    bone: 'bg-bone/10 text-bone border border-bone/30',
    outline: 'bg-transparent text-bone/90 border border-bone/40',
    critical: 'bg-ink text-volt border border-volt font-bold tracking-wider shadow-[2px_2px_0px_#D4FF3F]',
  }[variant]

  const rotationStyle =
    typeof rotate === 'number'
      ? { transform: `rotate(${rotate}deg)` }
      : rotate
        ? { transform: 'rotate(-2deg)' }
        : undefined

  return (
    <span
      style={rotationStyle}
      className={`inline-flex items-center px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider rounded-[2px] border select-none ${variantStyles} ${className}`}
    >
      {children}
    </span>
  )
}
