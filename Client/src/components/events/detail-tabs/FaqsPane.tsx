import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { FAQ } from '@/types/event'

interface FaqsPaneProps {
  faqs?: FAQ[]
}

export function FaqsPane({ faqs = [] }: FaqsPaneProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          HELP & QUESTIONS
        </span>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Frequently Asked Questions
        </h3>
      </div>

      {faqs.length === 0 ? (
        <p className="font-sans text-sm text-bone/70">
          No FAQs currently listed for this event. Reach out to the coordinators with any questions.
        </p>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="border-2 border-bone/20 bg-bone/[0.02] p-4 sm:p-5 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  className="w-full flex justify-between items-center text-left gap-4 font-mono text-xs sm:text-sm text-bone font-bold uppercase tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
                >
                  <span className="flex-1">{faq.question}</span>
                  {/* Rotating Plus / Minus Icon with Spring */}
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 350 }}
                    className="text-volt font-mono text-xl shrink-0 select-none block w-5 h-5 text-center leading-none"
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                      className="overflow-hidden pt-3 border-t border-bone/15 mt-3"
                    >
                      <p className="font-sans text-xs sm:text-sm text-bone/75 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default FaqsPane
