import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

const messages: Record<string, string> = {
  email_not_confirmed: "Email хаягаа баталгаажуулаад дахин нэвтэрнэ үү.",
  signup_disabled: "Шинэ хэрэглэгчийн бүртгэл одоогоор хаалттай байна.",
  email_address_invalid: "Email хаягаа зөв оруулна уу.",
  email_address_not_authorized:
    "Энэ хаягт баталгаажуулах email илгээх боломжгүй байна. Администраторт хандана уу.",
  invalid_credentials: "Email эсвэл нууц үг буруу байна.",
  weak_password:
    "Нууц үг бүртгэлийн шаардлага хангахгүй байна. Илүү урт, үсэг болон тоотой нууц үг сонгоно уу.",
  over_email_send_rate_limit:
    "Email илгээх хязгаарт хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.",
  over_request_rate_limit: "Түр хүлээгээд дахин оролдоно уу.",
};

export function authErrorMessage(error: unknown): string {
  const fallback = "Үйлдэл амжилтгүй боллоо. Түр хүлээгээд дахин оролдоно уу.";
  if (!isAuthError(error)) return fallback;
  if (error.status === 429)
    return error.code === "over_email_send_rate_limit"
      ? messages.over_email_send_rate_limit
      : messages.over_request_rate_limit;
  if (isAuthRetryableFetchError(error) && error.status === 0)
    return "Холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.";
  if (error.status !== undefined && error.status >= 500)
    return "Сервер түр ажиллахгүй байна. Түр хүлээгээд дахин оролдоно уу.";
  const message = messages[error.code ?? ""];
  return typeof message === "string" ? message : fallback;
}
