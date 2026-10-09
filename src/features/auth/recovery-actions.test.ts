import { beforeEach, describe, expect, it, vi } from "vitest";
import { resendConfirmation, resetPassword, sendRecoveryEmail } from "./recovery-actions";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
  recover: vi.fn(),
  resend: vi.fn(),
  update: vi.fn(),
  cookieValues: new Map<string, string>(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = mocks.cookieValues.get(name);
      return value ? { value } : undefined;
    },
    set: (name: string, value: string) => mocks.cookieValues.set(name, value),
  }),
}));

const userId = "00000000-0000-4000-8000-000000000001";
const now = Date.now();
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
const email = () => form({ email: "Caregiver@example.com", next: "/invite/" + "a".repeat(32) });
const password = () =>
  form({ password: "new-strong-password", confirmPassword: "new-strong-password" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookieValues.clear();
  mocks.client.mockResolvedValue({
    auth: {
      getUser: mocks.getUser,
      getClaims: mocks.getClaims,
      resetPasswordForEmail: mocks.recover,
      resend: mocks.resend,
      updateUser: mocks.update,
    },
  });
  mocks.recover.mockResolvedValue({ error: null });
  mocks.resend.mockResolvedValue({ error: null });
  mocks.update.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mocks.getClaims.mockResolvedValue({
    data: {
      claims: {
        sub: userId,
        session_id: "00000000-0000-4000-8000-000000000002",
        role: "authenticated",
        amr: [{ method: "recovery", timestamp: Math.floor(now / 1000) }],
      },
    },
    error: null,
  });
});

describe("public auth email actions", () => {
  it.each([sendRecoveryEmail, resendConfirmation])(
    "rejects invalid email and demo without sending",
    async (action) => {
      expect(await action({}, form({ email: "not-an-email" }))).toEqual({ error: "invalidForm" });
      expect(mocks.client).not.toHaveBeenCalled();
      mocks.client.mockResolvedValue(null);
      expect(await action({}, email())).toEqual({ error: "demoDescription" });
      expect(mocks.recover).not.toHaveBeenCalled();
      expect(mocks.resend).not.toHaveBeenCalled();
    },
  );

  it("sends a PKCE recovery request and preserves the pending invite on the callback", async () => {
    const result = await sendRecoveryEmail({}, email());
    expect(result.success).toBe("recoverySent");
    expect(result.retryAt).toBeGreaterThan(Date.now());
    const [address, options] = mocks.recover.mock.calls[0];
    expect(address).toBe("caregiver@example.com");
    const destination = new URL(options.redirectTo);
    expect(destination.pathname).toBe("/auth/callback");
    expect(destination.searchParams.get("next")).toBe("/invite/" + "a".repeat(32));
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("resends confirmation with a safe destination and does not reveal account existence", async () => {
    const request = form({ email: "caregiver@example.com", next: "https://evil.example" });
    const accepted = await resendConfirmation({}, request);
    expect(accepted.success).toBe("confirmationSent");
    const options = mocks.resend.mock.calls[0][0];
    expect(options.type).toBe("signup");
    expect(new URL(options.options.emailRedirectTo).searchParams.get("next")).toBe("/home");
    mocks.cookieValues.clear();
    mocks.resend.mockResolvedValueOnce({
      error: { code: "user_not_found", status: 404, message: "No such account" },
    });
    expect((await resendConfirmation({}, request)).success).toBe(accepted.success);
  });

  it("does not issue a second email request during the server/browser cooldown", async () => {
    const first = await sendRecoveryEmail({}, email());
    expect(await resendConfirmation({}, email())).toEqual({
      error: "emailCooldown",
      retryAt: first.retryAt,
    });
    expect(mocks.resend).not.toHaveBeenCalled();
    expect(mocks.recover).toHaveBeenCalledOnce();
  });

  it("handles provider rate limits and transport failures with localized feedback", async () => {
    mocks.recover.mockResolvedValueOnce({
      error: { status: 429, code: "over_email_send_rate_limit" },
    });
    expect((await sendRecoveryEmail({}, email())).error).toBe("emailCooldown");
    mocks.cookieValues.clear();
    mocks.resend.mockRejectedValueOnce(new Error("private network details"));
    expect((await resendConfirmation({}, email())).error).toBe("emailSendFailed");
  });
});

describe("password reset authorization", () => {
  it("updates only the verified account with a recent signed recovery claim", async () => {
    expect(await resetPassword({}, password())).toEqual({ success: "passwordUpdated" });
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.getClaims).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledWith({ password: "new-strong-password" });
  });

  it.each([
    { sub: userId, amr: [{ method: "password", timestamp: now / 1000 }] },
    { sub: userId, amr: [{ method: "recovery", timestamp: now / 1000 - 901 }] },
    { sub: "other-user", amr: [{ method: "recovery", timestamp: now / 1000 }] },
    { sub: userId, amr: [{ method: "recovery", timestamp: now / 1000 + 3600 }] },
    { sub: userId, amr: ["recovery"], user_metadata: { recovery: true } },
  ])("rejects normal, expired, mismatched or forged recovery context", async (claims) => {
    mocks.getClaims.mockResolvedValueOnce({ data: { claims }, error: null });
    expect(await resetPassword({}, password())).toEqual({ error: "recoveryExpired" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires verified Auth, not only claims returned from a stale cookie", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "expired" } });
    expect(await resetPassword({}, password())).toEqual({ error: "recoveryExpired" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before Auth and gives a safe provider failure", async () => {
    expect(
      await resetPassword(
        {},
        form({ password: "new-strong-password", confirmPassword: "different" }),
      ),
    ).toEqual({ error: "passwordMismatch" });
    expect(mocks.client).not.toHaveBeenCalled();
    mocks.update.mockResolvedValueOnce({
      error: { code: "weak_password", message: "private policy details" },
    });
    expect(await resetPassword({}, password())).toEqual({ error: "passwordWeak" });
  });
});
