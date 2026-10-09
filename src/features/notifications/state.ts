export type NotificationError =
  | "demo"
  | "login"
  | "unconfigured"
  | "invalid"
  | "saveFailed"
  | "removeFailed"
  | "stateFailed"
  | "noSubscription"
  | "sendFailed";

export type NotificationActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: NotificationError };
