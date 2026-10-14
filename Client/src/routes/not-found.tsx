import { Button } from '@/components/ui/Button'

export function NotFoundComponent() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-24 text-center select-none">
      <div className="relative border-2 border-bone/25 bg-bone/[0.02] p-8 sm:p-14 shadow-hard-bone max-w-lg w-full space-y-6">
        <div className="flex items-center justify-between border-b border-bone/15 pb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-volt font-black">
            PASS // 404
          </span>
          <span className="font-mono text-xs text-bone/40">OFFSCRIPT</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-bone tracking-tight">
            Pass Not Found
          </h1>
          <p className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed max-w-sm mx-auto">
            We couldn&apos;t find that event pass. It might have ended, been rescheduled, or the link is incorrect.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" href="/" cursorLabel="Home">
            Back to Home
          </Button>
          <Button variant="secondary" href="/#events">
            Explore All Passes
          </Button>
        </div>

        {/* Semicircle notches */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-ink border-2 border-bone/25 rounded-full" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-ink border-2 border-bone/25 rounded-full" />
      </div>
    </div>
  )
}
