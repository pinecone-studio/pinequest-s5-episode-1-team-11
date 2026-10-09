import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addDevice,
  alice,
  asUser,
  bob,
  carol,
  createHome,
  device,
  openDatabase,
  resetDatabase,
} from "@/lib/supabase/migration-test-utils";

let db: PGlite;
beforeAll(async () => {
  db = await openDatabase();
}, 30_000);
beforeEach(resetDatabase);
afterAll(async () => {
  await db?.close();
});

async function join(home: string, user = bob) {
  await db.query(
    "insert into public.household_members(household_id, user_id, role) values ($1, $2, 'caregiver')",
    [home, user],
  );
}

describe("account ownership and cleanup against the checked-in database", () => {
  it("transfers only to an existing caregiver, preserving their shared household after the old owner deletes", async () => {
    const home = await createHome(alice);
    await join(home);
    await addDevice(home);
    const { rows: invites } = await asUser(alice, () =>
      db.query<{ code: string }>("select * from public.create_invite()"),
    );
    await asUser(alice, async () => {
      await expect(
        db.query("select public.transfer_household_ownership($1)", [carol]),
      ).rejects.toThrow(/Existing caregiver required/);
      expect(
        (
          await db.query<{ id: string }>("select public.transfer_household_ownership($1) as id", [
            bob,
          ])
        ).rows,
      ).toEqual([{ id: home }]);
      await expect(db.query("select * from public.create_invite()")).rejects.toThrow(
        /Owner access/,
      );
    });
    expect(
      (await db.query("select owner_id from public.households where id = $1", [home])).rows,
    ).toEqual([{ owner_id: bob }]);
    expect(
      (await db.query("select user_id, role from public.household_members order by user_id")).rows,
    ).toEqual([
      { user_id: alice, role: "caregiver" },
      { user_id: bob, role: "owner" },
    ]);
    await asUser(carol, () =>
      expect(db.query("select public.accept_invite($1)", [invites[0].code])).rejects.toThrow(
        /expired/,
      ),
    );
    await asUser(bob, () => db.query("select * from public.create_invite()"));
    await asUser(alice, () => db.query("select public.delete_my_account()"));
    expect((await db.query("select id from public.households where id = $1", [home])).rows).toEqual(
      [{ id: home }],
    );
    expect((await db.query("select id from public.devices where id = $1", [device])).rows).toEqual([
      { id: device },
    ]);
  });

  it("denies anonymous and caregiver ownership changes without changing roles", async () => {
    const home = await createHome(alice);
    await join(home);
    await asUser(bob, () =>
      expect(db.query("select public.transfer_household_ownership($1)", [alice])).rejects.toThrow(
        /Owner access/,
      ),
    );
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select public.transfer_household_ownership($1)", [bob]),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
    expect((await db.query("select owner_id from public.households")).rows).toEqual([
      { owner_id: alice },
    ]);
  });

  it("refuses cleanup of another member's shared data", async () => {
    const home = await createHome(alice);
    await join(home);
    await db.query("insert into storage.objects(bucket_id, name) values ('event-snapshots', $1)", [
      `${home}/saved.jpg`,
    ]);
    await asUser(alice, () =>
      expect(db.query("select public.begin_account_cleanup()")).rejects.toThrow(
        /Transfer household/,
      ),
    );
    await asUser(bob, () =>
      expect(db.query("select public.begin_account_cleanup()")).rejects.toThrow(/Owner access/),
    );
    expect((await db.query("select name from storage.objects")).rows).toEqual([
      { name: `${home}/saved.jpg` },
    ]);
  });

  it("prepares cleanup idempotently, revokes cameras so late uploads are refused, and blocks new pairing", async () => {
    const home = await createHome(alice);
    await addDevice(home);
    await db.query("insert into private.device_tokens(device_id, token_hash) values ($1, $2)", [
      device,
      "a".repeat(64),
    ]);
    await asUser(alice, () => db.query("select * from public.create_pairing('Phone', 'Room')"));
    await asUser(alice, async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        expect((await db.query("select public.begin_account_cleanup() as id")).rows).toEqual([
          { id: home },
        ]);
      }
      expect((await db.query("select public.account_cleanup_prepared() as prepared")).rows).toEqual(
        [{ prepared: true }],
      );
      await expect(
        db.query("select * from public.create_pairing('New phone', 'Room')"),
      ).rejects.toThrow(/Account cleanup/);
    });
    expect(
      (await db.query("select revoked_at is not null as revoked from private.device_tokens")).rows,
    ).toEqual([{ revoked: true }]);
    expect((await db.query("select status from public.devices")).rows).toEqual([
      { status: "offline" },
    ]);
    expect(
      (await db.query("select expires_at <= now() as expired from public.pairing_codes")).rows,
    ).toEqual([{ expired: true }]);
    // Snapshots are uploaded only by the device API, which now rejects the revoked token.
    expect(
      (await db.query("select id from public.authenticate_device($1)", ["a".repeat(64)])).rows,
    ).toEqual([]);
  });

  it("restricts Storage deletion to the prepared sole owner's household and keeps incomplete cleanup blocked", async () => {
    const own = await createHome(alice);
    const other = await createHome(bob);
    for (const home of [own, other]) {
      await db.query(
        "insert into storage.objects(bucket_id, name) values ('event-snapshots', $1)",
        [`${home}/saved.jpg`],
      );
    }
    await asUser(alice, async () => {
      expect((await db.query("delete from storage.objects returning name")).rows).toEqual([]);
      await db.query("select public.begin_account_cleanup()");
      await expect(db.query("select public.finish_account_cleanup()")).rejects.toThrow(/snapshots/);
      await expect(db.query("select public.delete_my_account()")).rejects.toThrow(/snapshots/);
      // Model the database side of caller-scoped Storage API deletion; production uses .remove().
      expect((await db.query("delete from storage.objects returning name")).rows).toEqual([
        { name: `${own}/saved.jpg` },
      ]);
      expect((await db.query("select public.finish_account_cleanup() as finished")).rows).toEqual([
        { finished: true },
      ]);
      await db.query("select public.delete_my_account()");
    });
    expect((await db.query("select name from storage.objects")).rows).toEqual([
      { name: `${other}/saved.jpg` },
    ]);
    expect((await db.query("select owner_id from public.households")).rows).toEqual([
      { owner_id: bob },
    ]);
    expect((await db.query("select id from public.households where id = $1", [own])).rows).toEqual(
      [],
    );
  });

  it("clears snapshot references only after files are absent and can resume a retained account", async () => {
    const home = await createHome(alice);
    await addDevice(home);
    await db.query(
      "insert into public.events(household_id, kind, severity, room_name, snapshot_path) values ($1, 'fall', 'critical', 'Room', $2)",
      [home, `${home}/saved.jpg`],
    );
    await asUser(alice, async () => {
      await db.query("select public.begin_account_cleanup()");
      await db.query("select public.finish_account_cleanup()");
      expect((await db.query("select snapshot_path, kind from public.events")).rows).toEqual([
        { snapshot_path: null, kind: "fall" },
      ]);
      await db.query("select public.cancel_account_cleanup()");
      expect((await db.query("select public.account_cleanup_prepared() as prepared")).rows).toEqual(
        [{ prepared: false }],
      );
      await db.query("select * from public.create_pairing('Re-pair phone', 'Room')");
    });
  });
});
