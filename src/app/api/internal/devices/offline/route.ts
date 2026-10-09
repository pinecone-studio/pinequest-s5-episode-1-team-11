import { timingSafeEqual } from "node:crypto";
import { isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError, apiJson } from "@/lib/device-api/http";
import { notifyHousehold } from "@/lib/device-api/notify";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const expected = serverEnv.cronSecret;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Every minute (Supabase pg_cron + pg_net): mark silent cameras offline, then send every queued
 * push that is due, including alerts whose first delivery was lost.
 */
export async function POST(request: Request) {
  if (!isDeviceApiConfigured || !serverEnv.cronSecret) return apiError(503, "not_configured");
  if (!authorized(request)) return apiError(401, "unauthorized");
  const admin = createAdminClient();
  const offline = await admin.rpc("mark_offline_devices", {});
  if (offline.error) throw offline.error;
  const due = await admin.rpc("claim_push_deliveries", { p_limit: 20 });
  if (due.error) throw due.error;
  const results = await Promise.allSettled(due.data.map((event) => notifyHousehold(event)));
  for (const result of results) {
    if (result.status === "rejected") console.error("queued notification failed", result.reason);
  }
  return apiJson({ offline: offline.data.length, delivered: due.data.length });
}
