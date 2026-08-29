-- Schedule the hourly activity pass.
--
-- Recorded as a migration so the schedule is in version control rather than
-- existing only as something someone once typed into a console.
--
-- Runs at :07, not :00. Nearly every scheduled job in the world fires on the
-- hour, and a clean hourly boundary in updated_at is the thing that gives an
-- automated pattern away.
--
-- The job is scheduled unconditionally but does nothing until
-- site_settings.hype_engine_auto is turned on — automate_hype_engine() checks
-- the toggle itself and returns early. Scheduling and enabling are deliberately
-- separate decisions.

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'hype-hourly') then
    perform cron.unschedule('hype-hourly');
  end if;
  perform cron.schedule('hype-hourly', '7 * * * *', $job$select public.automate_hype_engine()$job$);
end $$;
