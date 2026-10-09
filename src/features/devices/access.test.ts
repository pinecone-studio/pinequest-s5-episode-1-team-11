import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import {
  addDevice,
  alice,
  asUser,
  bob,
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

describe("device settings and removal against the checked-in database", () => {
  it("rejects stale renamed drafts while preserving another caregiver's detection choices", async () => {
    const home = await createHome(alice);
    await addDevice(home);
    const remote = { ...defaultDetectionSettings, fall: false };
    await db.query("update public.devices set settings = $1 where id = $2", [remote, device]);
    await asUser(alice, async () => {
      const stale = await db.query(
        "update public.devices set name = 'Nursery', settings = $1 where id = $2 and household_id = $3 and name = 'Phone' and room_name = 'Room' and settings = $4 returning id",
        [defaultDetectionSettings, device, home, defaultDetectionSettings],
      );
      expect(stale.rows).toEqual([]);
      const { rows } = await db.query<{ name: string; settings: unknown }>(
        "select name, settings from public.devices where id = $1",
        [device],
      );
      expect(rows).toEqual([{ name: "Phone", settings: remote }]);
      const refreshed = await db.query(
        "update public.devices set name = 'Nursery' where id = $1 and household_id = $2 and name = 'Phone' and room_name = 'Room' and settings = $3 returning name, settings",
        [device, home, remote],
      );
      expect(refreshed.rows).toEqual([{ name: "Nursery", settings: remote }]);
    });
  });

  it("allows a household member to save detection settings and denies another household", async () => {
    const home = await createHome(alice);
    await createHome(bob);
    await addDevice(home);
    const settings = { ...defaultDetectionSettings, watching: "child", hazard: false };
    await asUser(alice, async () => {
      const { rows } = await db.query<{ settings: unknown }>(
        "update public.devices set name = 'Nursery', settings = $1 where id = $2 returning settings",
        [settings, device],
      );
      expect(rows).toEqual([{ settings }]);
    });
    await asUser(bob, async () => {
      expect(
        (
          await db.query("update public.devices set name = 'Stolen' where id = $1 returning id", [
            device,
          ])
        ).rows,
      ).toEqual([]);
      expect(
        (await db.query("delete from public.devices where id = $1 returning id", [device])).rows,
      ).toEqual([]);
    });
  });

  it("revokes the device token on removal while retaining event history", async () => {
    const home = await createHome(alice);
    await addDevice(home);
    await db.query("insert into private.device_tokens(device_id, token_hash) values ($1, $2)", [
      device,
      "a".repeat(64),
    ]);
    await db.query(
      "insert into public.events(household_id, device_id, kind, severity, room_name) values ($1, $2, 'fall', 'critical', 'Room')",
      [home, device],
    );
    await asUser(alice, async () => {
      expect(
        (await db.query("delete from public.devices where id = $1 returning id", [device])).rows,
      ).toEqual([{ id: device }]);
    });
    expect(
      (await db.query("select * from private.device_tokens where device_id = $1", [device])).rows,
    ).toEqual([]);
    expect(
      (await db.query("select device_id, kind from public.events where household_id = $1", [home]))
        .rows,
    ).toEqual([{ device_id: null, kind: "fall" }]);
  });
});
