import { readFileSync } from "node:fs";
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

  it("cannot reuse a consumed pairing code after removing its camera", async () => {
    const code = await newCode();
    const paired = await claim(code);
    expect(paired.status).toBe("paired");
    await db.query("delete from public.devices where id = $1", [paired.device_id]);

    expect(
      await asService(
        async () =>
          (await db.query("select * from public.authenticate_device($1)", [tokenHash])).rows,
      ),
    ).toEqual([]);
    expect((await claim(code, "c".repeat(64))).status).toBe("invalid");
    expect((await db.query("select id from public.devices")).rows).toEqual([]);
  });

  it("retires ambiguous legacy codes during upgrade and accepts newly issued codes", async () => {
    const removedCode = await newCode();
    const paired = await claim(removedCode);
    await db.query("delete from public.devices where id = $1", [paired.device_id]);
    // Before this migration, deleting a device left its used code active with no reference.
    await db.query(
      "update public.pairing_codes set expires_at = now() + interval '10 minutes' where code = $1",
      [removedCode],
    );
    const pending = await asUser(alice, () =>
      db.query<{ code: string }>("select code from public.create_pairing('Phone', 'Hall')"),
    );

    await db.exec(
      readFileSync(
        new URL(
          "../../../supabase/migrations/20261008161528_consume_pairing_codes_once.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );

    expect((await claim(removedCode)).status).toBe("invalid");
    expect((await claim(pending.rows[0].code)).status).toBe("invalid");
    const fresh = await asUser(alice, () =>
      db.query<{ code: string }>("select code from public.create_pairing('New phone', 'Hall')"),
    );
    expect((await claim(fresh.rows[0].code)).status).toBe("paired");
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

describe("atomic ingest and push delivery queue", () => {
  async function camera() {
    const home = await createHome(alice);
    const { rows } = await db.query<{ id: string }>(
      "insert into public.devices(household_id, name, room_name, kind, status) values ($1, 'Cam', 'Hall', 'phone', 'online') returning id",
      [home],
    );
    return { home, id: rows[0].id };
  }
  const ingest = (deviceId: string, key: string) =>
    asService(
      async () =>
        (
          await db.query<{ status: string; event_id: string | null }>(
            "select * from public.ingest_event($1, $2, 'fall', 'critical', 0.9, now(), null)",
            [deviceId, key],
          )
        ).rows[0],
    );

  it("creates one event per key, queues its push and rate-limits a camera", async () => {
    const { id } = await camera();
    const first = await ingest(id, "key-0001");
    expect(first.status).toBe("created");
    expect(await ingest(id, "key-0001")).toEqual({ status: "duplicate", event_id: first.event_id });
    expect(
      (await db.query("select attempts, delivered_at from private.push_deliveries")).rows,
    ).toEqual([{ attempts: 0, delivered_at: null }]);
    for (let i = 2; i <= 30; i++) await ingest(id, `key-${String(i).padStart(4, "0")}`);
    expect((await ingest(id, "key-0031")).status).toBe("limited");
    expect((await db.query("select count(*)::int as n from public.events")).rows).toEqual([
      { n: 30 },
    ]);
  });

  it("refuses unknown cameras and households being deleted", async () => {
    const { id } = await camera();
    expect((await ingest("00000000-0000-4000-8000-0000000000ff", "key-0001")).status).toBe(
      "unauthorized",
    );
    await asUser(alice, () => db.query("select public.begin_account_cleanup()"));
    expect((await ingest(id, "key-0001")).status).toBe("unauthorized");
  });

  it("leases due deliveries with back-off, skips answered alerts and stops when delivered", async () => {
    const { id } = await camera();
    const a = await ingest(id, "key-000a");
    const b = await ingest(id, "key-000b");
    const claim = () =>
      asService(
        async () =>
          (await db.query<{ id: string }>("select id from public.claim_push_deliveries(10)")).rows,
      );
    expect(await claim()).toEqual([]);
    await db.query("update private.push_deliveries set next_attempt_at = now()");
    await db.query("update public.events set status = 'acknowledged' where id = $1", [b.event_id]);
    expect(await claim()).toEqual([{ id: a.event_id }]);
    expect(await claim()).toEqual([]);
    await asService(() => db.query("select public.complete_push_delivery($1)", [a.event_id]));
    await db.query("update private.push_deliveries set next_attempt_at = now()");
    expect(await claim()).toEqual([]);
  });

  it("queues offline notices for immediate delivery", async () => {
    const { id } = await camera();
    await db.query(
      "update public.devices set last_seen_at = now() - interval '5 minutes' where id = $1",
      [id],
    );
    await asService(() => db.query("select * from public.mark_offline_devices()"));
    expect(
      await asService(
        async () =>
          (await db.query<{ kind: string }>("select kind from public.claim_push_deliveries(10)"))
            .rows,
      ),
    ).toEqual([{ kind: "offline" }]);
  });
});
