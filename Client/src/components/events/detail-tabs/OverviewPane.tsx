import { useMemo } from 'react'

interface OverviewPaneProps {
  description?: string
  blurb?: string
}

export function OverviewPane({ description, blurb }: OverviewPaneProps) {
  const paragraphs = useMemo(() => {
    if (!description) return []
    return description
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean)
  }, [description])

  return (
    <div className="space-y-6 font-sans text-sm sm:text-base text-bone/85 leading-relaxed">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          ABOUT THIS PASS
        </span>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Event Overview
        </h3>
      </div>

      {paragraphs.length > 0 ? (
        paragraphs.map((para, idx) => (
          <p key={idx} className="leading-relaxed text-bone/80">
            {para}
          </p>
        ))
      ) : (
        <p className="leading-relaxed text-bone/80">
          {blurb || 'Complete pass guidelines and schedule details will be provided during registration.'}
        </p>
      )}
    </div>
  )
}
export default OverviewPane
