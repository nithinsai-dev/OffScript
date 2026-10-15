import { formatPrizeAmount } from '@/lib/formatters'
import type { Prize } from '@/types/event'

interface PrizesPaneProps {
  prizes?: Prize[]
}

export function PrizesPane({ prizes = [] }: PrizesPaneProps) {
  if (!prizes || prizes.length === 0) {
    return null
  }

  // Highest rank first (rank 1, 2, 3...)
  const sortedPrizes = [...prizes].sort((a, b) => (a.rank || 0) - (b.rank || 0))

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          PODIUM REWARDS
        </span>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Prizes & Rewards
        </h3>
      </div>

      <div className="space-y-4 pt-2">
        {sortedPrizes.map((prize, idx) => {
          const rankLabel = String(prize.rank ?? idx + 1).padStart(2, '0')
          const formattedAmount = formatPrizeAmount(prize.amount)
          const isFirst = (prize.rank ?? idx + 1) === 1

          return (
            <div
              key={idx}
              className={`border-2 p-4 sm:p-5 transition-colors relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isFirst
                  ? 'border-volt/60 bg-volt/[0.04]'
                  : 'border-bone/20 bg-bone/[0.02]'
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                {/* Rank Mono Label */}
                <div
                  className={`shrink-0 w-12 h-12 flex items-center justify-center font-mono text-base font-black border ${
                    isFirst
                      ? 'bg-volt text-ink border-volt'
                      : 'bg-ink text-bone/80 border-bone/30'
                  }`}
                >
                  {rankLabel}
                </div>

                <div className="space-y-1 min-w-0">
                  <h4 className="font-display font-black text-lg uppercase text-bone tracking-tight">
                    {prize.title || `Rank ${prize.rank ?? idx + 1}`}
                  </h4>
                  {prize.description && (
                    <p className="font-sans text-xs text-bone/70 max-w-xl">
                      {prize.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount Line - hidden if missing */}
              {formattedAmount && (
                <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 border-bone/10 pt-2 sm:pt-0">
                  <span className="font-mono text-[10px] text-bone/40 uppercase block tracking-wider">
                    REWARD
                  </span>
                  <span className="font-display font-black text-xl sm:text-2xl text-volt tracking-tight">
                    {formattedAmount}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PrizesPane
