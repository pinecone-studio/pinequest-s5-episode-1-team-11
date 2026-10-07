begin;

-- Definer lookups avoid recursive RLS on household_members. Only boolean results leave private.
create function private.is_household_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members
    where household_id = target and user_id = (select auth.uid()));
$$;
create function private.is_household_owner(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.households
    where id = target and owner_id = (select auth.uid()));
$$;
create function private.shares_household(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members me
    join public.household_members other using (household_id)
    where me.user_id = (select auth.uid()) and other.user_id = target);
$$;
create function private.can_read_snapshot(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members
    where household_id::text = split_part(path, '/', 1) and user_id = (select auth.uid()));
$$;
revoke all on function private.is_household_member(uuid), private.is_household_owner(uuid),
  private.shares_household(uuid), private.can_read_snapshot(text) from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_household_member(uuid), private.is_household_owner(uuid),
  private.shares_household(uuid), private.can_read_snapshot(text) to authenticated;

grant select on public.profiles, public.households, public.household_members,
  public.watched_people, public.devices, public.pairing_codes, public.household_invites,
  public.events, public.push_subscriptions to authenticated;
grant update (name) on public.profiles, public.households to authenticated;
grant insert, delete on public.watched_people to authenticated;
grant update (name, kind, age, notes, emergency_phone) on public.watched_people to authenticated;
grant update (name, room_name, settings) on public.devices to authenticated;
grant delete on public.devices to authenticated;
grant update (status, acknowledged_by, acknowledged_at, note) on public.events to authenticated;
grant insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.profiles, public.households, public.household_members, public.watched_people,
  public.devices, public.pairing_codes, public.household_invites, public.events,
  public.push_subscriptions, private.device_tokens to service_role;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.shares_household(id));
create policy profiles_edit on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy households_read on public.households for select to authenticated
using (private.is_household_member(id));
create policy households_edit on public.households for update to authenticated
using (private.is_household_owner(id)) with check (private.is_household_owner(id));
create policy members_read on public.household_members for select to authenticated
using (private.is_household_member(household_id));
create policy watched_read on public.watched_people for select to authenticated
using (private.is_household_member(household_id));
create policy watched_add on public.watched_people for insert to authenticated
with check (private.is_household_member(household_id));
create policy watched_edit on public.watched_people for update to authenticated
using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy watched_remove on public.watched_people for delete to authenticated
using (private.is_household_member(household_id));
create policy devices_read on public.devices for select to authenticated
using (private.is_household_member(household_id));
create policy devices_edit on public.devices for update to authenticated
using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy devices_remove on public.devices for delete to authenticated
using (private.is_household_member(household_id));
create policy pairing_read on public.pairing_codes for select to authenticated
using (private.is_household_member(household_id));
create policy invites_read on public.household_invites for select to authenticated
using (private.is_household_owner(household_id));
create policy events_read on public.events for select to authenticated
using (private.is_household_member(household_id));
create policy events_edit on public.events for update to authenticated
using (private.is_household_member(household_id))
with check (private.is_household_member(household_id) and
  (acknowledged_by is null or acknowledged_by = (select auth.uid())));
create policy subscriptions_own on public.push_subscriptions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('event-snapshots', 'event-snapshots', false, 1500000, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Uploads go through the device API with its server-only key; clients only request signed reads.
create policy household_snapshots_read on storage.objects for select to authenticated
using (bucket_id = 'event-snapshots' and private.can_read_snapshot(name));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'events') then
      alter publication supabase_realtime add table public.events;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'devices') then
      alter publication supabase_realtime add table public.devices;
    end if;
  end if;
end;
$$;

commit;
