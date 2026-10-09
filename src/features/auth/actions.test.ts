import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut, signUp } from "./actions";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  getUser: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

function credentials() {
  const form = new FormData();
  form.set("name", "Caregiver B");
  form.set("email", "caregiver-b@example.com");
  form.set("password", "a-long-test-password");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue({
    auth: {
      getUser: mocks.getUser,
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
  });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "caregiver-a" } }, error: null });
});

describe("authentication entrypoints on a shared browser", () => {
  it.each([signIn, signUp])("does not replace an already verified account", async (action) => {
    await expect(action({}, credentials())).rejects.toThrow("redirect:/home");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("allows an unauthenticated user to attempt login", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.signIn.mockResolvedValue({ error: { message: "invalid credentials" } });
    expect(await signIn({}, credentials())).toEqual({ error: "signInError" });
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "caregiver-b@example.com",
      password: "a-long-test-password",
    });
  });
  it("allows registration after the old session has expired", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await signUp({}, credentials())).toEqual({ success: "confirmEmail" });
    expect(mocks.signUp).toHaveBeenCalledOnce();
  });
  it("keeps logout failure visible instead of redirecting as if it succeeded", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "offline" } });
    expect(await signOut()).toEqual({ error: "genericError" });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("returns to login after the local session was signed out", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("redirect:/login");
  });
});
