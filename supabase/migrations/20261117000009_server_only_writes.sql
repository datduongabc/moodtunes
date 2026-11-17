-- Tags and focus sessions are written only by the Edge Function (service role), which applies
-- the rate limit (NFR-SEC-05), the song check and the completedAt window. The client never
-- writes these tables directly, and these policies let anyone with the publishable key skip
-- all three through the REST API. Read policies stay.
drop policy if exists "own tags insert" on public.mood_tags;
drop policy if exists "own tags update" on public.mood_tags;
drop policy if exists "own tags delete" on public.mood_tags;
drop policy if exists "own pomodoro insert" on public.pomodoro_sessions;
