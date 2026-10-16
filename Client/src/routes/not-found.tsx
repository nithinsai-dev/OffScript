import { Button } from '@/components/ui/Button'
import { TicketShape } from '@/components/ui/TicketShape'

export function NotFoundComponent() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-24 text-center select-none">
      <TicketShape
        id="pass-not-found"
        hasPerforation={false}
        className="max-w-lg w-full shadow-hard-bone"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-bone/15 pb-4">
            <span className="font-mono text-xs uppercase tracking-widest text-volt font-black">
              PASS // 404
            </span>
            <span className="font-mono text-xs text-bone/40">OFFSCRIPT</span>
          </div>

          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto opacity-25 pointer-events-none select-none text-volt" aria-hidden="true">
              <svg viewBox="0 0 560 560" className="w-full h-full fill-current">
                <path d="M 400.1 270.3 C 400.0 283.7, 378.3 285.3, 406.3 301.3 C 434.3 317.3, 569.2 362.5, 568.0 366.3 C 566.8 370.0, 430.2 321.5, 399.0 323.6 C 367.9 325.6, 386.2 362.5, 381.1 378.7 C 375.9 394.9, 359.5 391.1, 368.2 420.7 C 376.8 450.4, 436.3 554.9, 433.1 556.7 C 430.0 558.5, 372.8 450.1, 349.1 431.6 C 325.4 413.1, 309.2 445.8, 291.0 445.5 C 272.9 445.3, 261.2 398.4, 240.3 430.2 C 219.4 462.0, 170.8 637.8, 165.6 636.3 C 160.4 634.9, 208.4 462.1, 209.1 421.4 C 209.9 380.8, 181.8 404.4, 170.3 392.5 C 158.8 380.5, 148.0 362.1, 140.4 349.5 C 132.8 337.0, 153.9 319.0, 124.8 317.1 C 95.7 315.3, -33.1 343.3, -34.2 338.5 C -35.3 333.7, 91.1 303.3, 118.2 288.3 C 145.2 273.2, 141.5 260.4, 128.1 248.3 C 114.7 236.2, 36.9 219.4, 37.8 215.6 C 38.7 211.9, 114.9 228.7, 133.3 225.7 C 151.7 222.7, 141.5 208.5, 148.1 197.8 C 154.7 187.1, 176.5 180.3, 172.9 161.5 C 169.3 142.6, 123.8 86.8, 126.5 84.7 C 129.3 82.6, 172.7 143.8, 189.2 148.9 C 205.7 154.0, 211.1 121.5, 225.6 115.3 C 240.1 109.0, 263.6 132.3, 276.2 111.3 C 288.9 90.3, 297.8 -11.1, 301.4 -10.6 C 305.1 -10.2, 290.3 94.3, 297.9 113.8 C 305.5 133.4, 332.3 101.0, 347.3 106.5 C 362.3 112.0, 364.9 151.6, 387.9 146.7 C 410.9 141.8, 482.7 74.1, 485.5 77.3 C 488.2 80.4, 419.1 144.8, 404.6 165.6 C 390.1 186.4, 382.5 201.4, 398.6 202.0 C 414.7 202.7, 499.8 166.3, 501.1 169.5 C 502.5 172.6, 423.6 204.2, 406.7 221.1 C 389.9 237.9, 400.2 256.9, 400.1 270.3 Z" />
              </svg>
            </div>
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
        </div>
      </TicketShape>
    </div>
  )
}
