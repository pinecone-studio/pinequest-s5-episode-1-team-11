import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

export const alice = "00000000-0000-4000-8000-000000000001";
export const bob = "00000000-0000-4000-8000-000000000002";
export const carol = "00000000-0000-4000-8000-000000000003";
export const device = "00000000-0000-4000-8000-0000000000d1";
let db: PGlite;

// Supabase owns auth/storage. Supply their relevant public shape, then execute our SQL unchanged.
export async function openDatabase() {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant select, insert, update, delete on storage.objects to authenticated;
  `);
  const dir = new URL("../../../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
  return db;
}

export async function resetDatabase() {
  await db.exec("reset role; truncate auth.users, storage.objects cascade;");
  for (const [id, name] of [
    [alice, "Alice"],
    [bob, "Bob"],
    [carol, "Carol"],
  ]) {
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $2)", [
      id,
      { name },
    ]);
  }
}
export async function asUser<T>(id: string, operation: () => Promise<T>) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}
export async function createHome(id: string) {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.households(name, owner_id) values ('Home', $1) returning id",
    [id],
  );
  await db.query(
    "insert into public.household_members(household_id, user_id, role) values ($1, $2, 'owner')",
    [rows[0].id, id],
  );
  return rows[0].id;
}
export async function addDevice(home: string) {
  await db.query(
    "insert into public.devices(id, household_id, name, room_name, kind) values ($1, $2, 'Phone', 'Room', 'phone')",
    [device, home],
  );
}
