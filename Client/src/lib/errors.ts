export type ApiErrorCode =
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'SCHEMA_MISMATCH'
  | 'UNKNOWN'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly retryable: boolean
  readonly retryAfterSeconds?: number

  constructor(params: {
    status: number
    code: ApiErrorCode
    message: string
    retryable: boolean
    retryAfterSeconds?: number
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.retryable = params.retryable
    this.retryAfterSeconds = params.retryAfterSeconds

    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

/**
 * Normalizes HTTP responses or network exceptions into typed ApiError
 */
export function normalizeHttpError(
  responseOrError: Response | Error | unknown,
  customMessage?: string
): ApiError {
  if (responseOrError instanceof ApiError) {
    return responseOrError
  }

  // Browser offline check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new ApiError({
      status: 0,
      code: 'OFFLINE',
      message: 'You appear to be offline. Check your network connection.',
      retryable: true,
    })
  }

  // Standard Response object
  if (responseOrError instanceof Response) {
    const status = responseOrError.status
    const retryAfterHeader = responseOrError.headers.get('Retry-After')
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) || undefined : undefined

    if (status === 400) {
      return new ApiError({
        status,
        code: 'BAD_REQUEST',
        message: customMessage || 'Invalid request payload sent to the server.',
        retryable: false,
      })
    }

    if (status === 401 || status === 403) {
      return new ApiError({
        status,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
        message: customMessage || 'Access restricted. You are not authorized to view this resource.',
        retryable: false,
      })
    }

    if (status === 404) {
      return new ApiError({
        status,
        code: 'NOT_FOUND',
        message: customMessage || 'The requested event could not be located in our index.',
        retryable: false,
      })
    }

    if (status === 408 || status === 429) {
      return new ApiError({
        status,
        code: 'RATE_LIMITED',
        message: customMessage || 'Rate limit exceeded. Please ease up on requests.',
        retryable: true,
        retryAfterSeconds,
      })
    }

    if (status >= 500) {
      return new ApiError({
        status,
        code: 'SERVER_ERROR',
        message: customMessage || 'The event server encountered internal trouble. Try again shortly.',
        retryable: true,
      })
    }

    return new ApiError({
      status,
      code: 'UNKNOWN',
      message: customMessage || `Unexpected response with status code ${status}.`,
      retryable: true,
    })
  }

  // Abort / Timeout errors
  if (responseOrError instanceof Error) {
    if (responseOrError.name === 'AbortError') {
      return new ApiError({
        status: 408,
        code: 'TIMEOUT',
        message: 'Request timed out waiting for the server to reply.',
        retryable: true,
      })
    }

    if (responseOrError.message.toLowerCase().includes('failed to fetch') || 
        responseOrError.message.toLowerCase().includes('networkerror')) {
      return new ApiError({
        status: 0,
        code: 'OFFLINE',
        message: 'Network connection failed. Verify connectivity or server status.',
        retryable: true,
      })
    }

    return new ApiError({
      status: 0,
      code: 'UNKNOWN',
      message: responseOrError.message || 'An unexpected runtime error occurred.',
      retryable: true,
    })
  }

  return new ApiError({
    status: 0,
    code: 'UNKNOWN',
    message: 'An unknown failure occurred.',
    retryable: true,
  })
}
