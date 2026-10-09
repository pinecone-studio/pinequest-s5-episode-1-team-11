import { describe, expect, it } from "vitest";
import { defaultDetectionSettings, OFFLINE_AFTER_MS } from "@/contracts";
import type { DeviceRow } from "@/lib/supabase/database.types";
import { mapDevice } from "./mappers";

const now = Date.parse("2026-10-09T01:00:00Z");
const row: DeviceRow = {
  id: "00000000-0000-4000-8000-000000000001",
  household_id: "00000000-0000-4000-8000-000000000002",
  name: "Phone",
  room_name: "Hall",
  kind: "phone",
  status: "online",
  last_seen_at: new Date(now).toISOString(),
  created_at: new Date(now).toISOString(),
  settings: defaultDetectionSettings,
};
describe("device connectivity display", () => {
  it("does not depend on the offline scheduler to stop displaying stale cameras as online", () => {
    const stale = { ...row, last_seen_at: new Date(now - OFFLINE_AFTER_MS - 1).toISOString() };
    expect(mapDevice(stale, now).status).toBe("offline");
    expect(mapDevice({ ...row, last_seen_at: null }, now).status).toBe("offline");
  });
  it("accepts fresh heartbeats and preserves pairing/offline states", () => {
    expect(mapDevice(row, now).status).toBe("online");
    expect(
      mapDevice({ ...row, last_seen_at: new Date(now - OFFLINE_AFTER_MS).toISOString() }, now)
        .status,
    ).toBe("online");
    expect(mapDevice({ ...row, status: "pairing", last_seen_at: null }, now).status).toBe(
      "pairing",
    );
    expect(mapDevice({ ...row, status: "offline" }, now).status).toBe("offline");
  });
});
