begin;

-- Hashed client addresses of recent pairing attempts. Bounds guessing of six-digit codes.
create table private.pairing_attempts (
  client text not null check (client ~ '^[a-f0-9]{64}$'),
  attempted_at timestamptz not null default now()
);
create index pairing_attempts_client_idx on private.pairing_attempts(client, attempted_at);
alter table private.pairing_attempts enable row level security;
grant all on private.pairing_attempts to service_role;

-- Device API only (server key). Failed attempts must commit, so outcomes are returned, not raised.
create function public.claim_pairing(p_code text, p_kind text, p_token_hash text, p_client text)
returns table (status text, device_id uuid, household_id uuid, name text, room_name text)
language plpgsql security invoker set search_path = '' as $$
declare
  pairing public.pairing_codes;
  created uuid;
begin
  delete from private.pairing_attempts a where a.attempted_at < now() - interval '1 hour';
  if (select count(*) from private.pairing_attempts a
    where a.client = p_client and a.attempted_at > now() - interval '10 minutes') >= 10 then
    return query select 'limited'::text, null::uuid, null::uuid, null::text, null::text;
    return;
  end if;
  insert into private.pairing_attempts(client) values (p_client);
  select * into pairing from public.pairing_codes p where p.code = p_code for update;
  if not found or pairing.expires_at <= now() or pairing.device_id is not null then
    return query select 'invalid'::text, null::uuid, null::uuid, null::text, null::text;
    return;
  end if;
  insert into public.devices(household_id, name, room_name, kind, status, last_seen_at)
  values (pairing.household_id, pairing.name, pairing.room_name,
    coalesce(p_kind, pairing.kind), 'online', now())
  returning id into created;
  insert into private.device_tokens(device_id, token_hash) values (created, p_token_hash);
  update public.pairing_codes p set device_id = created where p.code = p_code;
  return query select 'paired'::text, created, pairing.household_id, pairing.name, pairing.room_name;
end;
$$;

-- Every authenticated device request also counts as a heartbeat.
create function public.authenticate_device(p_token_hash text)
returns setof public.devices
language sql security invoker set search_path = '' as $$
  update public.devices d set last_seen_at = now(), status = 'online'
  from private.device_tokens t
  where t.device_id = d.id and t.token_hash = p_token_hash and t.revoked_at is null
  returning d.*;
$$;

revoke all on function public.claim_pairing(text, text, text, text),
  public.authenticate_device(text) from public, anon, authenticated;
grant execute on function public.claim_pairing(text, text, text, text),
  public.authenticate_device(text) to service_role;

commit;
