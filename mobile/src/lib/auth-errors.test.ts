import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("mobile auth errors", () => {
  it.each([
    ["email_not_confirmed", "Email хаягаа баталгаажуулаад дахин нэвтэрнэ үү."],
    ["signup_disabled", "Шинэ хэрэглэгчийн бүртгэл одоогоор хаалттай байна."],
    ["email_address_invalid", "Email хаягаа зөв оруулна уу."],
    [
      "email_address_not_authorized",
      "Энэ хаягт баталгаажуулах email илгээх боломжгүй байна. Администраторт хандана уу.",
    ],
    ["invalid_credentials", "Email эсвэл нууц үг буруу байна."],
    [
      "weak_password",
      "Нууц үг бүртгэлийн шаардлага хангахгүй байна. Илүү урт, үсэг болон тоотой нууц үг сонгоно уу.",
    ],
    [
      "over_email_send_rate_limit",
      "Email илгээх хязгаарт хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.",
    ],
    ["over_request_rate_limit", "Түр хүлээгээд дахин оролдоно уу."],
  ])("explains %s without exposing the server message", (code, message) => {
    expect(authErrorMessage(new AuthApiError("private server details", 400, code))).toBe(message);
  });

  it("distinguishes lost connectivity from a rejected password", () => {
    expect(authErrorMessage(new AuthRetryableFetchError("Failed to fetch", 0))).toBe(
      "Холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.",
    );
  });

  it.each([
    new AuthRetryableFetchError("Service unavailable", 503),
    new AuthApiError("Database failure", 500, "unexpected_failure"),
  ])("explains a server failure without blaming credentials", (error) => {
    expect(authErrorMessage(error)).toBe(
      "Сервер түр ажиллахгүй байна. Түр хүлээгээд дахин оролдоно уу.",
    );
  });

  it.each([undefined, "new_rate_limit_code", "invalid_credentials"])(
    "recognizes HTTP 429 regardless of error code %s",
    (code) => {
      expect(authErrorMessage(new AuthApiError("Too many requests", 429, code))).toBe(
        "Түр хүлээгээд дахин оролдоно уу.",
      );
    },
  );

  it("keeps email-specific rate limit guidance", () => {
    expect(authErrorMessage(new AuthApiError("Too many emails", 429, "over_email_send_rate_limit"))).toBe(
      "Email илгээх хязгаарт хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.",
    );
  });

  it.each([
    new Error("private@example.com secret-password"),
    new AuthApiError("private@example.com secret-password", 400, "unknown_code"),
    new AuthApiError("private@example.com secret-password", 400, "constructor"),
    null,
    undefined,
  ])("keeps unknown errors generic and private", (error) => {
    expect(authErrorMessage(error)).toBe(
      "Үйлдэл амжилтгүй боллоо. Түр хүлээгээд дахин оролдоно уу.",
    );
  });
});
