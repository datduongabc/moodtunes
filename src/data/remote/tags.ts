import { apiBaseUrl } from '@/core/config';
import { http } from '@/core/http';
import type { OutboxChange } from '@/domain/outbox';

/** API-07 / API-08. Both are idempotent, so the outbox may repeat them safely. */
export function sendTagChange(c: OutboxChange) {
  const url = `${apiBaseUrl()}/songs/${c.songId}/tags/${c.mood}`;
  return c.op === 'put'
    ? http<unknown>({ url, method: 'PUT', body: { note: c.note, context: c.context } })
    : http<unknown>({ url, method: 'DELETE' });
}
