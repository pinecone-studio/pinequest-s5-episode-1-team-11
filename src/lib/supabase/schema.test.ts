import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addDevice,
  alice,
  bob,
  createHome,
  device,
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
describe("schema constraints", () => {
  it("enables RLS on all nine application tables before granting access", async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class join pg_namespace n on n.oid = relnamespace where n.nspname = 'public' and relkind = 'r'",
    );
    expect(rows).toHaveLength(9);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
  });
  it("rejects events attached to another household's camera and invalid confidence", async () => {
    const own = await createHome(alice);
    const other = await createHome(bob);
    await addDevice(other);
    await expect(
      db.query(
        "insert into public.events(household_id, device_id, kind, severity, room_name) values ($1, $2, 'fall', 'critical', 'Room')",
        [own, device],
      ),
    ).rejects.toThrow(/foreign key/);
    await expect(
      db.query(
        "insert into public.events(household_id, kind, severity, room_name, confidence) values ($1, 'fall', 'critical', 'Room', 1.1)",
        [own],
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("rejects null or missing detection settings", async () => {
    const home = await createHome(alice);
    for (const settings of [
      {},
      { watching: null, sensitivity: "medium", fall: true, distress: true, hazard: true },
    ]) {
      await expect(
        db.query(
          "insert into public.devices(household_id, name, room_name, kind, settings) values ($1, 'Phone', 'Room', 'phone', $2)",
          [home, settings],
        ),
      ).rejects.toThrow(/check constraint/);
    }
  });
});
