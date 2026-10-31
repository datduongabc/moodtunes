/** Normalised error used by every screen (A01 table 6.6). */
export type AppError = {
  status: number | 'NETWORK' | 'TIMEOUT';
  code: string;
  message: string;
  retryAfterSec?: number;
};

export const isOfflineError = (e: AppError) => e.status === 'NETWORK' || e.status === 'TIMEOUT' || e.status === 503;

const FRIENDLY: Record<string, string> = {
  RATE_LIMITED: 'Too many tags at once. Try again in a minute',
  NOT_FOUND: 'This song is no longer available',
  NOT_ENOUGH_SONGS: 'Not enough tagged songs yet',
  INTERNAL_ERROR: 'Something went wrong. Try again',
};

export function toAppError(status: AppError['status'], body: unknown): AppError {
  const err = (body as { error?: { code?: string; message?: string; details?: { retryAfterSec?: number } } })?.error;
  const code = err?.code ?? (typeof status === 'number' ? `HTTP_${status}` : status);
  return {
    status,
    code,
    message: FRIENDLY[code] ?? err?.message ?? (status === 'TIMEOUT' ? 'The request timed out' : 'Connection problem'),
    retryAfterSec: err?.details?.retryAfterSec,
  };
}
