import { after } from "next/server";
import { EventIngest, EventIngestResponse, severityOf } from "@/contracts";
import { authenticateDevice, isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError, apiJson, readJson } from "@/lib/device-api/http";
import { decodeSnapshot, isKindEnabled, normalizeOccurredAt } from "@/lib/device-api/ingest";
import { notifyHousehold } from "@/lib/device-api/notify";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_EVENTS_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60_000;

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

  const admin = createAdminClient();
  const findExisting = () =>
    admin
      .from("events")
      .select("id")
      .eq("device_id", device.id)
      .eq("idempotency_key", body.idempotencyKey)
      .maybeSingle();
  const existing = await findExisting();
  if (existing.error) throw existing.error;
  if (existing.data) return respond({ eventId: existing.data.id, duplicate: true }, 200);

  const recent = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("device_id", device.id)
    .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());
  if (recent.error) throw recent.error;
  if ((recent.count ?? 0) >= MAX_EVENTS_PER_WINDOW) return apiError(429, "rate_limited");

  const inserted = await admin
    .from("events")
    .insert({
      household_id: device.household_id,
      device_id: device.id,
      idempotency_key: body.idempotencyKey,
      kind: body.kind,
      severity: severityOf[body.kind],
      confidence: body.confidence,
      person_name: body.personName ?? null,
      room_name: device.room_name,
      occurred_at: occurredAt,
    })
    .select("*")
    .single();
  if (inserted.error?.code === "23505") {
    // A concurrent retry won the race; answer with its event.
    const winner = await findExisting();
    if (winner.error) throw winner.error;
    return respond({ eventId: winner.data?.id ?? null, duplicate: true }, 200);
  }
  if (inserted.error) throw inserted.error;
  let row = inserted.data;

  const snapshot = body.snapshot ? decodeSnapshot(body.snapshot) : null;
  if (snapshot) {
    const path = `${row.household_id}/${row.id}.jpg`;
    const upload = await admin.storage
      .from("event-snapshots")
      .upload(path, snapshot, { contentType: "image/jpeg", upsert: true });
    if (upload.error) {
      console.error("snapshot upload failed", upload.error.message);
    } else {
      const updated = await admin
        .from("events")
        .update({ snapshot_path: path })
        .eq("id", row.id)
        .select("*")
        .single();
      if (updated.error) throw updated.error;
      row = updated.data;
    }
  }

  // The camera gets its answer immediately; push delivery continues after the response.
  after(() =>
    notifyHousehold(row).catch((error: unknown) =>
      console.error("event notification failed", error),
    ),
  );
  return respond({ eventId: row.id }, 201);
}
