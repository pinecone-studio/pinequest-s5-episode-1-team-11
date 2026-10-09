import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeWatchedPerson, saveWatchedPerson } from "./people-actions";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  user: vi.fn(),
  home: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/data/queries", () => ({ getHousehold: mocks.home }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
const home = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const query = { eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), single: vi.fn() };
const table = { insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
const from = vi.fn();
function form(values: Record<string, string | undefined> = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({
    id: "",
    name: " Эмээ ",
    kind: "elderly",
    age: "78",
    notes: " Em ",
    emergencyPhone: "+976 99112233",
    ...values,
  })) {
    if (value !== undefined) result.set(key, value);
  }
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { id }, error: null });
  query.single.mockResolvedValue({ data: { id }, error: null });
  table.insert.mockReturnValue(query);
  table.update.mockReturnValue(query);
  table.delete.mockReturnValue(query);
  from.mockReturnValue(table);
  mocks.client.mockResolvedValue({ from });
  mocks.user.mockResolvedValue({ id: "caller" });
  mocks.home.mockResolvedValue({ id: home });
});
describe("watched-person mutations", () => {
  it("creates using the authenticated household and ignores client-supplied household IDs", async () => {
    expect(await saveWatchedPerson({}, form({ householdId: "attacker-home" }))).toEqual({
      success: "personSaved",
    });
    expect(mocks.user).toHaveBeenCalledOnce();
    expect(table.insert).toHaveBeenCalledWith({
      household_id: home,
      name: "Эмээ",
      kind: "elderly",
      age: 78,
      notes: "Em",
      emergency_phone: "+976 99112233",
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/home");
  });
  it("scopes updates and deletes by both ID and current household", async () => {
    expect(await saveWatchedPerson({}, form({ id }))).toEqual({ success: "personSaved" });
    expect(query.eq.mock.calls).toEqual([
      ["id", id],
      ["household_id", home],
    ]);
    query.eq.mockClear();
    expect(await removeWatchedPerson({}, form({ id }))).toEqual({ success: "personRemoved" });
    expect(query.eq.mock.calls).toEqual([
      ["id", id],
      ["household_id", home],
    ]);
  });
  it.each([
    { age: "-1" },
    { age: "1.5" },
    { age: "131" },
    { age: "abc" },
    { id: "invalid" },
    { name: " " },
    { emergencyPhone: "javascript:alert(1)" },
    { emergencyPhone: "()---" },
  ])("rejects invalid data before contacting the database (%j)", async (invalid) => {
    expect(await saveWatchedPerson({}, form(invalid))).toEqual({ error: "personInvalid" });
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("accepts missing optional fields without converting a blank age to zero", async () => {
    await saveWatchedPerson({}, form({ age: "", notes: "", emergencyPhone: "" }));
    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ age: null, notes: null, emergency_phone: null }),
    );
  });
  it("does not report a foreign/missing row as successfully edited or removed", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await saveWatchedPerson({}, form({ id }))).toEqual({ error: "personUnavailable" });
    expect(await removeWatchedPerson({}, form({ id }))).toEqual({ error: "personUnavailable" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("refuses writes in demo mode and before authentication", async () => {
    mocks.client.mockResolvedValueOnce(null);
    expect(await saveWatchedPerson({}, form())).toEqual({ error: "personDemo" });
    mocks.user.mockRejectedValueOnce(new Error("authentication required"));
    await expect(saveWatchedPerson({}, form())).rejects.toThrow("authentication required");
    expect(from).not.toHaveBeenCalled();
  });
});
