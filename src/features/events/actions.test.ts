import { beforeEach, describe, expect, it, vi } from "vitest";
import { respondToEvent } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

const eventId = "00000000-0000-4000-8000-0000000000e1";
const homeId = "00000000-0000-4000-8000-0000000000a1";
const userId = "00000000-0000-4000-8000-000000000001";

function form(response = "acknowledged", id = eventId, note = "") {
  const data = new FormData();
  data.set("eventId", id);
  data.set("response", response);
  data.set("note", note);
  return data;
}

function client(options: { noHousehold?: boolean; missingEvent?: boolean; error?: boolean } = {}) {
  const filters: [string, unknown][] = [];
  const update = vi.fn();
  const membershipFilter = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "household_members") {
      return {
        select: () => ({
          eq: membershipFilter.mockReturnValue({
            maybeSingle: async () => ({
              data: options.noHousehold ? null : { household_id: homeId },
              error: null,
            }),
          }),
        }),
      };
    }
    const query = {
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return query;
      },
      in(column: string, value: unknown) {
        filters.push([column, value]);
        return query;
      },
      select: () => query,
      maybeSingle: async () => ({
        data: options.missingEvent ? null : { id: eventId },
        error: options.error ? { message: "private database details" } : null,
      }),
    };
    update.mockReturnValue(query);
    return { update };
  });
  mocks.createClient.mockResolvedValue({ from });
  return { from, update, filters, membershipFilter };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: userId });
});

describe("event response authorization and persistence", () => {
  it.each([
    ["acknowledged", "not-a-uuid", ""],
    ["resolved", eventId, ""],
    ["false_alarm", eventId, "x".repeat(301)],
  ])("rejects invalid action input before querying (%s)", async (response, id, note) => {
    expect(await respondToEvent({}, form(response, id, note))).toEqual({ error: "action.invalid" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does not claim persistence in demo mode", async () => {
    mocks.createClient.mockResolvedValue(null);
    expect(await respondToEvent({}, form())).toEqual({ error: "action.unavailable" });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("cannot mutate events when verified authentication fails", async () => {
    const db = client();
    const unauthorized = new Error("Authentication required");
    mocks.requireUser.mockRejectedValueOnce(unauthorized);
    await expect(respondToEvent({}, form())).rejects.toBe(unauthorized);
    expect(db.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("restricts acknowledgement to the verified user's household and a new event", async () => {
    const db = client();
    expect(await respondToEvent({}, form())).toEqual({ status: "acknowledged" });
    expect(db.membershipFilter).toHaveBeenCalledWith("user_id", userId);
    expect(db.filters).toEqual([
      ["id", eventId],
      ["household_id", homeId],
      ["status", "new"],
    ]);
    expect(db.update).toHaveBeenCalledWith({
      status: "acknowledged",
      acknowledged_by: userId,
      acknowledged_at: expect.any(String),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/events");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/home");
  });

  it("does not update events when the verified user has no household", async () => {
    const db = client({ noHousehold: true });
    expect(await respondToEvent({}, form())).toEqual({ error: "action.householdRequired" });
    expect(db.from).not.toHaveBeenCalledWith("events");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a changed or inaccessible row instead of showing fake success", async () => {
    client({ missingEvent: true });
    expect(await respondToEvent({}, form())).toEqual({ error: "action.changed" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves a trimmed false-alarm note with the verified responder", async () => {
    const db = client();
    expect(await respondToEvent({}, form("false_alarm", eventId, "  A dropped cup  "))).toEqual({
      status: "false_alarm",
    });
    expect(db.update).toHaveBeenCalledWith({
      status: "false_alarm",
      acknowledged_by: userId,
      acknowledged_at: expect.any(String),
      note: "A dropped cup",
    });
    expect(db.filters).toContainEqual(["status", ["new", "acknowledged"]]);
  });

  it("reports database errors without exposing internals or claiming success", async () => {
    client({ error: true });
    expect(await respondToEvent({}, form())).toEqual({ error: "action.failed" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
