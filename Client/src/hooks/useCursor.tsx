import { createContext, useContext, useState, type ReactNode } from 'react'

export type CursorVariant =
  | 'default'
  | 'hover'
  | 'button'
  | 'card'
  | 'drag'
  | 'heading'
  | 'input'
  | 'horizontal'
  | 'hidden'

interface CursorContextValue {
  cursorLabel: string
  cursorVariant: CursorVariant
  setCursorLabel: (label: string) => void
  setCursorVariant: (variant: CursorVariant) => void
  setCursor: (variant: CursorVariant, label?: string) => void
  resetCursor: () => void
}

const CursorContext = createContext<CursorContextValue>({
  cursorLabel: '',
  cursorVariant: 'default',
  setCursorLabel: () => {},
  setCursorVariant: () => {},
  setCursor: () => {},
  resetCursor: () => {},
})

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursorLabel, setCursorLabel] = useState<string>('')
  const [cursorVariant, setCursorVariant] = useState<CursorVariant>('default')

  const setCursor = (variant: CursorVariant, label = '') => {
    setCursorVariant(variant)
    setCursorLabel(label)
  }

  const resetCursor = () => {
    setCursorVariant('default')
    setCursorLabel('')
  }

  return (
    <CursorContext.Provider
      value={{
        cursorLabel,
        cursorVariant,
        setCursorLabel,
        setCursorVariant,
        setCursor,
        resetCursor,
      }}
    >
      {children}
    </CursorContext.Provider>
  )
}

export function useCursor() {
  return useContext(CursorContext)
}
