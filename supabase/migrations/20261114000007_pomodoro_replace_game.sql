-- Replace Artist Guess game with Pomodoro focus sessions
drop function if exists public.answer_question(uuid, uuid, int, text);
drop function if exists public.start_round(uuid);
drop table if exists public.game_questions;
drop table if exists public.game_rounds;

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  focus_min int not null check (focus_min between 5 and 120),
  break_min int not null check (break_min between 1 and 30),
  mood text references public.moods(code),
  completed_at timestamptz not null default now()
);

create index if not exists pomodoro_sessions_user_completed_idx
  on public.pomodoro_sessions (user_id, completed_at desc);

alter table public.pomodoro_sessions enable row level security;

create policy "own pomodoro read" on public.pomodoro_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own pomodoro insert" on public.pomodoro_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
