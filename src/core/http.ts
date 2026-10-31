import { config } from './config';
import { supabase } from './supabase';
import { toAppError, type AppError } from './errors';

export type HttpRequest = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

export type HttpResult<T> = { data: T; headers: Headers } | { error: AppError };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once(req: HttpRequest, token: string | undefined): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    return await fetch(req.url, {
      method: req.method ?? 'GET',
      signal: controller.signal,
      headers: {
        apikey: config.supabaseKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(req.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...req.headers,
      },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * HTTP client (NFR-NET-01): 10 s timeout; GET retried twice after 1 s and 2 s;
 * on 401 the token is refreshed once and the request repeated (AC-01.2.3).
 */
export async function http<T>(req: HttpRequest): Promise<HttpResult<T>> {
  const isGet = (req.method ?? 'GET') === 'GET';
  const delays = isGet ? [0, 1000, 2000] : [0];
  let refreshed = false;
  let lastError: AppError = toAppError('NETWORK', null);

  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      const { data } = await supabase.auth.getSession();
      let res = await once(req, data.session?.access_token);
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        const r = await supabase.auth.refreshSession();
        if (r.error || !r.data.session) {
          await supabase.auth.signOut({ scope: 'local' });
          return { error: toAppError(401, null) };
        }
        res = await once(req, r.data.session.access_token);
      }
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (res.ok) return { data: body as T, headers: res.headers };
      lastError = toAppError(res.status, body);
      if (res.status < 500) return { error: lastError };
    } catch (e) {
      lastError = toAppError((e as Error).name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', null);
    }
  }
  return { error: lastError };
}
