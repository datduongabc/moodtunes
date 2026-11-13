-- Switch game from Mood Guess to Artist Guess (objective artist_name ground truth).

alter table public.game_questions
  add column if not exists correct_artist text,
  add column if not exists answered_artist text;

update public.game_questions q
set correct_artist = s.artist_name
from public.songs s
where s.id = q.song_id and q.correct_artist is null;

alter table public.game_questions
  alter column correct_artist set not null,
  drop column if exists correct_mood,
  drop column if exists answered_mood;

create or replace function public.start_round(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_round uuid;
  r record;
  v_idx int := 0;
  v_options text[];
begin
  if (select count(*) from public.songs) < 10
     or (select count(distinct artist_name) from public.songs) < 4 then
    raise exception 'NOT_ENOUGH_SONGS' using errcode = 'P0001';
  end if;

  insert into public.game_rounds (user_id) values (p_user) returning id into v_round;

  for r in
    select id as song_id, artist_name, duration_sec
    from public.songs
    order by random() limit 10
  loop
    select array_agg(artist_name order by random()) into v_options from (
      select r.artist_name
      union all
      (select artist_name from (
         select distinct artist_name from public.songs where artist_name <> r.artist_name
       ) d order by random() limit 3)
    ) o;

    insert into public.game_questions (round_id, idx, song_id, correct_artist, options, clip_start_sec)
    values (v_round, v_idx, r.song_id, r.artist_name, v_options,
            greatest(0, least(r.duration_sec - 15, 30 + floor(random() * 30)::int)));
    v_idx := v_idx + 1;
  end loop;
  return v_round;
end $$;

drop function if exists public.answer_question(uuid, uuid, int, text);

create function public.answer_question(p_user uuid, p_round uuid, p_idx int, p_artist text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q public.game_questions;
  rnd public.game_rounds;
  v_prev_streak int := 0;
  v_correct boolean;
  v_streak int;
  v_points int;
begin
  select * into rnd from public.game_rounds where id = p_round and user_id = p_user;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  select * into q from public.game_questions where round_id = p_round and idx = p_idx for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;

  if q.answered then
    if q.answered_artist is distinct from p_artist then
      raise exception 'ALREADY_ANSWERED' using errcode = 'P0001';
    end if;
  else
    if p_artist is not null and not (p_artist = any (q.options)) then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    if p_idx > 0 then
      select streak into v_prev_streak from public.game_questions where round_id = p_round and idx = p_idx - 1;
      v_prev_streak := coalesce(v_prev_streak, 0);
    end if;
    v_correct := p_artist is not null and p_artist = q.correct_artist;
    v_streak := case when v_correct then v_prev_streak + 1 else 0 end;
    v_points := case when v_correct then 100 + 20 * (v_streak - 1) else 0 end;
    update public.game_questions
      set answered = true, answered_artist = p_artist, points = v_points, streak = v_streak, answered_at = now()
      where round_id = p_round and idx = p_idx
      returning * into q;
    update public.game_rounds
      set score = score + v_points,
          correct_count = correct_count + case when v_correct then 1 else 0 end,
          status = case when p_idx = 9 then 'finished' else status end,
          finished_at = case when p_idx = 9 then now() else finished_at end
      where id = p_round
      returning * into rnd;
  end if;

  return jsonb_build_object(
    'correct', q.answered_artist is not null and q.answered_artist = q.correct_artist,
    'correctArtist', q.correct_artist,
    'points', q.points,
    'streak', q.streak,
    'totalScore', rnd.score,
    'correctCount', rnd.correct_count,
    'finished', rnd.status = 'finished');
end $$;

revoke execute on function public.start_round(uuid) from public, anon, authenticated;
revoke execute on function public.answer_question(uuid, uuid, int, text) from public, anon, authenticated;
grant execute on function public.start_round(uuid) to service_role;
grant execute on function public.answer_question(uuid, uuid, int, text) to service_role;
