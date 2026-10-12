begin;

-- The per-client limit counted earlier attempts before recording the new one. Parallel requests
-- all saw a count under the limit and passed together. A per-client transaction lock makes them
-- take turns.
create or replace function public.claim_pairing(p_code text, p_kind text, p_token_hash text, p_client text)
returns table (status text, device_id uuid, household_id uuid, name text, room_name text)
language plpgsql security invoker set search_path = '' as $$
declare
  pairing public.pairing_codes;
  created uuid;
  camera_name text;
  camera_room text;
begin
  -- Attempts from one client wait in line, so parallel guesses cannot all pass the count below.
  perform pg_advisory_xact_lock(hashtext(p_client));
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
