insert into public.moods (code, label, icon, color, sort_order) values
  ('happy','Happy','white-balance-sunny','#FFEE58',1),
  ('sad','Sad','weather-rainy','#64B5F6',2),
  ('motivated','Motivated','lightning-bolt','#FFB74D',3),
  ('relaxed','Relaxed','leaf','#81C784',4),
  ('focused','Focused','target','#4DD0E1',5),
  ('romantic','Romantic','heart','#F48FB1',6),
  ('nostalgic','Nostalgic','history','#BCAAA4',7),
  ('angry','Angry','fire','#EF5350',8);

create extension if not exists pg_cron;
select cron.schedule('refresh-charts', '*/15 * * * *', $$select public.refresh_charts()$$);
select cron.schedule('purge-rate-events', '17 3 * * *',
  $$delete from public.rate_events where created_at < now() - interval '1 day'$$);
