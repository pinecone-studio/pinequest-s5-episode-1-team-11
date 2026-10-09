import { after } from "next/server";
import { EventIngest, EventIngestResponse, severityOf } from "@/contracts";
import { authenticateDevice, isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError, apiJson, readJson } from "@/lib/device-api/http";
import { decodeSnapshot, isKindEnabled, normalizeOccurredAt } from "@/lib/device-api/ingest";
import { notifyHousehold } from "@/lib/device-api/notify";
import { createAdminClient } from "@/lib/supabase/admin";

function respond(body: EventIngestResponse, status: number) {
  return apiJson(EventIngestResponse.parse(body), status);
}

/** A camera reports one detection. Retrying with the same idempotency key is always safe. */
export async function POST(request: Request) {
  if (!isDeviceApiConfigured) return apiError(503, "not_configured");
  const device = await authenticateDevice(request);
  if (!device) return apiError(401, "unauthorized");
  const body = await readJson(request, EventIngest);
  const occurredAt = body && normalizeOccurredAt(body.occurredAt);
  if (!body || !occurredAt) return apiError(400, "invalid_request");
  if (!isKindEnabled(body.kind, device.settings))
    return respond({ eventId: null, ignored: true }, 202);

  // Deduplication, the rate limit, the event and its push delivery row commit together.
  const admin = createAdminClient();
  const ingested = await admin.rpc("ingest_event", {
    p_device_id: device.id,
    p_idempotency_key: body.idempotencyKey,
    p_kind: body.kind,
    p_severity: severityOf[body.kind],
    p_confidence: body.confidence,
    p_occurred_at: occurredAt,
    p_person_name: body.personName ?? null,
  });
  if (ingested.error) throw ingested.error;
  const outcome = ingested.data?.[0];
  if (!outcome || outcome.status === "unauthorized" || !outcome.event_id)
    return outcome?.status === "limited"
      ? apiError(429, "rate_limited")
      : apiError(401, "unauthorized");
  if (outcome.status === "duplicate")
    return respond({ eventId: outcome.event_id, duplicate: true }, 200);
  const eventId = outcome.event_id;

  const snapshot = body.snapshot ? decodeSnapshot(body.snapshot) : null;
  if (snapshot) {
    const path = `${device.household_id}/${eventId}.jpg`;
    const upload = await admin.storage
      .from("event-snapshots")
      .upload(path, snapshot, { contentType: "image/jpeg", upsert: true });
    if (upload.error) {
      console.error("snapshot upload failed", upload.error.message);
    } else {
      const updated = await admin.from("events").update({ snapshot_path: path }).eq("id", eventId);
      if (updated.error) console.error("snapshot metadata update failed", updated.error.message);
    }
  }

  // The camera gets its answer immediately. If this push is lost, the minute job retries it.
  after(async () => {
    try {
      const { data, error } = await admin.from("events").select("*").eq("id", eventId).single();
      if (error) throw error;
      await notifyHousehold(data);
    } catch (error) {
      console.error("event notification failed", error);
    }
  });
  return respond({ eventId }, 201);
}
