import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/app/queryClient'
import { router } from '@/app/router'
import { PageLoader } from '@/components/ui/Skeletons'

export function App() {
  const [initialLoading, setInitialLoading] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem('offscript_splash_seen')
  })

  const handleSplashComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('offscript_splash_seen', 'true')
    }
    setInitialLoading(false)
  }

  return (
    <QueryClientProvider client={queryClient}>
      {initialLoading && <PageLoader onComplete={handleSplashComplete} />}
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
