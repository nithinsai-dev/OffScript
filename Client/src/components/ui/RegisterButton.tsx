import React, { useCallback } from 'react'
import {
  getRegistrationUrl,
  openRegistrationNotice,
  REGISTRATION_COPY,
} from '@/lib/registration'
import { useCursor } from '@/hooks/useCursor'

export interface RegisterButtonEvent {
  id?: string
  name?: string
  registration_status?: string
  total_seats?: number
  seats_filled?: number
}

export interface RegisterButtonProps {
  event?: RegisterButtonEvent | null
  variant?: 'chamfered' | 'outline' | 'compact' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  cursorLabel?: string
  disabled?: boolean
}

export const RegisterButton = React.forwardRef<HTMLElement, RegisterButtonProps>(
  (
    {
      event,
      variant = 'chamfered',
      size = 'md',
      fullWidth = false,
      className = '',
      children,
      onClick,
      cursorLabel = 'Register',
      disabled = false,
    },
    ref
  ) => {
    const { setCursor, resetCursor } = useCursor()

    // 1. Check if event is closed / sold out
    const isEventClosed = Boolean(
      event &&
        (event.registration_status !== 'OPEN' ||
          (event.total_seats != null &&
            event.seats_filled != null &&
            event.seats_filled >= event.total_seats))
    )

    const isDisabled = disabled || isEventClosed

    // 2. Resolve configured external registration URL
    const regUrl = isEventClosed ? null : getRegistrationUrl(event)

    const handlePointerEnter = useCallback(() => {
      if (isDisabled) return
      setCursor('button', cursorLabel)
    }, [isDisabled, setCursor, cursorLabel])

    const handlePointerLeave = useCallback(() => {
      resetCursor()
    }, [resetCursor])

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        if (isDisabled) {
          e.preventDefault()
          return
        }

        onClick?.(e)

        if (!regUrl) {
          e.preventDefault()
          openRegistrationNotice(event, e.currentTarget as HTMLElement)
        }
      },
      [isDisabled, onClick, regUrl, event]
    )

    // Sizing tokens
    const sizeClasses = {
      xs: 'text-[10px] px-2.5 py-1',
      sm: 'text-xs px-3.5 py-1.5',
      md: 'text-sm px-5 py-2.5',
      lg: 'text-base px-6 py-3.5',
    }[size]

    // Base styling
    const baseClasses =
      'inline-flex items-center justify-center font-mono uppercase font-black tracking-wider transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt'

    // Disabled styling
    if (isDisabled) {
      const disabledClasses = `
        ${baseClasses}
        ${sizeClasses}
        ${fullWidth ? 'w-full' : ''}
        bg-bone/10 text-bone/40 border border-bone/20 cursor-not-allowed opacity-60
        ${className}
      `
      const closedLabel =
        size === 'xs' || size === 'sm' || variant === 'compact'
          ? REGISTRATION_COPY.closedBadgeShort
          : REGISTRATION_COPY.closedBadge

      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          disabled
          aria-disabled="true"
          className={disabledClasses}
        >
          {closedLabel}
        </button>
      )
    }

    // Active Variant Styling
    let variantClasses = ''
    let chamferStyle: React.CSSProperties = {}

    if (variant === 'chamfered') {
      variantClasses =
        'bg-volt text-ink hover:bg-bone active:translate-x-0.5 active:translate-y-0.5'
      chamferStyle = {
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
      }
    } else if (variant === 'outline') {
      variantClasses =
        'border-2 border-volt text-volt hover:bg-volt hover:text-ink active:translate-x-0.5 active:translate-y-0.5'
    } else if (variant === 'compact') {
      variantClasses =
        'bg-volt text-ink hover:bg-bone py-1.5 px-3 text-xs'
      chamferStyle = {
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
      }
    } else if (variant === 'link') {
      variantClasses =
        'text-bone/70 hover:text-volt p-0 bg-transparent underline-offset-4 hover:underline'
    }

    const combinedClasses = `
      ${baseClasses}
      ${variant !== 'link' && variant !== 'compact' ? sizeClasses : ''}
      ${variantClasses}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim()

    const defaultContent = children || (variant === 'compact' ? 'Register' : 'Register Now')

    // If registration is configured with a valid external URL, render an anchor
    if (regUrl) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={regUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          style={chamferStyle}
          className={combinedClasses}
        >
          {defaultContent}
        </a>
      )
    }

    // If registration is NOT configured, render a button that opens the dialog
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={chamferStyle}
        className={combinedClasses}
      >
        {defaultContent}
      </button>
    )
  }
)

RegisterButton.displayName = 'RegisterButton'
