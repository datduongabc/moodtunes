const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in (see README).`);
  return value;
};

export const config = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: required('EXPO_PUBLIC_SUPABASE_KEY', process.env.EXPO_PUBLIC_SUPABASE_KEY),
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  requestTimeoutMs: 10_000,
};

export const apiBaseUrl = () => `${config.supabaseUrl}/functions/v1/api/v1`;
export const restBaseUrl = () => `${config.supabaseUrl}/rest/v1`;
