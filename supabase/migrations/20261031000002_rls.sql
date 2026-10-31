-- Row-level security (A01 table 6.2, NFR-SEC-04)
alter table public.moods           enable row level security;
alter table public.profiles        enable row level security;
alter table public.songs           enable row level security;
alter table public.mood_tags       enable row level security;
alter table public.song_mood_stats enable row level security;
alter table public.chart_snapshots enable row level security;
alter table public.chart_entries   enable row level security;
alter table public.checkins        enable row level security;
alter table public.game_rounds     enable row level security;
alter table public.game_questions  enable row level security;
alter table public.rate_events     enable row level security;

create policy "moods readable" on public.moods for select to authenticated using (true);
create policy "songs readable" on public.songs for select to authenticated using (true);
create policy "stats readable" on public.song_mood_stats for select to authenticated using (true);
create policy "snapshots readable" on public.chart_snapshots for select to authenticated using (true);
create policy "entries readable" on public.chart_entries for select to authenticated using (true);

create policy "own profile read" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own tags read" on public.mood_tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own tags insert" on public.mood_tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own tags update" on public.mood_tags for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tags delete" on public.mood_tags for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "own checkins read" on public.checkins for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rounds read" on public.game_rounds for select to authenticated
  using ((select auth.uid()) = user_id);
-- game_questions and rate_events: no policy, so no direct access for anon or authenticated.

-- Profiles may change only display_name and daily_goal_min from the client
revoke update on public.profiles from anon, authenticated;
grant update (display_name, daily_goal_min) on public.profiles to authenticated;
