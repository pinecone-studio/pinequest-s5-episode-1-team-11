import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import { createClient } from "@/lib/supabase/server";
import { createDevicePairing, deleteDevice, getPairingStatus, updateDevice } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const id = "00000000-0000-4000-8000-0000000000d1";
const householdId = "00000000-0000-4000-8000-0000000000a1";
function query(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

describe("guardian device actions", () => {
  const membership = query({ household_id: householdId });
  const devices = query({ id });
  const pairing = query({ code: "001234", expires_at: "2026-10-09T00:00:00.000Z", device_id: id });
  const client = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  };
  const input = {
    id,
    name: " Camera ",
    roomName: " Room ",
    settings: defaultDetectionSettings,
    expected: { name: "Camera", roomName: "Room", settings: defaultDetectionSettings },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    membership.maybeSingle.mockResolvedValue({ data: { household_id: householdId }, error: null });
    devices.maybeSingle.mockResolvedValue({ data: { id }, error: null });
    client.auth.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
    client.from.mockImplementation((table) =>
      table === "household_members" ? membership : table === "pairing_codes" ? pairing : devices,
    );
    client.rpc.mockResolvedValue({
      data: [{ code: "001234", expires_at: "2026-10-09T00:10:00.000Z", device_id: null }],
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(
      client as unknown as NonNullable<Awaited<ReturnType<typeof createClient>>>,
    );
  });

  it("rejects privileged or malformed fields before accessing the database", async () => {
    expect(await updateDevice({ ...input, householdId })).toEqual({ ok: false, error: "invalid" });
    expect(
      await updateDevice({ ...input, settings: { ...input.settings, fall: "false" } }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(await deleteDevice("not-a-uuid")).toEqual({ ok: false, error: "invalid" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("blocks unsigned callers before any device mutation", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await deleteDevice(id)).toEqual({ ok: false, error: "unauthorized" });
    expect(client.from).not.toHaveBeenCalled();
    expect(devices.delete).not.toHaveBeenCalled();
  });

  it("scopes writes to the caller's household and only updates editable fields", async () => {
    expect(await updateDevice(input)).toEqual({ ok: true, data: undefined });
    expect(membership.eq).toHaveBeenCalledWith("user_id", "user");
    expect(devices.update).toHaveBeenCalledWith({
      name: "Camera",
      room_name: "Room",
      settings: defaultDetectionSettings,
    });
    expect(devices.eq).toHaveBeenCalledWith("id", id);
    expect(devices.eq).toHaveBeenCalledWith("household_id", householdId);
    expect(devices.eq).toHaveBeenCalledWith("name", input.expected.name);
    expect(devices.eq).toHaveBeenCalledWith("room_name", input.expected.roomName);
    expect(devices.filter).toHaveBeenCalledWith(
      "settings",
      "eq",
      JSON.stringify(input.expected.settings),
    );
  });

  it("reports a zero-row or RLS-hidden mutation without claiming success", async () => {
    devices.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await deleteDevice(id)).toEqual({ ok: false, error: "notFound" });
    expect(devices.eq).toHaveBeenCalledWith("household_id", householdId);
  });

  it("reports a concurrent update when the camera still exists after a rejected save", async () => {
    devices.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await updateDevice(input)).toEqual({ ok: false, error: "conflict" });
  });

  it("does not pretend to persist or generate a usable code in demo mode", async () => {
    vi.mocked(createClient).mockResolvedValue(null);
    expect(await createDevicePairing({ name: "Phone", roomName: "Room", kind: "phone" })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("creates the real RPC code and a QR link containing its exact six digits", async () => {
    const result = await createDevicePairing({
      name: " Phone ",
      roomName: " Room ",
      kind: "phone",
    });
    expect(client.rpc).toHaveBeenCalledWith("create_pairing", {
      p_name: "Phone",
      p_room_name: "Room",
      p_kind: "phone",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected pairing");
    expect(result.data.code).toBe("001234");
    expect(new URL(result.data.monitorUrl).pathname).toBe("/monitor");
    expect(new URL(result.data.monitorUrl).searchParams.get("code")).toBe("001234");
    expect(decodeURIComponent(result.data.qrDataUrl)).toContain("<svg");
  });

  it("reads claimed codes within the current household before considering expiry", async () => {
    expect(await getPairingStatus("001234")).toEqual({
      ok: true,
      data: { status: "paired", deviceId: id },
    });
    expect(pairing.eq).toHaveBeenCalledWith("code", "001234");
    expect(pairing.eq).toHaveBeenCalledWith("household_id", householdId);
  });

  it("returns a recoverable error for the server's active-code limit", async () => {
    client.rpc.mockResolvedValue({
      data: null,
      error: { message: "Too many active pairing codes" },
    });
    expect(await createDevicePairing({ name: "Phone", roomName: "Room", kind: "phone" })).toEqual({
      ok: false,
      error: "limit",
    });
  });
});
