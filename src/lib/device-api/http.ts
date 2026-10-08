import type { z } from "zod";

const noStore = { "Cache-Control": "no-store" };

export type ApiErrorCode =
  | "not_configured"
  | "invalid_request"
  | "unauthorized"
  | "invalid_code"
  | "too_many_attempts"
  | "rate_limited";

/** Errors are small and stable so devices can branch on `error`. */
export function apiError(status: number, error: ApiErrorCode) {
  return Response.json({ error }, { status, headers: noStore });
}

export function apiJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

/** Parses a JSON body; returns null for malformed JSON or schema mismatches. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T) {
  const body = await request.json().catch(() => undefined);
  const result = schema.safeParse(body);
  return result.success ? (result.data as z.infer<T>) : null;
}
