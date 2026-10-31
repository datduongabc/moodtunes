export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ALREADY_ANSWERED'
  | 'NOT_ENOUGH_SONGS'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ALREADY_ANSWERED: 409,
  NOT_ENOUGH_SONGS: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

/** Maps a Postgres exception raised by the SQL functions (RAISE 'CODE') to an ApiError. */
export function fromDbError(err: { message?: string } | null): ApiError {
  const msg = err?.message ?? '';
  if (msg in STATUS) {
    const text: Record<string, string> = {
      NOT_FOUND: 'Not found',
      ALREADY_ANSWERED: 'This question has already been answered',
      NOT_ENOUGH_SONGS: 'Not enough tagged songs yet',
      VALIDATION_ERROR: 'Invalid request',
    };
    return new ApiError(msg as ErrorCode, text[msg] ?? msg);
  }
  return new ApiError('INTERNAL_ERROR', 'Unexpected server error');
}
