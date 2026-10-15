import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface ListContentPaneProps {
  title: string
  label: string
  items: string[]
  type?: 'numbered' | 'marked' | 'checked' | 'rule'
}

export function ListContentPane({
  title,
  label,
  items,
  type = 'marked',
}: ListContentPaneProps) {
  const prefersReduced = usePrefersReducedMotion()

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          {label}
        </span>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          {title}
        </h3>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={prefersReduced ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: prefersReduced ? 0 : idx * 0.05, duration: 0.25 }}
            className="flex items-start gap-4 p-4 border border-bone/15 bg-bone/[0.02] hover:border-bone/30 transition-colors"
          >
            {/* Volt Marker Drawing In */}
            <div className="shrink-0 mt-0.5 select-none">
              {type === 'numbered' || type === 'rule' ? (
                <span className="font-mono text-xs font-black text-volt bg-ink px-1.5 py-0.5 border border-volt/40">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
              ) : type === 'checked' ? (
                <span className="font-mono text-xs font-black text-volt bg-volt/10 px-1.5 py-0.5 border border-volt/30">
                  ✓
                </span>
              ) : (
                <motion.span
                  initial={prefersReduced ? false : { scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 45 }}
                  transition={{ delay: prefersReduced ? 0 : idx * 0.05 + 0.1, type: 'spring', stiffness: 400 }}
                  className="block w-2.5 h-2.5 bg-volt mt-1 shadow-[0_0_6px_#D4FF3F]"
                />
              )}
            </div>

            <p className="font-sans text-sm sm:text-base text-bone/85 leading-relaxed flex-1">
              {item}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
export default ListContentPane
