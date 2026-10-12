begin;

-- A closed camera page cannot be reopened from the server. The camera's own browser keeps a
-- push subscription, so a "wake" notification can bring the person at home back to /monitor.
create table private.device_push_subscriptions (
  device_id uuid primary key references public.devices(id) on delete cascade,
  endpoint text not null check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now(),
  last_wake_at timestamptz
);
alter table private.device_push_subscriptions enable row level security;
grant all on private.device_push_subscriptions to service_role;

create function public.save_device_push(p_device_id uuid, p_endpoint text, p_p256dh text,
  p_auth text) returns void
language sql security invoker set search_path = '' as $$
  insert into private.device_push_subscriptions(device_id, endpoint, p256dh, auth)
  values (p_device_id, p_endpoint, p_p256dh, p_auth)
  on conflict (device_id) do update
  set endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth,
    updated_at = now();
$$;

-- At most one wake per camera every 30 seconds, so repeated taps cannot flood the phone.
create function public.claim_device_wake(p_device_id uuid)
returns table (endpoint text, p256dh text, auth text)
language sql security invoker set search_path = '' as $$
  update private.device_push_subscriptions s set last_wake_at = now()
  where s.device_id = p_device_id
    and (s.last_wake_at is null or s.last_wake_at < now() - interval '30 seconds')
  returning s.endpoint, s.p256dh, s.auth;
$$;

create function public.forget_device_push(p_device_id uuid, p_endpoint text) returns void
language sql security invoker set search_path = '' as $$
  delete from private.device_push_subscriptions s
  where s.device_id = p_device_id and s.endpoint = p_endpoint;
$$;

revoke all on function public.save_device_push(uuid, text, text, text),
  public.claim_device_wake(uuid), public.forget_device_push(uuid, text)
  from public, anon, authenticated;
grant execute on function public.save_device_push(uuid, text, text, text),
  public.claim_device_wake(uuid), public.forget_device_push(uuid, text) to service_role;

commit;
