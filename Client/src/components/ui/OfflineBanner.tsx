import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      // Auto-retry all active queries when network restores
      queryClient.invalidateQueries()
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.aside
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100000] bg-volt text-ink px-4 py-1.5 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-between border-b-2 border-ink shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-ink animate-ping" />
            <span>OFFLINE MODE // You are viewing cached pass data.</span>
          </div>
          <span className="text-[10px] bg-ink text-volt px-2 py-0.5">AUTO-RECONNECTING</span>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
