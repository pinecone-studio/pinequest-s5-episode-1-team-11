import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  alice,
  asUser,
  bob,
  createHome,
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

async function addEvent(home: string) {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.events(household_id, kind, severity, room_name) values ($1, 'fall', 'critical', 'Hall') returning id",
    [home],
  );
  return rows[0].id;
}

describe("event response RLS", () => {
  it("prevents acknowledgement and false-alarm writes to another household", async () => {
    await createHome(alice);
    const other = await createHome(bob);
    const id = await addEvent(other);

    await asUser(alice, async () => {
      for (const status of ["acknowledged", "false_alarm"]) {
        const { rows } = await db.query(
          "update public.events set status = $1, acknowledged_by = $2, acknowledged_at = now() where id = $3 returning id",
          [status, alice, id],
        );
        expect(rows).toEqual([]);
      }
    });
    expect((await db.query("select status from public.events where id = $1", [id])).rows).toEqual([
      { status: "new" },
    ]);
  });

  it("allows a member's own response but forbids impersonating another responder", async () => {
    const home = await createHome(alice);
    const id = await addEvent(home);
    await asUser(alice, async () => {
      await expect(
        db.query(
          "update public.events set status = 'acknowledged', acknowledged_by = $1 where id = $2",
          [bob, id],
        ),
      ).rejects.toThrow(/row-level security/);
      const { rows } = await db.query(
        "update public.events set status = 'acknowledged', acknowledged_by = $1, acknowledged_at = now() where id = $2 returning status, acknowledged_by",
        [alice, id],
      );
      expect(rows).toEqual([{ status: "acknowledged", acknowledged_by: alice }]);
    });
  });
});
