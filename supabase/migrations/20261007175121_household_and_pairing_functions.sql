begin;

create function private.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result uuid;
begin
  perform 1 from public.profiles where id = caller for update;
  if not found then raise exception 'Authentication required' using errcode = '42501'; end if;
  select household_id into result from public.household_members where user_id = caller;
  if result is not null then return result; end if;
  insert into public.households(name, owner_id) values (btrim(p_name), caller) returning id into result;
  insert into public.household_members(household_id, user_id, role) values (result, caller, 'owner');
  return result;
end;
$$;

create function private.create_pairing(p_name text, p_room_name text, p_kind text)
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
  if (select count(*) from public.pairing_codes p where p.household_id = home
    and p.expires_at > now() and p.device_id is null) >= 5 then
    raise exception 'Too many active pairing codes';
  end if;
  for attempt in 1..10 loop
    -- The first 32 bits of a cryptographically random UUID are all random bits.
    generated_code := lpad(((('x' || left(gen_random_uuid()::text, 8))::bit(32)::bigint % 1000000)::text), 6, '0');
    begin
      insert into public.pairing_codes(code, household_id, name, room_name, kind, expires_at)
      values (generated_code, home, btrim(p_name), btrim(p_room_name), p_kind, expiry);
      return query select generated_code, expiry, null::uuid;
      return;
    exception when unique_violation then
      -- A code can collide with another household; generate a fresh one.
    end;
  end loop;
  raise exception 'Could not allocate a pairing code';
end;
$$;

create function private.create_invite() returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare home uuid;
begin
  select h.id into home from public.households h where h.owner_id = (select auth.uid()) for update;
  if home is null then raise exception 'Owner access required' using errcode = '42501'; end if;
  if (select count(*) from public.household_invites i where i.household_id = home
    and i.expires_at > now() and i.accepted_at is null) >= 10 then
    raise exception 'Too many active invites';
  end if;
  return query insert into public.household_invites(household_id, invited_by)
    values (home, auth.uid()) returning household_invites.code, household_invites.expires_at;
end;
$$;

create function private.get_invite(p_code text)
returns table (code text, household_name text, invited_by text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.code, h.name, p.name, i.expires_at from public.household_invites i
  join public.households h on h.id = i.household_id
  join public.profiles p on p.id = i.invited_by
  where i.code = p_code and i.expires_at > now() and i.accepted_at is null
    and exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

create function private.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  invitation public.household_invites;
  current_home uuid;
begin
  perform 1 from public.profiles where id = caller for update;
  if not found then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into invitation from public.household_invites where code = p_code for update;
  if not found then raise exception 'Invalid invite'; end if;
  if invitation.accepted_by = caller then return invitation.household_id; end if;
  if invitation.expires_at <= now() or invitation.accepted_at is not null then
    raise exception 'Invite expired or already used';
  end if;
  select household_id into current_home from public.household_members where user_id = caller;
  if current_home is not null and current_home <> invitation.household_id then
    raise exception 'Account already belongs to a household';
  end if;
  insert into public.household_members(household_id, user_id, role)
    values (invitation.household_id, caller, 'caregiver') on conflict (user_id) do nothing;
  update public.household_invites set accepted_by = caller, accepted_at = now() where code = p_code;
  return invitation.household_id;
end;
$$;

create function private.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  perform 1 from public.profiles where id = caller for update;
  if not found then raise exception 'Authentication required' using errcode = '42501'; end if;
  if exists (select 1 from public.households h join public.household_members m on m.household_id = h.id
    where h.owner_id = caller and m.user_id <> caller) then
    raise exception 'Transfer household ownership before deleting the account';
  end if;
  -- Storage files must be removed through the Storage API, not by deleting metadata rows.
  if exists (select 1 from storage.objects o join public.households h
    on h.id::text = split_part(o.name, '/', 1)
    where o.bucket_id = 'event-snapshots' and h.owner_id = caller) then
    raise exception 'Remove household snapshots through the Storage API first';
  end if;
  delete from auth.sessions where user_id = caller;
  delete from auth.users where id = caller;
end;
$$;

-- Public RPC wrappers use invoker security; privileged implementations stay out of the Data API.
create function public.create_household(p_name text) returns uuid
language sql security invoker set search_path = '' as $$ select private.create_household(p_name); $$;
create function public.create_pairing(p_name text, p_room_name text, p_kind text default 'phone')
returns table (code text, expires_at timestamptz, device_id uuid)
language sql security invoker set search_path = '' as $$ select * from private.create_pairing(p_name, p_room_name, p_kind); $$;
create function public.create_invite() returns table (code text, expires_at timestamptz)
language sql security invoker set search_path = '' as $$ select * from private.create_invite(); $$;
create function public.get_invite(p_code text)
returns table (code text, household_name text, invited_by text, expires_at timestamptz)
language sql security invoker set search_path = '' as $$ select * from private.get_invite(p_code); $$;
create function public.accept_invite(p_code text) returns uuid
language sql security invoker set search_path = '' as $$ select private.accept_invite(p_code); $$;
create function public.delete_my_account() returns void
language sql security invoker set search_path = '' as $$ select private.delete_my_account(); $$;

revoke all on function private.create_household(text), private.create_pairing(text,text,text),
  private.create_invite(), private.get_invite(text), private.accept_invite(text), private.delete_my_account() from public;
revoke all on function public.create_household(text), public.create_pairing(text,text,text),
  public.create_invite(), public.get_invite(text), public.accept_invite(text), public.delete_my_account() from public;
grant execute on function private.create_household(text), private.create_pairing(text,text,text),
  private.create_invite(), private.get_invite(text), private.accept_invite(text), private.delete_my_account() to authenticated;
grant execute on function public.create_household(text), public.create_pairing(text,text,text),
  public.create_invite(), public.get_invite(text), public.accept_invite(text), public.delete_my_account() to authenticated;

commit;
