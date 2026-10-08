import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { alice, asUser, createHome, openDatabase, resetDatabase } from "./migration-test-utils";

let db: PGlite;
const client = "a".repeat(64);
const tokenHash = "b".repeat(64);
beforeAll(async () => {
  db = await openDatabase();
}, 30_000);
beforeEach(async () => {
  await resetDatabase();
  await db.exec("delete from private.pairing_attempts");
});
afterAll(async () => {
  await db?.close();
});

async function asService<T>(operation: () => Promise<T>) {
  await db.exec("set role service_role");
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}
async function newCode() {
  await createHome(alice);
  const { rows } = await asUser(alice, () =>
    db.query<{ code: string }>(
      "select code from public.create_pairing('Kitchen phone', 'Kitchen')",
    ),
  );
  return rows[0].code;
}
type Claim = { status: string; device_id: string | null; name: string | null };
function claim(code: string, hash = tokenHash, from = client) {
  return asService(async () => {
    const { rows } = await db.query<Claim>(
      "select * from public.claim_pairing($1, 'laptop', $2, $3)",
      [code, hash, from],
    );
    return rows[0];
  });
}

describe("device API functions", () => {
  it("pairs a camera once and stores only the token hash", async () => {
    const code = await newCode();
    const first = await claim(code);
    expect(first).toMatchObject({ status: "paired", name: "Kitchen phone" });
    expect((await claim(code, "c".repeat(64))).status).toBe("invalid");
    const { rows } = await db.query<{ kind: string; status: string; token_hash: string }>(
      "select d.kind, d.status, t.token_hash from public.devices d join private.device_tokens t on t.device_id = d.id",
    );
    expect(rows).toEqual([{ kind: "laptop", status: "online", token_hash: tokenHash }]);
  });

  it("rejects expired codes and limits guessing per client", async () => {
    const code = await newCode();
    await db.query("update public.pairing_codes set expires_at = now() - interval '1 second'");
    expect((await claim(code)).status).toBe("invalid");
    for (let i = 0; i < 9; i++) await claim("000000");
    expect((await claim("000000")).status).toBe("limited");
    expect((await claim("000000", tokenHash, "d".repeat(64))).status).toBe("invalid");
  });

  it("authenticates by token hash, marks the device seen, and is closed to users", async () => {
    const code = await newCode();
    const { device_id } = await claim(code);
    await db.query(
      "update public.devices set status = 'offline', last_seen_at = now() - interval '1 hour'",
    );
    const devices = await asService(
      async () =>
        (
          await db.query<{ id: string; status: string }>(
            "select id, status from public.authenticate_device($1)",
            [tokenHash],
          )
        ).rows,
    );
    expect(devices).toEqual([{ id: device_id, status: "online" }]);
    await db.query("update private.device_tokens set revoked_at = now()");
    expect(
      await asService(
        async () =>
          (await db.query("select * from public.authenticate_device($1)", [tokenHash])).rows,
      ),
    ).toEqual([]);
    await asUser(alice, async () => {
      await expect(
        db.query("select * from public.authenticate_device($1)", [tokenHash]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("select * from public.claim_pairing($1, 'phone', $2, $3)", [
          code,
          tokenHash,
          client,
        ]),
      ).rejects.toThrow(/permission denied/);
    });
  });
});

describe("offline devices", () => {
  it("records one offline event per camera that stopped sending heartbeats", async () => {
    const home = await createHome(alice);
    await db.query(
      `insert into public.devices(household_id, name, room_name, kind, status, last_seen_at) values
        ($1, 'Stale', 'Kitchen', 'phone', 'online', now() - interval '5 minutes'),
        ($1, 'Fresh', 'Hall', 'phone', 'online', now()),
        ($1, 'Already', 'Bedroom', 'phone', 'offline', now() - interval '1 hour')`,
      [home],
    );
    const mark = () =>
      asService(
        async () =>
          (
            await db.query<{ kind: string; room_name: string; severity: string }>(
              "select kind, room_name, severity from public.mark_offline_devices()",
            )
          ).rows,
      );
    expect(await mark()).toEqual([{ kind: "offline", room_name: "Kitchen", severity: "info" }]);
    expect(await mark()).toEqual([]);
    await asUser(alice, () =>
      expect(db.query("select * from public.mark_offline_devices()")).rejects.toThrow(
        /permission denied/,
      ),
    );
  });
});
