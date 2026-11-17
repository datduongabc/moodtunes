-- Focus statistics computed in the database (API-11, API-12). The Edge Function used to download
-- every session of the listener and add them up, which silently stopped at the Data API row limit
-- (1000 by default) and grew slower with every session.
create function public.pomodoro_stats(p_user uuid, p_today_start timestamptz)
returns table (total_sessions int, total_focus_minutes int, today_focus_minutes int)
language sql stable security definer set search_path = '' as $$
  select count(*)::int,
         coalesce(sum(focus_min), 0)::int,
         coalesce(sum(focus_min) filter (where completed_at >= p_today_start), 0)::int
  from public.pomodoro_sessions
  where user_id = p_user
$$;

revoke execute on function public.pomodoro_stats(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.pomodoro_stats(uuid, timestamptz) to service_role;
