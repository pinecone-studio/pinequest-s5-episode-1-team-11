import {
  type DeviceConfig,
  DeviceConfig as DeviceConfigSchema,
  type DeviceKind,
  type EventIngest,
  PairResponse,
} from "@/contracts";

/** Network failures and server errors are "retry"; a removed device is "unauthorized". */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "invalid" | "limited" | "unauthorized" | "unavailable" | "retry" };

async function call(path: string, init: RequestInit) {
  try {
    return await fetch(path, { ...init, cache: "no-store" });
  } catch {
    return null;
  }
}
function failure(response: Response | null): ApiResult<never> {
  if (!response) return { ok: false, reason: "retry" };
  if (response.status === 401) return { ok: false, reason: "unauthorized" };
  if (response.status === 404 || response.status === 400) return { ok: false, reason: "invalid" };
  if (response.status === 429) return { ok: false, reason: "limited" };
  if (response.status === 503) return { ok: false, reason: "unavailable" };
  return { ok: false, reason: "retry" };
}
const bearer = (token: string) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

export function guessDeviceKind(): DeviceKind {
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? "phone" : "laptop";
}

export async function pairDevice(code: string): Promise<ApiResult<PairResponse>> {
  const response = await call("/api/v1/devices/pair", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, kind: guessDeviceKind() }),
  });
  if (!response?.ok) return failure(response);
  return { ok: true, data: PairResponse.parse(await response.json()) };
}

export async function sendHeartbeat(token: string): Promise<ApiResult<DeviceConfig>> {
  const response = await call("/api/v1/devices/heartbeat", {
    method: "POST",
    headers: bearer(token),
  });
  if (!response?.ok) return failure(response);
  return { ok: true, data: DeviceConfigSchema.parse(await response.json()) };
}

export async function sendEvent(token: string, event: EventIngest): Promise<ApiResult<null>> {
  const response = await call("/api/v1/events", {
    method: "POST",
    headers: bearer(token),
    body: JSON.stringify(event),
  });
  return response?.ok ? { ok: true, data: null } : failure(response);
}

export async function unpairDevice(token: string) {
  await call("/api/v1/devices/me", { method: "DELETE", headers: bearer(token) });
}
