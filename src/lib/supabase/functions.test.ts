import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { alice, asUser, bob, carol, openDatabase, resetDatabase } from "./migration-test-utils";

let db: PGlite;
beforeAll(async () => {
  db = await openDatabase();
}, 30_000);
beforeEach(resetDatabase);
afterAll(async () => {
  await db?.close();
});
async function createHome(id: string) {
  return asUser(id, async () => {
    const { rows } = await db.query<{ id: string }>("select public.create_household('Home') as id");
    return rows[0].id;
  });
}
describe("household and pairing RPCs", () => {
  it("enables RLS on every application table and rejects anonymous RPC calls", async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class join pg_namespace n on n.oid = relnamespace where n.nspname = 'public' and relkind = 'r'",
    );
    expect(rows).toHaveLength(9);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
    await db.exec("set role anon");
    try {
      await expect(db.query("select public.create_household('Intruder')")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec("reset role");
    }
  });

  it("creates an owner membership atomically and makes household creation idempotent", async () => {
    const home = await createHome(alice);
    expect(await createHome(alice)).toBe(home);
    const { rows } = await asUser(alice, () =>
      db.query<{ role: string }>("select role from public.household_members"),
    );
    expect(rows).toEqual([{ role: "owner" }]);
    await asUser(alice, () =>
      expect(
        db.query("insert into public.household_members values ($1, $2, 'owner', now())", [
          home,
          bob,
        ]),
      ).rejects.toThrow(/permission denied/),
    );
  });

  it("issues unique six-digit pairing codes with ten-minute expiry and a bounded active count", async () => {
    await createHome(alice);
    const codes = new Set<string>();
    await asUser(alice, async () => {
      for (let i = 0; i < 5; i++) {
        const { rows } = await db.query<{ code: string; expires_at: Date; device_id: null }>(
          "select * from public.create_pairing('Phone', 'Room')",
        );
        expect(rows[0].code).toMatch(/^\d{6}$/);
        expect(new Date(rows[0].expires_at).getTime() - Date.now()).toBeGreaterThan(590_000);
        expect(rows[0].device_id).toBeNull();
        codes.add(rows[0].code);
      }
      expect(codes.size).toBe(5);
      await expect(
        db.query("select * from public.create_pairing('Phone', 'Room')"),
      ).rejects.toThrow(/Too many/);
    });
  });

  it("accepts a one-use invite as caregiver and safely retries the same user's acceptance", async () => {
    const home = await createHome(alice);
    const { rows } = await asUser(alice, () =>
      db.query<{ code: string }>("select * from public.create_invite()"),
    );
    const code = rows[0].code;
    await asUser(bob, async () => {
      expect(
        (await db.query<{ id: string }>("select public.accept_invite($1) as id", [code])).rows,
      ).toEqual([{ id: home }]);
      expect(
        (await db.query<{ id: string }>("select public.accept_invite($1) as id", [code])).rows,
      ).toEqual([{ id: home }]);
      expect(
        (
          await db.query<{ role: string }>(
            "select role from public.household_members where user_id = $1",
            [bob],
          )
        ).rows,
      ).toEqual([{ role: "caregiver" }]);
      await expect(db.query("select * from public.create_invite()")).rejects.toThrow(
        /Owner access/,
      );
    });
    await asUser(carol, () =>
      expect(db.query("select public.accept_invite($1)", [code])).rejects.toThrow(/already used/),
    );
  });

  it("rejects expired invitations and joining a second household", async () => {
    await createHome(alice);
    await createHome(bob);
    const { rows } = await asUser(alice, () =>
      db.query<{ code: string }>("select * from public.create_invite()"),
    );
    const code = rows[0].code;
    await asUser(bob, () =>
      expect(db.query("select public.accept_invite($1)", [code])).rejects.toThrow(
        /already belongs/,
      ),
    );
    await db.query(
      "update public.household_invites set expires_at = now() - interval '1 second' where code = $1",
      [code],
    );
    await asUser(carol, () =>
      expect(db.query("select public.accept_invite($1)", [code])).rejects.toThrow(/expired/),
    );
  });

  it("deletes only the caller and rejects deleting a shared household owner", async () => {
    const home = await createHome(alice);
    await db.query("insert into auth.sessions(user_id) values ($1)", [alice]);
    await asUser(alice, () => db.query("select public.delete_my_account()"));
    expect((await db.query("select id from public.households where id = $1", [home])).rows).toEqual(
      [],
    );
    expect(
      (await db.query("select id from auth.sessions where user_id = $1", [alice])).rows,
    ).toEqual([]);
    expect((await db.query("select id from auth.users")).rows).toHaveLength(2);
    await createHome(bob);
    const { rows } = await asUser(bob, () =>
      db.query<{ code: string }>("select * from public.create_invite()"),
    );
    await asUser(carol, () => db.query("select public.accept_invite($1)", [rows[0].code]));
    await asUser(bob, () =>
      expect(db.query("select public.delete_my_account()")).rejects.toThrow(/Transfer household/),
    );
  });
});
