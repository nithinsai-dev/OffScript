import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type ReactNode,
  type MouseEvent,
} from 'react'
import { useMagnetic } from '@/hooks/useMagnetic'
import { useCursor } from '@/hooks/useCursor'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  magnetic?: boolean
  cursorLabel?: string
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  children: ReactNode
}

export type ButtonProps = BaseButtonProps &
  (
    | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
    | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
  )

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      magnetic = false,
      cursorLabel,
      icon,
      iconRight,
      fullWidth = false,
      children,
      className = '',
      ...props
    },
    forwardedRef
  ) => {
    const { setCursor, resetCursor } = useCursor()
    const prefersReduced = usePrefersReducedMotion()
    const magneticHook = useMagnetic(0.2)
    const [ripple, setRipple] = useState<{ x: number; y: number; active: boolean }>({
      x: 0,
      y: 0,
      active: false,
    })

    const sizeStyles = {
      sm: 'px-4 py-2 text-xs font-mono tracking-wider',
      md: 'px-6 py-3 text-xs sm:text-sm font-mono tracking-wider',
      lg: 'px-8 py-4 text-sm sm:text-base font-mono tracking-wider font-bold',
    }[size]

    const handleMouseEnter = () => {
      if (cursorLabel) {
        setCursor('button', cursorLabel)
      } else {
        setCursor('button', variant === 'primary' ? 'Go' : '')
      }
    }

    const handleMouseLeave = () => {
      resetCursor()
      setRipple({ x: 0, y: 0, active: false })
    }

    const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      })
      setTimeout(() => setRipple((prev) => ({ ...prev, active: false })), 400)
    }

    // Ripple feedback
    const rippleElement = ripple.active && !prefersReduced ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-bone/40 animate-ping rounded-none"
        style={{
          top: ripple.y,
          left: ripple.x,
          width: 32,
          height: 32,
        }}
      />
    ) : null

    // 1. PRIMARY VARIANT (Rectangular ticket pass button with chamfered corner & hard shadow collapse)
    if (variant === 'primary') {
      const primaryContent = (
        <span className="relative flex items-center justify-center gap-2 overflow-hidden">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="relative inline-block overflow-hidden h-[1.3em]">
            <span
              className={`block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                prefersReduced ? '' : 'group-hover:-translate-y-full'
              }`}
            >
              {children}
            </span>
            {!prefersReduced && (
              <span
                aria-hidden="true"
                className="absolute top-full left-0 block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full"
              >
                {children}
              </span>
            )}
          </span>
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </span>
      )

      const primaryClass = `
        group relative inline-flex items-center justify-center clip-chamfer-btn border-2 border-ink bg-volt text-ink font-bold uppercase
        transition-all duration-150 ease-out select-none overflow-hidden
        shadow-hard-bone hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
        active:translate-x-[3px] active:translate-y-[3px] active:scale-[0.98]
        focus-visible:ring-2 focus-visible:ring-volt focus-visible:outline-none
        ${fullWidth ? 'w-full' : ''}
        ${sizeStyles}
        ${className}
      `.trim()

      if ('href' in props && props.href) {
        const { href, ...restAnchor } = props as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
        return (
          <a
            ref={forwardedRef as React.Ref<HTMLAnchorElement>}
            href={href}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={primaryClass}
            style={
              magnetic && !prefersReduced
                ? { transform: `translate3d(${magneticHook.offset.x}px, ${magneticHook.offset.y}px, 0)` }
                : undefined
            }
            {...restAnchor}
          >
            {rippleElement}
            {primaryContent}
          </a>
        )
      }

      const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>
      return (
        <button
          ref={(node) => {
            if (typeof forwardedRef === 'function') forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
            if (magnetic) (magneticHook.ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className={primaryClass}
          style={
            magnetic && !prefersReduced
              ? { transform: `translate3d(${magneticHook.offset.x}px, ${magneticHook.offset.y}px, 0)` }
              : undefined
          }
          {...buttonProps}
        >
          {rippleElement}
          {primaryContent}
        </button>
      )
    }

    // 2. SECONDARY VARIANT (Rectangular chamfered border with sweeping Volt fill)
    if (variant === 'secondary') {
      const secondaryClass = `
        group relative inline-flex items-center justify-center clip-chamfer-btn overflow-hidden border-2 border-bone/30 bg-transparent text-bone font-bold uppercase
        transition-colors duration-300 ease-out select-none hover:text-ink hover:border-volt
        active:scale-[0.98]
        focus-visible:ring-2 focus-visible:ring-volt focus-visible:outline-none
        ${fullWidth ? 'w-full' : ''}
        ${sizeStyles}
        ${className}
      `.trim()

      const inner = (
        <>
          {rippleElement}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-volt translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
          <span className="relative z-10 flex items-center justify-center gap-2">
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
            {iconRight && <span className="shrink-0">{iconRight}</span>}
          </span>
        </>
      )

      if ('href' in props && props.href) {
        const { href, ...restAnchor } = props as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
        return (
          <a
            ref={forwardedRef as React.Ref<HTMLAnchorElement>}
            href={href}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={secondaryClass}
            {...restAnchor}
          >
            {inner}
          </a>
        )
      }

      return (
        <button
          ref={forwardedRef as React.Ref<HTMLButtonElement>}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={secondaryClass}
          {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {inner}
        </button>
      )
    }

    // 3. GHOST / LINK VARIANT (Underline draw plus arrow shift)
    const ghostClass = `
      group relative inline-flex items-center gap-2 bg-transparent text-bone font-mono uppercase tracking-wider
      transition-colors duration-200 select-none hover:text-volt
      focus-visible:ring-2 focus-visible:ring-volt focus-visible:outline-none
      ${sizeStyles}
      ${className}
    `.trim()

    const ghostInner = (
      <>
        {rippleElement}
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="relative inline-block py-0.5">
          {children}
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-volt transition-all duration-200 ease-out group-hover:w-full"
          />
        </span>
        {iconRight ? (
          <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">
            {iconRight}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="font-mono text-volt transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        )}
      </>
    )

    if ('href' in props && props.href) {
      const { href, ...restAnchor } = props as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
      return (
        <a
          ref={forwardedRef as React.Ref<HTMLAnchorElement>}
          href={href}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={ghostClass}
          {...restAnchor}
        >
          {ghostInner}
        </a>
      )
    }

    return (
      <button
        ref={forwardedRef as React.Ref<HTMLButtonElement>}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={ghostClass}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {ghostInner}
      </button>
    )
  }
)

Button.displayName = 'Button'
