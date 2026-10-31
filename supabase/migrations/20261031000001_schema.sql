-- MoodTunes schema (A01 section 6.1, ENT-01..ENT-11)
create extension if not exists pg_trgm with schema extensions;

create table public.moods (
  code  text primary key check (code in ('happy','sad','motivated','relaxed','focused','romantic','nostalgic','angry')),
  label text not null,
  icon  text not null,
  color char(7) not null,
  sort_order smallint not null
);

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text not null default 'Listener' check (char_length(display_name) between 1 and 30),
  daily_goal_min int  not null default 120 check (daily_goal_min between 30 and 480 and daily_goal_min % 15 = 0),
  is_seed        boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.songs (
  id           bigint generated always as identity primary key,
  jamendo_id   text not null unique,
  title        text not null,
  artist_name  text not null,
  album_name   text,
  duration_sec int  not null check (duration_sec > 0),
  audio_url    text not null check (audio_url like 'https://%'),
  image_url    text,
  license_name text not null,
  license_url  text not null,
  is_seed      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index songs_title_trgm  on public.songs using gin (title extensions.gin_trgm_ops);
create index songs_artist_trgm on public.songs using gin (artist_name extensions.gin_trgm_ops);
create index songs_title_order on public.songs (title, id);

create table public.mood_tags (
  id         bigint generated always as identity primary key,
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  song_id    bigint not null references public.songs (id) on delete cascade,
  mood_code  text   not null references public.moods (code),
  context    text   check (context in ('study','work','commute','workout')),
  note       text   check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, song_id, mood_code)
);
create index mood_tags_mood_created on public.mood_tags (mood_code, created_at);
create index mood_tags_user_created on public.mood_tags (user_id, created_at desc);
create index mood_tags_song on public.mood_tags (song_id);

create table public.song_mood_stats (
  song_id        bigint not null references public.songs (id) on delete cascade,
  mood_code      text   not null references public.moods (code),
  tag_count      int    not null,
  ratio          numeric(5,4) not null check (ratio between 0 and 1),
  last_tagged_at timestamptz not null,
  primary key (song_id, mood_code)
);

create table public.chart_snapshots (
  id          bigint generated always as identity primary key,
  mood_code   text not null references public.moods (code),
  period      text not null default 'week' check (period in ('week','month','all')),
  computed_at timestamptz not null default now(),
  is_sample   boolean not null default false
);
create index chart_snapshots_latest on public.chart_snapshots (mood_code, period, computed_at desc);

create table public.chart_entries (
  snapshot_id   bigint not null references public.chart_snapshots (id) on delete cascade,
  rank          smallint not null check (rank between 1 and 20),
  song_id       bigint not null references public.songs (id) on delete cascade,
  votes         int not null,
  previous_rank smallint,
  primary key (snapshot_id, rank)
);

create table public.checkins (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  mood_code  text not null references public.moods (code),
  context    text check (context in ('study','work','commute','workout')),
  created_at timestamptz not null default now()
);
create index checkins_user on public.checkins (user_id, created_at desc);

create table public.game_rounds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  score         int not null default 0,
  correct_count smallint not null default 0,
  status        text not null default 'active' check (status in ('active','finished'))
);
create index game_rounds_user on public.game_rounds (user_id, started_at desc);

create table public.game_questions (
  round_id      uuid not null references public.game_rounds (id) on delete cascade,
  idx           smallint not null check (idx between 0 and 9),
  song_id       bigint not null references public.songs (id) on delete cascade,
  correct_mood  text not null references public.moods (code),
  options       text[] not null check (cardinality(options) = 4),
  clip_start_sec int not null default 0,
  answered      boolean not null default false,
  answered_mood text references public.moods (code),
  points        int not null default 0,
  streak        smallint not null default 0,
  answered_at   timestamptz,
  primary key (round_id, idx)
);

create table public.rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  action     text not null check (action in ('tag','game_round')),
  created_at timestamptz not null default now()
);
create index rate_events_lookup on public.rate_events (user_id, action, created_at desc);

-- updated_at maintenance
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger mood_tags_touch before update on public.mood_tags
  for each row execute function public.touch_updated_at();

-- Profile row for every new account
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(split_part(new.email, '@', 1), ''), 'Listener'), 30));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
