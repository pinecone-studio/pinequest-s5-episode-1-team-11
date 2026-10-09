import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount, transferOwnership } from "./actions";

const home = "00000000-0000-4000-8000-0000000000aa";
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  user: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
function form(confirmation = "DELETE") {
  const result = new FormData();
  result.set("confirmation", confirmation);
  result.set("userId", "another-user");
  return result;
}
/** Responses by RPC name; anything unlisted succeeds. */
function rpcs(responses: Record<string, { data?: unknown; error?: { message: string } | null }>) {
  mocks.rpc.mockImplementation(
    async (name: string) => responses[name] ?? { data: null, error: null },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue({
    rpc: mocks.rpc,
    auth: { signOut: mocks.signOut },
    storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
  });
  mocks.user.mockResolvedValue({ id: "caller" });
  rpcs({ begin_account_cleanup: { data: null, error: { message: "Owner access required" } } });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.list.mockResolvedValue({ data: [], error: null });
  mocks.remove.mockResolvedValue({ error: null });
});

describe("account deletion", () => {
  it("requires explicit confirmation and verified identity", async () => {
    expect(await deleteAccount({}, form(""))).toEqual({ error: "deleteConfirmError" });
    expect(mocks.client).not.toHaveBeenCalled();
    mocks.user.mockRejectedValueOnce(new Error("authentication required"));
    await expect(deleteAccount({}, form())).rejects.toThrow("authentication required");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("deletes a caregiver with the caller-scoped RPC, then signs out", async () => {
    expect(await deleteAccount({}, form())).toEqual({ deleted: true });
    expect(mocks.rpc).toHaveBeenLastCalledWith("delete_my_account");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("revokes cameras and removes every snapshot before deleting a sole owner", async () => {
    rpcs({ begin_account_cleanup: { data: home, error: null } });
    mocks.list
      .mockResolvedValueOnce({ data: [{ name: "a.jpg" }, { name: "b.jpg" }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await deleteAccount({}, form())).toEqual({ deleted: true });
    expect(mocks.remove).toHaveBeenCalledWith([`${home}/a.jpg`, `${home}/b.jpg`]);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      "begin_account_cleanup",
      "finish_account_cleanup",
      "delete_my_account",
    ]);
  });

  it.each([
    [
      "begin_account_cleanup",
      "Transfer household ownership before deleting the account",
      "deleteOwnerError",
    ],
    ["begin_account_cleanup", "backend unavailable", "accountError"],
    [
      "delete_my_account",
      "Remove household snapshots through the Storage API first",
      "deleteSnapshotsError",
    ],
    ["delete_my_account", "backend unavailable", "accountError"],
  ])("keeps the account active when %s refuses (%s)", async (name, message, key) => {
    rpcs({
      begin_account_cleanup: { data: null, error: { message: "Owner access required" } },
      [name]: { data: null, error: { message } },
    });
    expect(await deleteAccount({}, form())).toEqual({ error: key });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("stops before deleting when snapshots cannot be removed", async () => {
    rpcs({ begin_account_cleanup: { data: home, error: null } });
    mocks.list.mockResolvedValueOnce({ data: [{ name: "a.jpg" }], error: null });
    mocks.remove.mockResolvedValueOnce({ error: { message: "denied" } });
    expect(await deleteAccount({}, form())).toEqual({ error: "deleteSnapshotsError" });
    expect(mocks.rpc).not.toHaveBeenCalledWith("delete_my_account");
  });

  it("refuses demo deletion", async () => {
    mocks.client.mockResolvedValueOnce(null);
    expect(await deleteAccount({}, form())).toEqual({ error: "accountDemo" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("ownership transfer", () => {
  it("validates the target and calls the owner-only RPC", async () => {
    const target = "00000000-0000-4000-8000-000000000002";
    expect(await transferOwnership({}, form())).toEqual({ error: "transferError" });
    const request = new FormData();
    request.set("userId", target);
    expect(await transferOwnership({}, request)).toEqual({ done: true });
    expect(mocks.rpc).toHaveBeenCalledWith("transfer_household_ownership", { p_new_owner: target });
    rpcs({
      transfer_household_ownership: { data: null, error: { message: "Owner access required" } },
    });
    expect(await transferOwnership({}, request)).toEqual({ error: "transferError" });
  });
});
