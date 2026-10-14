import { useEffect, useState } from 'react'

export interface CountdownResult {
  days: string
  hours: string
  minutes: string
  seconds: string
  totalSeconds: number
  isExpired: boolean
  hasTarget: boolean
}

function padZero(num: number): string {
  return num < 10 ? `0${Math.max(0, num)}` : `${Math.max(0, num)}`
}

function calculateTimeLeft(isoDate?: string | null): CountdownResult {
  if (!isoDate) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      totalSeconds: 0,
      isExpired: true,
      hasTarget: false,
    }
  }

  const targetTime = new Date(isoDate).getTime()
  if (Number.isNaN(targetTime)) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      totalSeconds: 0,
      isExpired: true,
      hasTarget: false,
    }
  }

  const now = Date.now()
  const diff = targetTime - now

  if (diff <= 0) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      totalSeconds: 0,
      isExpired: true,
      hasTarget: true,
    }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    days: padZero(days),
    hours: padZero(hours),
    minutes: padZero(minutes),
    seconds: padZero(seconds),
    totalSeconds,
    isExpired: false,
    hasTarget: true,
  }
}

// Shared 1s interval ticker singleton
const tickerListeners = new Set<() => void>()
let sharedInterval: ReturnType<typeof setInterval> | null = null

function subscribeTicker(callback: () => void) {
  tickerListeners.add(callback)
  if (!sharedInterval) {
    sharedInterval = setInterval(() => {
      tickerListeners.forEach((cb) => cb())
    }, 1000)
  }
  return () => {
    tickerListeners.delete(callback)
    if (tickerListeners.size === 0 && sharedInterval) {
      clearInterval(sharedInterval)
      sharedInterval = null
    }
  }
}

export function useCountdown(targetIsoDate?: string | null): CountdownResult {
  const [prevTarget, setPrevTarget] = useState(targetIsoDate)
  const [timeLeft, setTimeLeft] = useState<CountdownResult>(() =>
    calculateTimeLeft(targetIsoDate)
  )

  // Adjust state during render when prop changes, avoiding cascading effect renders
  if (targetIsoDate !== prevTarget) {
    setPrevTarget(targetIsoDate)
    setTimeLeft(calculateTimeLeft(targetIsoDate))
  }

  useEffect(() => {
    if (!targetIsoDate) return

    const unsubscribe = subscribeTicker(() => {
      setTimeLeft(calculateTimeLeft(targetIsoDate))
    })

    return unsubscribe
  }, [targetIsoDate])

  return timeLeft
}
