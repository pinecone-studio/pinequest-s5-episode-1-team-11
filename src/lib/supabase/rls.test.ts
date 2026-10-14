import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addDevice,
  alice,
  asUser,
  bob,
  createHome,
  openDatabase,
  resetDatabase,
} from "./migration-test-utils";

let db: PGlite;
beforeAll(async () => {
  db = await openDatabase();
}, 30_000);
beforeEach(resetDatabase);
afterAll(async () => {
  await db?.close();
});
describe("household access policies", () => {
  it("isolates household reads and writes and does not expose device tokens", async () => {
    const own = await createHome(alice);
    const other = await createHome(bob);
    await addDevice(other);
    await asUser(alice, async () => {
      expect((await db.query("select * from public.devices")).rows).toEqual([]);
      expect((await db.query<{ id: string }>("select id from public.households")).rows).toEqual([
        { id: own },
      ]);
      expect((await db.query<{ id: string }>("select id from public.profiles")).rows).toEqual([
        { id: alice },
      ]);
      expect(
        (await db.query("update public.devices set name = 'Stolen' returning id")).rows,
      ).toEqual([]);
      await expect(db.query("select * from private.device_tokens")).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.query("update public.households set owner_id = $1", [alice])).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it("keeps push subscriptions private to their owner", async () => {
    await asUser(alice, () =>
      db.query(
        "insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/alice', 'key', 'secret')",
        [alice],
      ),
    );
    await asUser(bob, async () => {
      expect((await db.query("select * from public.push_subscriptions")).rows).toEqual([]);
      await expect(
        db.query(
          "insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/stolen', 'key', 'secret')",
          [alice],
        ),
      ).rejects.toThrow(/row-level security/);
    });
    await asUser(alice, () =>
      expect(db.query("update public.push_subscriptions set user_id = $1", [bob])).rejects.toThrow(
        /row-level security/,
      ),
    );
  });

  it("keeps app push tokens private and lets a phone move to the account that signed in", async () => {
    const token = "ExponentPushToken[phone]";
    await asUser(alice, () => db.query("select public.register_expo_push_token($1)", [token]));
    await asUser(bob, async () => {
      expect((await db.query("select * from public.expo_push_tokens")).rows).toEqual([]);
      await expect(
        db.query(
          "insert into public.expo_push_tokens(token, user_id) values ('ExponentPushToken[x]', $1)",
          [bob],
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("select public.register_expo_push_token('not-a-token')"),
      ).rejects.toThrow(/check constraint/);
      await db.query("select public.register_expo_push_token($1)", [token]);
    });
    const { rows } = await db.query<{ user_id: string }>(
      "select user_id from public.expo_push_tokens",
    );
    expect(rows).toEqual([{ user_id: bob }]);
  });

  it("only exposes snapshots from the caller's household, including malformed paths", async () => {
    const own = await createHome(alice);
    const other = await createHome(bob);
    for (const name of [`${own}/photo.jpg`, `${other}/private.jpg`, "invalid/path.jpg"]) {
      await db.query(
        "insert into storage.objects(bucket_id, name) values ('event-snapshots', $1)",
        [name],
      );
    }
    const { rows } = await asUser(alice, () =>
      db.query<{ name: string }>("select name from storage.objects"),
    );
    expect(rows).toEqual([{ name: `${own}/photo.jpg` }]);
  });
});
