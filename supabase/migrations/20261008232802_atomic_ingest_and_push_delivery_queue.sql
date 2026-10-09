begin;

-- Every alert gets a delivery row in the same transaction as the event, so a push that is lost
-- (crashed function, push service outage) is retried by the minute job instead of vanishing.
create table private.push_deliveries (
  event_id uuid primary key references public.events(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  -- The request that created the event tries first; the job only picks up what it missed.
  next_attempt_at timestamptz not null default now() + interval '30 seconds',
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_deliveries_due_idx on private.push_deliveries(next_attempt_at) where delivered_at is null;
alter table private.push_deliveries enable row level security;
grant all on private.push_deliveries to service_role;

-- One transaction per detection. Locking the camera row makes retries and the rate limit exact
-- even when the same event arrives twice at once.
create function public.ingest_event(p_device_id uuid, p_idempotency_key text, p_kind text,
  p_severity text, p_confidence double precision, p_occurred_at timestamptz, p_person_name text)
returns table (status text, event_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  camera public.devices;
  found_id uuid;
begin
  select * into camera from public.devices d where d.id = p_device_id for update;
  if not found or exists (select 1 from private.account_cleanups c where c.household_id = camera.household_id) then
    return query select 'unauthorized'::text, null::uuid;
    return;
  end if;
  select e.id into found_id from public.events e
  where e.device_id = camera.id and e.idempotency_key = p_idempotency_key;
  if found_id is not null then
    return query select 'duplicate'::text, found_id;
    return;
  end if;
  if (select count(*) from public.events e
    where e.device_id = camera.id and e.created_at > now() - interval '10 minutes') >= 30 then
    return query select 'limited'::text, null::uuid;
    return;
  end if;
  insert into public.events(household_id, device_id, idempotency_key, kind, severity, confidence,
    person_name, room_name, occurred_at)
  values (camera.household_id, camera.id, p_idempotency_key, p_kind, p_severity, p_confidence,
    p_person_name, camera.room_name, p_occurred_at)
  returning id into found_id;
  insert into private.push_deliveries(event_id) values (found_id);
  return query select 'created'::text, found_id;
end;
$$;

-- Offline notices are only sent by the job, so they are due immediately.
create or replace function public.mark_offline_devices(p_after interval default interval '90 seconds')
returns setof public.events
language sql security invoker set search_path = '' as $$
  with stale as (
    update public.devices set status = 'offline'
    where status = 'online' and (last_seen_at is null or last_seen_at < now() - p_after)
    returning id, household_id, room_name
  ), inserted as (
    insert into public.events(household_id, device_id, kind, severity, room_name)
    select household_id, id, 'offline', 'info', room_name from stale
    returning *
  ), queued as (
    insert into private.push_deliveries(event_id, next_attempt_at) select id, now() from inserted
  )
  select * from inserted;
$$;

-- Leases due deliveries (exponential back-off, five tries within an hour) and returns their events.
-- Answered alerts are not pushed again.
create function public.claim_push_deliveries(p_limit integer default 20)
returns setof public.events
language sql security invoker set search_path = '' as $$
  with due as (
    select q.event_id from private.push_deliveries q
    join public.events e on e.id = q.event_id
    where q.delivered_at is null and q.next_attempt_at <= now() and q.attempts < 5
      and q.created_at > now() - interval '1 hour' and e.status = 'new'
    order by q.next_attempt_at
    limit greatest(1, least(p_limit, 100))
    for update of q skip locked
  ), leased as (
    update private.push_deliveries q
    set attempts = q.attempts + 1,
      next_attempt_at = now() + interval '30 seconds' * power(2, q.attempts)
    from due where q.event_id = due.event_id
    returning q.event_id
  )
  select e.* from public.events e join leased l on l.event_id = e.id;
$$;

create function public.complete_push_delivery(p_event_id uuid) returns void
language sql security invoker set search_path = '' as $$
  update private.push_deliveries set delivered_at = coalesce(delivered_at, now()) where event_id = p_event_id;
$$;

revoke all on function public.ingest_event(uuid, text, text, text, double precision, timestamptz, text),
  public.mark_offline_devices(interval), public.claim_push_deliveries(integer),
  public.complete_push_delivery(uuid) from public, anon, authenticated;
grant execute on function public.ingest_event(uuid, text, text, text, double precision, timestamptz, text),
  public.mark_offline_devices(interval), public.claim_push_deliveries(integer),
  public.complete_push_delivery(uuid) to service_role;

commit;
