begin;

-- A reconnect code brings an existing camera back (same room, settings and history) on a phone
-- that lost its page or its saved connection. Claiming it replaces the camera's token, so the
-- old browser can no longer report for this camera.
alter table public.pairing_codes
  add column reconnect_device_id uuid references public.devices(id) on delete cascade;

create function private.create_reconnect_pairing(p_device_id uuid)
returns table (code text, expires_at timestamptz, device_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  camera public.devices;
  generated_code text;
  expiry timestamptz := now() + interval '10 minutes';
begin
  select d.* into camera from public.devices d
  join public.household_members m on m.household_id = d.household_id
  where d.id = p_device_id and m.user_id = (select auth.uid())
  for update of d;
  if not found then raise exception 'Camera not found' using errcode = '42501'; end if;
  if exists (select 1 from private.account_cleanups c where c.household_id = camera.household_id) then
    raise exception 'Account cleanup in progress';
  end if;
  -- Only the newest reconnect code for a camera stays usable.
  update public.pairing_codes p set expires_at = now()
  where p.reconnect_device_id = camera.id and p.expires_at > now() and p.device_id is null;
  for attempt in 1..10 loop
    generated_code := lpad(((('x' || left(gen_random_uuid()::text, 8))::bit(32)::bigint % 1000000)::text), 6, '0');
    begin
      insert into public.pairing_codes(code, household_id, name, room_name, kind, expires_at,
        reconnect_device_id)
      values (generated_code, camera.household_id, camera.name, camera.room_name, camera.kind,
        expiry, camera.id);
      return query select generated_code, expiry, null::uuid;
      return;
    exception when unique_violation then
    end;
  end loop;
  raise exception 'Could not allocate a pairing code';
end;
$$;

create function public.create_reconnect_pairing(p_device_id uuid)
returns table (code text, expires_at timestamptz, device_id uuid)
language sql security invoker set search_path = '' as $$
  select * from private.create_reconnect_pairing(p_device_id);
$$;
revoke all on function public.create_reconnect_pairing(uuid) from public, anon;
revoke all on function private.create_reconnect_pairing(uuid) from public, anon;
grant execute on function public.create_reconnect_pairing(uuid) to authenticated;
grant execute on function private.create_reconnect_pairing(uuid) to authenticated;

create or replace function public.claim_pairing(p_code text, p_kind text, p_token_hash text, p_client text)
returns table (status text, device_id uuid, household_id uuid, name text, room_name text)
language plpgsql security invoker set search_path = '' as $$
declare
  pairing public.pairing_codes;
  created uuid;
  camera_name text;
  camera_room text;
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
  if pairing.reconnect_device_id is not null then
    update public.devices d set status = 'online', last_seen_at = now()
    where d.id = pairing.reconnect_device_id
    returning d.id, d.name, d.room_name into created, camera_name, camera_room;
    if created is null then
      return query select 'invalid'::text, null::uuid, null::uuid, null::text, null::text;
      return;
    end if;
    insert into private.device_tokens(device_id, token_hash) values (created, p_token_hash)
    on conflict on constraint device_tokens_pkey do update
    set token_hash = excluded.token_hash, created_at = now(), revoked_at = null;
    update public.pairing_codes p set device_id = created, expires_at = now() where p.code = p_code;
    return query select 'paired'::text, created, pairing.household_id, camera_name, camera_room;
    return;
  end if;
  insert into public.devices(household_id, name, room_name, kind, status, last_seen_at)
  values (pairing.household_id, pairing.name, pairing.room_name,
    coalesce(p_kind, pairing.kind), 'online', now())
  returning id into created;
  insert into private.device_tokens(device_id, token_hash) values (created, p_token_hash);
  -- Expiry persists even when ON DELETE SET NULL clears the device reference.
  update public.pairing_codes p set device_id = created, expires_at = now() where p.code = p_code;
  return query select 'paired'::text, created, pairing.household_id, pairing.name, pairing.room_name;
end;
$$;

commit;
