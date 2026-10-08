import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  alice,
  asUser,
  bob,
  createHome,
  openDatabase,
  resetDatabase,
} from "./migration-test-utils";

const seed = readFileSync(new URL("../../../supabase/demo-seed.sql", import.meta.url), "utf8");
let db: PGlite;
beforeAll(async () => {
  db = await openDatabase();
}, 30_000);
beforeEach(resetDatabase);
afterAll(async () => {
  await db?.close();
});
async function seedAs(id: string) {
  await db.query("select set_config('halo.seed_user_id', $1, false)", [id]);
  try {
    await db.exec(seed);
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

it("reuses an owner's household, safely repeats seed data, and keeps fixtures private", async () => {
  const home = await createHome(alice);
  await seedAs(alice);
  await seedAs(alice);
  expect((await db.query("select id, name from public.households")).rows).toEqual([
    { id: home, name: "Home" },
  ]);
  expect((await db.query("select id from public.devices")).rows).toHaveLength(2);
  expect((await db.query("select id from public.events")).rows).toHaveLength(2);
  expect((await db.query("select id from public.watched_people")).rows).toHaveLength(1);
  expect((await db.query("select device_id from private.device_tokens")).rows).toHaveLength(0);
  expect((await asUser(bob, () => db.query("select id from public.events"))).rows).toEqual([]);
});

it("requires a real account and refuses seeding somebody else's household", async () => {
  await expect(seedAs("")).rejects.toThrow(/existing auth user/);
  await expect(seedAs("00000000-0000-4000-8000-000000000099")).rejects.toThrow(
    /existing auth user/,
  );
  const home = await createHome(alice);
  await db.query(
    "insert into public.household_members(household_id, user_id, role) values ($1, $2, 'caregiver')",
    [home, bob],
  );
  await expect(seedAs(bob)).rejects.toThrow(/owner access/);
  expect((await db.query("select id from public.devices")).rows).toEqual([]);
  expect((await db.query("select id from auth.users")).rows).toHaveLength(3);
});
