import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import type { EventRow } from "@/lib/supabase/database.types";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  authenticateDevice: vi.fn(),
  createAdminClient: vi.fn(),
  notifyHousehold: vi.fn(),
  after: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/device-api/auth", () => ({
  authenticateDevice: mocks.authenticateDevice,
  isDeviceApiConfigured: true,
}));
vi.mock("@/lib/device-api/notify", () => ({ notifyHousehold: mocks.notifyHousehold }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

const deviceId = "00000000-0000-4000-8000-0000000000d1";
const eventId = "00000000-0000-4000-8000-0000000000e1";
const householdId = "00000000-0000-4000-8000-000000000001";
const snapshotPath = `${householdId}/${eventId}.jpg`;
const now = "2026-10-08T12:00:00.000Z";

function request() {
  return new Request("https://halo.test/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: "critical-moment-1",
      kind: "fall",
      confidence: 0.9,
      occurredAt: now,
      snapshot: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64"),
    }),
  });
}

/** In-memory stand-in for ingest_event (one event per key), the events table and Storage. */
function setup(
  options: { uploadError?: string; metadataError?: string; ingest?: string | null } = {},
) {
  let stored: EventRow | null = null;
  const callbacks: (() => Promise<void>)[] = [];
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => {
    if (options.ingest !== undefined)
      return { data: [{ status: options.ingest, event_id: null }], error: null };
    if (stored) return { data: [{ status: "duplicate", event_id: stored.id }], error: null };
    stored = {
      id: eventId,
      household_id: householdId,
      device_id: deviceId,
      idempotency_key: args.p_idempotency_key as string,
      kind: args.p_kind as EventRow["kind"],
      severity: args.p_severity as EventRow["severity"],
      status: "new",
      confidence: args.p_confidence as number,
      person_name: null,
      room_name: "Hall",
      occurred_at: now,
      notified_at: null,
      snapshot_path: null,
      acknowledged_by: null,
      acknowledged_at: null,
      note: null,
      created_at: now,
    };
    return { data: [{ status: "created", event_id: eventId }], error: null };
  });
  const update = vi.fn((data: Partial<EventRow>) => ({
    eq: async () => {
      if (options.metadataError) return { error: { message: options.metadataError } };
      if (stored) stored = { ...stored, ...data };
      return { error: null };
    },
  }));
  const upload = vi.fn().mockResolvedValue({
    error: options.uploadError ? { message: options.uploadError } : null,
  });
  mocks.createAdminClient.mockReturnValue({
    rpc,
    from: () => ({
      update,
      select: () => ({ eq: () => ({ single: async () => ({ data: stored, error: null }) }) }),
    }),
    storage: { from: () => ({ upload }) },
  });
  mocks.after.mockImplementation((callback: () => Promise<void>) => callbacks.push(callback));
  return { callbacks, rpc, update, upload, stored: () => stored };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mocks.authenticateDevice.mockResolvedValue({
    id: deviceId,
    household_id: householdId,
    room_name: "Hall",
    settings: defaultDetectionSettings,
  });
  mocks.notifyHousehold.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("critical event snapshot and notification", () => {
  it("notifies the persisted event despite failed snapshot metadata, without duplicating retries", async () => {
    const db = setup({ metadataError: "snapshot metadata update failed" });

    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ eventId });
    expect(db.stored()?.snapshot_path).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "snapshot metadata update failed",
      "snapshot metadata update failed",
    );
    expect(db.callbacks).toHaveLength(1);
    expect(mocks.notifyHousehold).not.toHaveBeenCalled();
    await db.callbacks[0]();
    expect(mocks.notifyHousehold).toHaveBeenCalledWith(db.stored());

    const retry = await POST(request());
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ eventId, duplicate: true });
    expect(db.rpc).toHaveBeenCalledTimes(2);
    expect(db.upload).toHaveBeenCalledTimes(1);
    expect(db.callbacks).toHaveLength(1);
    expect(mocks.notifyHousehold).toHaveBeenCalledTimes(1);
  });

  it("notifies with the stored snapshot when upload and metadata update succeed", async () => {
    const db = setup();
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ eventId });
    expect(db.stored()?.snapshot_path).toBe(snapshotPath);
    expect(db.upload).toHaveBeenCalledWith(snapshotPath, expect.any(Buffer), {
      contentType: "image/jpeg",
      upsert: true,
    });
    expect(db.callbacks).toHaveLength(1);
    await db.callbacks[0]();
    expect(mocks.notifyHousehold).toHaveBeenCalledWith(db.stored());
    expect(console.error).not.toHaveBeenCalled();
  });

  it("notifies without a snapshot when storage rejects the upload", async () => {
    const db = setup({ uploadError: "storage unavailable" });
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ eventId });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.stored()?.snapshot_path).toBeNull();
    expect(db.callbacks).toHaveLength(1);
    await db.callbacks[0]();
    expect(mocks.notifyHousehold).toHaveBeenCalledWith(db.stored());
    expect(console.error).toHaveBeenCalledWith("snapshot upload failed", "storage unavailable");
  });

  it("sends the critical severity and maps refusals to camera-friendly statuses", async () => {
    const db = setup();
    await POST(request());
    expect(db.rpc).toHaveBeenCalledWith(
      "ingest_event",
      expect.objectContaining({ p_device_id: deviceId, p_kind: "fall", p_severity: "critical" }),
    );
    setup({ ingest: "limited" });
    expect((await POST(request())).status).toBe(429);
    setup({ ingest: "unauthorized" });
    expect((await POST(request())).status).toBe(401);
  });
});
