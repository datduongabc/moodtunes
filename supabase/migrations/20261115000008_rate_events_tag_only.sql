-- The game was removed in 20261114000007; only tag changes are rate limited now.
-- No row uses 'game_round' (checked before this migration), so the stricter check is safe.
alter table public.rate_events drop constraint if exists rate_events_action_check;
alter table public.rate_events add constraint rate_events_action_check check (action in ('tag'));
