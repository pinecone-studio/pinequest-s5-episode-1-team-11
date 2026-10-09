begin;

-- An owner who is leaving: cameras are revoked first, then snapshots are removed through the
-- Storage API (files live outside Postgres), then the account can be deleted.
create table private.account_cleanups (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  household_id uuid not null unique references public.households(id) on delete cascade,
  prepared_at timestamptz not null default now()
);
alter table private.account_cleanups enable row level security;
grant select on private.account_cleanups to service_role;

create function private.transfer_household_ownership(p_new_owner uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  home uuid;
begin
  select h.id into home from public.households h where h.owner_id = caller for update;
  if home is null then raise exception 'Owner access required' using errcode = '42501'; end if;
  if not exists (select 1 from public.household_members m
    where m.household_id = home and m.user_id = p_new_owner and m.role = 'caregiver') then
    raise exception 'Existing caregiver required';
  end if;
  update public.households set owner_id = p_new_owner where id = home;
  update public.household_members set role = case when user_id = p_new_owner then 'owner' else 'caregiver' end
  where household_id = home and user_id in (caller, p_new_owner);
  -- Invites were issued under the previous owner's authority.
  update public.household_invites set expires_at = least(expires_at, now())
  where household_id = home and accepted_at is null;
  delete from private.account_cleanups where household_id = home;
  return home;
end;
$$;

create function private.begin_account_cleanup() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  home uuid;
begin
  select h.id into home from public.households h where h.owner_id = caller for update;
  if home is null then raise exception 'Owner access required' using errcode = '42501'; end if;
  if exists (select 1 from public.household_members m where m.household_id = home and m.user_id <> caller) then
    raise exception 'Transfer household ownership before deleting the account';
  end if;
  insert into private.account_cleanups(user_id, household_id) values (caller, home)
  on conflict (user_id) do nothing;
  -- No camera may upload new snapshots while files are being removed.
  update private.device_tokens t set revoked_at = coalesce(t.revoked_at, now())
  from public.devices d where d.id = t.device_id and d.household_id = home;
  update public.devices set status = 'offline' where household_id = home;
  update public.pairing_codes set expires_at = least(expires_at, now())
  where household_id = home and device_id is null;
  return home;
end;
$$;

create function private.account_cleanup_prepared() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.account_cleanups c where c.user_id = (select auth.uid()));
$$;

create function private.finish_account_cleanup() returns boolean
language plpgsql security definer set search_path = '' as $$
declare home uuid;
begin
  select c.household_id into home from private.account_cleanups c where c.user_id = auth.uid() for update;
  if home is null then raise exception 'Account cleanup not started'; end if;
  if exists (select 1 from storage.objects o
    where o.bucket_id = 'event-snapshots' and split_part(o.name, '/', 1) = home::text) then
    raise exception 'Remove household snapshots through the Storage API first';
  end if;
  update public.events set snapshot_path = null where household_id = home and snapshot_path is not null;
  return true;
end;
$$;

create function private.cancel_account_cleanup() returns void
language sql security definer set search_path = '' as $$
  delete from private.account_cleanups c where c.user_id = (select auth.uid());
$$;

-- Same as before, plus: no new cameras while the owner is leaving.
create or replace function private.create_pairing(p_name text, p_room_name text, p_kind text)
returns table (code text, expires_at timestamptz, device_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  home uuid;
  generated_code text;
  expiry timestamptz := now() + interval '10 minutes';
begin
  select h.id into home from public.households h
  join public.household_members m on m.household_id = h.id
  where m.user_id = (select auth.uid()) for update of h;
  if home is null then raise exception 'Household required' using errcode = '42501'; end if;
  if exists (select 1 from private.account_cleanups c where c.household_id = home) then
    raise exception 'Account cleanup in progress';
  end if;
  if (select count(*) from public.pairing_codes p where p.household_id = home
    and p.expires_at > now() and p.device_id is null) >= 5 then
    raise exception 'Too many active pairing codes';
  end if;
  for attempt in 1..10 loop
    generated_code := lpad(((('x' || left(gen_random_uuid()::text, 8))::bit(32)::bigint % 1000000)::text), 6, '0');
    begin
      insert into public.pairing_codes(code, household_id, name, room_name, kind, expires_at)
      values (generated_code, home, btrim(p_name), btrim(p_room_name), p_kind, expiry);
      return query select generated_code, expiry, null::uuid;
      return;
    exception when unique_violation then
    end;
  end loop;
  raise exception 'Could not allocate a pairing code';
end;
$$;

-- Deleting snapshots is only possible for the owner's own household during cleanup.
create function private.can_delete_snapshot(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.account_cleanups c
    where c.user_id = (select auth.uid()) and c.household_id::text = split_part(path, '/', 1));
$$;
create policy household_snapshots_cleanup on storage.objects for delete to authenticated
using (bucket_id = 'event-snapshots' and private.can_delete_snapshot(name));

create function public.transfer_household_ownership(p_new_owner uuid) returns uuid
language sql security invoker set search_path = '' as $$ select private.transfer_household_ownership(p_new_owner); $$;
create function public.begin_account_cleanup() returns uuid
language sql security invoker set search_path = '' as $$ select private.begin_account_cleanup(); $$;
create function public.account_cleanup_prepared() returns boolean
language sql security invoker set search_path = '' as $$ select private.account_cleanup_prepared(); $$;
create function public.finish_account_cleanup() returns boolean
language sql security invoker set search_path = '' as $$ select private.finish_account_cleanup(); $$;
create function public.cancel_account_cleanup() returns void
language sql security invoker set search_path = '' as $$ select private.cancel_account_cleanup(); $$;

revoke all on function private.transfer_household_ownership(uuid), private.begin_account_cleanup(),
  private.account_cleanup_prepared(), private.finish_account_cleanup(), private.cancel_account_cleanup(),
  private.can_delete_snapshot(text) from public;
revoke all on function public.transfer_household_ownership(uuid), public.begin_account_cleanup(),
  public.account_cleanup_prepared(), public.finish_account_cleanup(), public.cancel_account_cleanup()
  from public, anon;
grant execute on function private.transfer_household_ownership(uuid), private.begin_account_cleanup(),
  private.account_cleanup_prepared(), private.finish_account_cleanup(), private.cancel_account_cleanup(),
  private.can_delete_snapshot(text) to authenticated;
grant execute on function public.transfer_household_ownership(uuid), public.begin_account_cleanup(),
  public.account_cleanup_prepared(), public.finish_account_cleanup(), public.cancel_account_cleanup()
  to authenticated;

commit;
