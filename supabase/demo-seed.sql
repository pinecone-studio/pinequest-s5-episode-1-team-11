-- Optional development fixtures. First sign up normally, then run in the same SQL batch:
-- select set_config('halo.seed_user_id', 'YOUR_AUTH_USER_UUID', false);
-- followed by this entire file. Never creates an auth account or device bearer token.
begin;
do $$
declare
  seed_user uuid := nullif(current_setting('halo.seed_user_id', true), '')::uuid;
  home uuid;
  phone uuid;
  camera uuid;
begin
  if seed_user is null or not exists (select 1 from auth.users where id = seed_user) then
    raise exception 'Set halo.seed_user_id to an existing auth user UUID in the same SQL batch';
  end if;
  perform 1 from public.profiles where id = seed_user for update;
  select household_id into home from public.household_members where user_id = seed_user;
  if home is null then
    insert into public.households(name, owner_id) values ('Demo · Halo', seed_user) returning id into home;
    insert into public.household_members(household_id, user_id, role) values (home, seed_user, 'owner');
  elsif not exists (select 1 from public.households where id = home and owner_id = seed_user) then
    raise exception 'Demo seed requires household owner access';
  end if;

  select id into phone from public.devices where household_id = home and name = 'Demo · Browser' limit 1;
  if phone is null then
    insert into public.devices(household_id, name, room_name, kind, status, last_seen_at)
    values (home, 'Demo · Browser', 'Зочны өрөө', 'phone', 'online', now()) returning id into phone;
  end if;
  select id into camera from public.devices where household_id = home and name = 'Demo · CCTV' limit 1;
  if camera is null then
    insert into public.devices(household_id, name, room_name, kind, status, last_seen_at)
    values (home, 'Demo · CCTV', 'Коридор', 'ip_camera', 'offline', now() - interval '2 hours') returning id into camera;
  end if;
  if not exists (select 1 from public.watched_people where household_id = home and name = 'Demo · Дулмаа') then
    insert into public.watched_people(household_id, name, kind, age, notes)
    values (home, 'Demo · Дулмаа', 'elderly', 78, 'Development fixture');
  end if;

  insert into public.events(household_id, device_id, idempotency_key, kind, severity,
    person_name, room_name, occurred_at, note)
  values (home, phone, 'foundation-seed-alert', 'test', 'critical', 'Demo · Дулмаа',
    'Зочны өрөө', now() - interval '3 minutes', 'Demo fixture — no actual camera detection')
  on conflict (device_id, idempotency_key) do nothing;
  insert into public.events(household_id, device_id, idempotency_key, kind, severity,
    room_name, occurred_at, note)
  values (home, camera, 'foundation-seed-offline', 'offline', 'info',
    'Коридор', now() - interval '2 hours', 'Demo fixture — no CCTV connection')
  on conflict (device_id, idempotency_key) do nothing;
end;
$$;
commit;
