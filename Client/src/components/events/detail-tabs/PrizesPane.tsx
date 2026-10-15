import { ScratchCardPrize } from './ScratchCardPrize'
import type { Prize } from '@/types/event'

interface PrizesPaneProps {
  prizes?: Prize[]
}

export function PrizesPane({ prizes = [] }: PrizesPaneProps) {
  // Show up to 3 prizes as static ticket-shaped cards
  const displayPrizes = prizes.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
            PODIUM REWARDS
          </span>
          <span className="font-mono text-[10px] text-bone/50 uppercase">
            Interactive Scratch Cards
          </span>
        </div>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Prizes & Rewards
        </h3>
      </div>

      {displayPrizes.length === 0 ? (
        <p className="font-sans text-sm text-bone/70">
          Prize pool details and sponsor reward announcements are coming soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {displayPrizes.map((prize, idx) => (
            <ScratchCardPrize
              key={idx}
              prize={prize}
              index={idx}
              isFirstRank={idx === 0 || prize.rank === 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
export default PrizesPane
