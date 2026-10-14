import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Do not retry 4xx errors (e.g. 404 Not Found, 400 Bad Request, 401/403)
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
            return false
          }
        }
        // Maximum 3 retries for transient/network errors
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    },
  },
})
