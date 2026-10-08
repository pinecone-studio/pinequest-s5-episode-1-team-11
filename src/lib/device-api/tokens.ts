import { createHash, randomBytes } from "node:crypto";

/** 256 random bits. The device keeps it; the database only sees its hash. */
export function createDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** "Authorization: Bearer <token>" → token, or null. */
export function readBearer(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{32,200})$/);
  return match ? match[1] : null;
}

/** Stable, non-reversible id for rate limits. Vercel puts the client first in x-forwarded-for. */
export function clientFingerprint(request: Request) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return hashToken(`halo-pairing:${address}`);
}
