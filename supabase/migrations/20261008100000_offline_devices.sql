begin;

-- Called every minute by the scheduler route. One "offline" event per online → offline change;
-- the next authenticated device request marks the camera online again.
create function public.mark_offline_devices(p_after interval default interval '90 seconds')
returns setof public.events
language sql security invoker set search_path = '' as $$
  with stale as (
    update public.devices set status = 'offline'
    where status = 'online' and (last_seen_at is null or last_seen_at < now() - p_after)
    returning id, household_id, room_name
  )
  insert into public.events(household_id, device_id, kind, severity, room_name)
  select household_id, id, 'offline', 'info', room_name from stale
  returning *;
$$;

revoke all on function public.mark_offline_devices(interval) from public, anon, authenticated;
grant execute on function public.mark_offline_devices(interval) to service_role;

commit;
