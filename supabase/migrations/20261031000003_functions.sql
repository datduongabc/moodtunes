-- Server-side logic called by the Edge Function "api" with the service role.

-- Rate limit (NFR-SEC-05). Returns 0 when allowed (and records the event),
-- otherwise the number of seconds to wait.
create function public.check_rate(p_user uuid, p_action text, p_limit int, p_window interval)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
  v_oldest timestamptz;
begin
  select count(*), min(created_at) into v_count, v_oldest
  from public.rate_events
  where user_id = p_user and action = p_action and created_at > now() - p_window;
  if v_count >= p_limit then
    return greatest(1, ceil(extract(epoch from (v_oldest + p_window - now())))::int);
  end if;
  insert into public.rate_events (user_id, action) values (p_user, p_action);
  return 0;
end $$;

-- Chart and statistics refresh (CMP-BE-04, AC-09.1.2, AC-09.1.4)
create function public.refresh_charts() returns void
language plpgsql security definer set search_path = '' as $$
declare
  m record;
  v_snapshot bigint;
  v_prev bigint;
  v_qualified int;
begin
  -- song_mood_stats: all-time counts per song and mood
  delete from public.song_mood_stats where true;
  insert into public.song_mood_stats (song_id, mood_code, tag_count, ratio, last_tagged_at)
  select t.song_id, t.mood_code, count(*)::int,
         round(count(*)::numeric / sum(count(*)) over (partition by t.song_id), 4),
         max(t.created_at)
  from public.mood_tags t
  group by t.song_id, t.mood_code;

  for m in select code from public.moods loop
    select id into v_prev from public.chart_snapshots
      where mood_code = m.code and period = 'week' order by computed_at desc limit 1;

    insert into public.chart_snapshots (mood_code, period) values (m.code, 'week')
      returning id into v_snapshot;

    insert into public.chart_entries (snapshot_id, rank, song_id, votes, previous_rank)
    select v_snapshot, row_number() over (order by c.votes desc, c.last_at desc, c.song_id), c.song_id, c.votes,
           (select e.rank from public.chart_entries e where e.snapshot_id = v_prev and e.song_id = c.song_id)
    from (
      select song_id, count(distinct user_id)::int as votes, max(created_at) as last_at
      from public.mood_tags
      where mood_code = m.code and created_at > now() - interval '7 days'
      group by song_id
      having count(distinct user_id) >= 5
      order by votes desc, last_at desc, song_id
      limit 20
    ) c;
    get diagnostics v_qualified = row_count;

    if v_qualified < 5 then
      -- complete with the songs most tagged with this mood overall (seed data included)
      insert into public.chart_entries (snapshot_id, rank, song_id, votes, previous_rank)
      select v_snapshot, v_qualified + row_number() over (order by s.tag_count desc, s.last_tagged_at desc, s.song_id),
             s.song_id,
             (select count(distinct t.user_id)::int from public.mood_tags t
               where t.song_id = s.song_id and t.mood_code = m.code and t.created_at > now() - interval '7 days'),
             null
      from public.song_mood_stats s
      where s.mood_code = m.code
        and s.song_id not in (select song_id from public.chart_entries where snapshot_id = v_snapshot)
      order by s.tag_count desc, s.last_tagged_at desc, s.song_id
      limit 20 - v_qualified;
      update public.chart_snapshots set is_sample = true where id = v_snapshot;
    end if;
  end loop;

  -- keep only the two latest snapshots per mood and period
  delete from public.chart_snapshots s
  where s.id not in (
    select id from (
      select id, row_number() over (partition by mood_code, period order by computed_at desc) as rn
      from public.chart_snapshots) x where x.rn <= 2);
end $$;

-- Recommendations (AC-06.1.1, AC-06.1.2, AC-06.1.4)
create function public.recommend(p_user uuid, p_mood text, p_context text, p_limit int default 20)
returns table (song_id bigint, score numeric, is_sample boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_snapshot bigint;
begin
  select id into v_snapshot from public.chart_snapshots
    where mood_code = p_mood and period = 'week' order by computed_at desc limit 1;

  return query
  with totals as (
    select st.song_id, sum(st.tag_count) as total from public.song_mood_stats st group by st.song_id
  ),
  cand as (
    select s.id,
      case when exists (select 1 from public.mood_tags t where t.user_id = p_user and t.song_id = s.id and t.mood_code = p_mood)
           then 1 else 0 end as p,
      coalesce((select st.ratio from public.song_mood_stats st join totals tt on tt.song_id = st.song_id
                where st.song_id = s.id and st.mood_code = p_mood and tt.total >= 5), 0) as r,
      coalesce((select 1 - (e.rank - 1)::numeric / 20 from public.chart_entries e
                where e.snapshot_id = v_snapshot and e.song_id = s.id), 0) as c,
      case when p_context is not null and exists (
             select 1 from public.mood_tags t where t.song_id = s.id and t.mood_code = p_mood and t.context = p_context)
           then 1 else 0 end as x,
      (select max(t.created_at) from public.mood_tags t where t.song_id = s.id and t.mood_code = p_mood) as last_at
    from public.songs s
    where s.id in (select t.song_id from public.mood_tags t where t.mood_code = p_mood)
  )
  select cand.id, round(0.5 * p + 0.3 * r + 0.2 * c + 0.1 * x, 4), false
  from cand
  where 0.5 * p + 0.3 * r + 0.2 * c + 0.1 * x > 0
  order by 2 desc, cand.last_at desc nulls last, cand.id
  limit p_limit;

  if not found then
    return query
    select s.id, 0::numeric, true
    from public.songs s
    where s.is_seed
    order by (select coalesce(sum(st.tag_count), 0) from public.song_mood_stats st where st.song_id = s.id) desc, s.id
    limit p_limit;
  end if;
end $$;

-- Mood Guess: start a round (AC-11.1.1, AC-11.1.2)
create function public.start_round(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_round uuid;
  r record;
  v_idx int := 0;
  v_options text[];
begin
  if (select count(*) from (
        select song_id from public.song_mood_stats group by song_id having sum(tag_count) >= 5) e) < 10 then
    raise exception 'NOT_ENOUGH_SONGS' using errcode = 'P0001';
  end if;

  insert into public.game_rounds (user_id) values (p_user) returning id into v_round;

  for r in
    select e.song_id, s.duration_sec,
      (select st.mood_code from public.song_mood_stats st where st.song_id = e.song_id
        order by st.tag_count desc, st.last_tagged_at desc limit 1) as correct
    from (select song_id from public.song_mood_stats group by song_id having sum(tag_count) >= 5) e
    join public.songs s on s.id = e.song_id
    order by random() limit 10
  loop
    select array_agg(code order by random()) into v_options from (
      select r.correct as code
      union all
      (select code from public.moods where code <> r.correct order by random() limit 3)) o;
    insert into public.game_questions (round_id, idx, song_id, correct_mood, options, clip_start_sec)
    values (v_round, v_idx, r.song_id, r.correct, v_options,
            greatest(0, least(r.duration_sec - 15, 30 + floor(random() * 30)::int)));
    v_idx := v_idx + 1;
  end loop;
  return v_round;
end $$;

-- Mood Guess: answer a question (AC-11.1.3, AC-11.1.4); p_mood null = no answer in time
create function public.answer_question(p_user uuid, p_round uuid, p_idx int, p_mood text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q public.game_questions;
  rnd public.game_rounds;
  v_prev_streak int := 0;
  v_correct boolean;
  v_streak int;
  v_points int;
  v_dist jsonb;
begin
  select * into rnd from public.game_rounds where id = p_round and user_id = p_user;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  select * into q from public.game_questions where round_id = p_round and idx = p_idx for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;

  if q.answered then
    if q.answered_mood is distinct from p_mood then
      raise exception 'ALREADY_ANSWERED' using errcode = 'P0001';
    end if;
  else
    if p_mood is not null and not (p_mood = any (q.options)) then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    if p_idx > 0 then
      select streak into v_prev_streak from public.game_questions where round_id = p_round and idx = p_idx - 1;
      v_prev_streak := coalesce(v_prev_streak, 0);
    end if;
    v_correct := p_mood is not null and p_mood = q.correct_mood;
    v_streak := case when v_correct then v_prev_streak + 1 else 0 end;
    v_points := case when v_correct then 100 + 20 * (v_streak - 1) else 0 end;
    update public.game_questions
      set answered = true, answered_mood = p_mood, points = v_points, streak = v_streak, answered_at = now()
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

  select coalesce(jsonb_agg(jsonb_build_object('mood', d.mood_code, 'percent', round(d.ratio * 100))), '[]'::jsonb)
    into v_dist
  from (select mood_code, ratio from public.song_mood_stats where song_id = q.song_id
        order by tag_count desc, last_tagged_at desc limit 3) d;

  return jsonb_build_object(
    'correct', q.answered_mood is not null and q.answered_mood = q.correct_mood,
    'correctMood', q.correct_mood,
    'points', q.points,
    'streak', q.streak,
    'totalScore', rnd.score,
    'correctCount', rnd.correct_count,
    'finished', rnd.status = 'finished',
    'distribution', v_dist);
end $$;

revoke execute on function public.check_rate(uuid, text, int, interval) from public, anon, authenticated;
revoke execute on function public.refresh_charts() from public, anon, authenticated;
revoke execute on function public.recommend(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function public.start_round(uuid) from public, anon, authenticated;
revoke execute on function public.answer_question(uuid, uuid, int, text) from public, anon, authenticated;
grant execute on function public.check_rate(uuid, text, int, interval) to service_role;
grant execute on function public.refresh_charts() to service_role;
grant execute on function public.recommend(uuid, text, text, int) to service_role;
grant execute on function public.start_round(uuid) to service_role;
grant execute on function public.answer_question(uuid, uuid, int, text) to service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
