-- Native push tokens of the mobile app (Expo). Browser Web Push stays in push_subscriptions.
create table public.expo_push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index expo_push_tokens_user_id_idx on public.expo_push_tokens(user_id);
alter table public.expo_push_tokens enable row level security;
revoke all on public.expo_push_tokens from anon, authenticated;
grant select, delete on public.expo_push_tokens to authenticated;
grant all on public.expo_push_tokens to service_role;
create policy expo_push_tokens_own on public.expo_push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A phone that signs in with another account takes its token over; RLS cannot move another
-- user's row, so registration goes through this function.
create function public.register_expo_push_token(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  insert into public.expo_push_tokens(token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, created_at = now();
end;
$$;
revoke all on function public.register_expo_push_token(text) from public, anon;
grant execute on function public.register_expo_push_token(text) to authenticated;
