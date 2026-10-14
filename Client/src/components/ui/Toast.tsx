import { createContext, useContext, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export type ToastType = 'info' | 'error' | 'success'

export interface ToastMessage {
  id: string
  title?: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (params: { message: string; title?: string; type?: ToastType; durationMs?: number }) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  removeToast: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const showToast = ({
    message,
    title,
    type = 'info',
    durationMs = 4000,
  }: {
    message: string
    title?: string
    type?: ToastType
    durationMs?: number
  }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    setToasts((prev) => [...prev, { id, title, message, type }])

    setTimeout(() => {
      removeToast(id)
    }, durationMs)
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9990] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto relative border-2 bg-ink p-4 shadow-hard-bone flex items-start gap-3 select-none ${
                toast.type === 'error'
                  ? 'border-volt text-bone'
                  : 'border-bone/20 text-bone'
              }`}
            >
              <div className="shrink-0 pt-0.5">
                {toast.type === 'error' ? (
                  <div className="h-4 w-4 rotate-45 border border-volt bg-volt text-ink flex items-center justify-center font-mono text-[10px] font-bold">
                    !
                  </div>
                ) : (
                  <div className="h-4 w-4 rotate-45 border border-bone/60" />
                )}
              </div>

              <div className="flex-1 space-y-0.5">
                {toast.title && (
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-volt">
                    {toast.title}
                  </h4>
                )}
                <p className="font-sans text-xs text-bone/90 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                className="shrink-0 text-bone/50 hover:text-bone p-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
