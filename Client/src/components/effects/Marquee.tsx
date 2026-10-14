import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface MarqueeProps {
  items?: string[]
  text?: string
  repeat?: number
  speedSeconds?: number
  reverse?: boolean
  className?: string
  itemClassName?: string
}

export function Marquee({
  items,
  text = 'OFFSCRIPT // #BEOFFSCRIPT // THE UNCONVENTIONAL EVENT DISCOVERY PLATFORM // REBEL AGAINST THE STATUS QUO //',
  repeat = 4,
  speedSeconds = 24,
  reverse = false,
  className = '',
  itemClassName = '',
}: MarqueeProps) {
  const prefersReduced = usePrefersReducedMotion()

  const content = items && items.length > 0 ? items : [text]
  const repeatedContent = Array.from({ length: repeat }).flatMap(() => content)

  return (
    <div
      className={`group relative flex w-full overflow-hidden border-y border-bone/15 bg-ink/90 py-3 select-none ${className}`}
      aria-hidden="true"
    >
      <div
        className={`flex shrink-0 items-center gap-8 ${
          reverse ? 'flex-row-reverse' : ''
        } ${
          prefersReduced
            ? ''
            : 'animate-marquee group-hover:[animation-play-state:paused]'
        }`}
        style={{
          animationDuration: `${speedSeconds}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {repeatedContent.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-8 font-mono text-xs md:text-sm uppercase tracking-widest text-bone/70 ${itemClassName}`}
          >
            <span>{item}</span>
            <span className="h-1.5 w-1.5 bg-volt inline-block" />
          </div>
        ))}
      </div>

      <div
        className={`flex shrink-0 items-center gap-8 ${
          reverse ? 'flex-row-reverse' : ''
        } ${
          prefersReduced
            ? ''
            : 'animate-marquee group-hover:[animation-play-state:paused]'
        }`}
        style={{
          animationDuration: `${speedSeconds}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
        aria-hidden="true"
      >
        {repeatedContent.map((item, index) => (
          <div
            key={`dup-${index}`}
            className={`flex items-center gap-8 font-mono text-xs md:text-sm uppercase tracking-widest text-bone/70 ${itemClassName}`}
          >
            <span>{item}</span>
            <span className="h-1.5 w-1.5 bg-volt inline-block" />
          </div>
        ))}
      </div>
    </div>
  )
}
