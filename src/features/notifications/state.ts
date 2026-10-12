export type NotificationError =
  | "demo"
  | "login"
  | "unconfigured"
  | "invalid"
  | "saveFailed"
  | "removeFailed"
  | "stateFailed";

export type NotificationActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: NotificationError };
