begin;

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index households_owner_id_idx on public.households(owner_id);

-- MVP: one household per account. This makes all feature queries unambiguous.
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'caregiver')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.watched_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind text not null check (kind in ('child', 'elderly', 'disabled')),
  age integer check (age between 0 and 130),
  notes text check (char_length(notes) <= 300),
  emergency_phone text check (char_length(emergency_phone) <= 30),
  created_at timestamptz not null default now()
);
create index watched_people_household_id_idx on public.watched_people(household_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  room_name text not null check (char_length(btrim(room_name)) between 1 and 60),
  kind text not null check (kind in ('phone', 'laptop', 'ip_camera')),
  status text not null default 'pairing' check (status in ('online', 'offline', 'pairing')),
  last_seen_at timestamptz,
  settings jsonb not null default '{"watching":"elderly","sensitivity":"medium","fall":true,"distress":true,"hazard":true}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  check ((
    settings->>'watching' in ('child', 'elderly', 'disabled') and
    settings->>'sensitivity' in ('low', 'medium', 'high') and
    jsonb_typeof(settings->'fall') = 'boolean' and
    jsonb_typeof(settings->'distress') = 'boolean' and
    jsonb_typeof(settings->'hazard') = 'boolean' and
    settings ?& array['watching', 'sensitivity', 'fall', 'distress', 'hazard']
  ) is true)
);
create index devices_household_id_idx on public.devices(household_id);
create index devices_online_last_seen_idx on public.devices(last_seen_at) where status = 'online';

-- Device bearer tokens are hashed by the API. They are never exposed by the Data API.
create table private.device_tokens (
  device_id uuid primary key references public.devices(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table private.device_tokens enable row level security;

create table public.pairing_codes (
  code text primary key check (code ~ '^[0-9]{6}$'),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  room_name text not null check (char_length(btrim(room_name)) between 1 and 60),
  kind text not null default 'phone' check (kind in ('phone', 'laptop', 'ip_camera')),
  expires_at timestamptz not null default now() + interval '10 minutes',
  device_id uuid references public.devices(id) on delete set null,
  created_at timestamptz not null default now()
);
create index pairing_codes_household_id_idx on public.pairing_codes(household_id);
create index pairing_codes_expires_at_idx on public.pairing_codes(expires_at);

create table public.household_invites (
  code text primary key default replace(gen_random_uuid()::text, '-', ''),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '24 hours',
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(code) >= 16)
);
create index household_invites_household_id_idx on public.household_invites(household_id);
create index household_invites_invited_by_idx on public.household_invites(invited_by);
create index household_invites_accepted_by_idx on public.household_invites(accepted_by);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  device_id uuid,
  idempotency_key text,
  kind text not null check (kind in ('fall', 'scream', 'cry', 'glass', 'alarm', 'offline', 'test')),
  severity text not null check (severity in ('critical', 'warning', 'info')),
  status text not null default 'new' check (status in ('new', 'acknowledged', 'false_alarm', 'resolved')),
  confidence double precision check (confidence between 0 and 1),
  person_name text check (char_length(person_name) <= 80),
  room_name text not null,
  occurred_at timestamptz not null default now(),
  notified_at timestamptz,
  snapshot_path text,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (device_id, idempotency_key),
  foreign key (device_id, household_id) references public.devices(id, household_id) on delete set null (device_id),
  check (snapshot_path is null or split_part(snapshot_path, '/', 1) = household_id::text)
);
create index events_household_occurred_at_idx on public.events(household_id, occurred_at desc);
create index events_device_id_idx on public.events(device_id);
create index events_acknowledged_by_idx on public.events(acknowledged_by);
create index events_new_idx on public.events(household_id, occurred_at desc) where status = 'new';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- New tables deny client access until the next migration grants precise policies.
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.watched_people enable row level security;
alter table public.devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.household_invites enable row level security;
alter table public.events enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on public.profiles, public.households, public.household_members,
  public.watched_people, public.devices, public.pairing_codes,
  public.household_invites, public.events, public.push_subscriptions from anon, authenticated;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'), 60), ''), 'Halo'));
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Existing auth accounts also receive a profile when applying this migration.
insert into public.profiles(id, name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data->>'name'), 60), ''), 'Halo') from auth.users
on conflict (id) do nothing;

commit;
