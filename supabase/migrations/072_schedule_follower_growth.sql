-- Fold follower growth into the existing hourly pass.
--
-- One job rather than two: both halves read the same toggle and the same
-- intensity, and a single command keeps them from drifting apart in the
-- schedule. Followers accrue far more slowly than views by design — someone
-- following a photographer has made a decision, a view is a glance.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'hype-hourly') then
    perform cron.unschedule('hype-hourly');
  end if;
  perform cron.schedule(
    'hype-hourly',
    '7 * * * *',
    $job$select public.automate_hype_engine(), public.automate_follower_growth()$job$
  );
end $$;
