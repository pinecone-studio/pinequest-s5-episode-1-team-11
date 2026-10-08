import { z } from "zod";

export const eventKinds = ["fall", "scream", "cry", "glass", "alarm", "offline", "test"] as const;
export const EventKind = z.enum(eventKinds);
export type EventKind = z.infer<typeof EventKind>;

/** critical = someone may be hurt, warning = check soon, info = device or system notice. */
export const Severity = z.enum(["critical", "warning", "info"]);
export type Severity = z.infer<typeof Severity>;

export const EventStatus = z.enum(["new", "acknowledged", "false_alarm", "resolved"]);
export type EventStatus = z.infer<typeof EventStatus>;

/** One detected moment, as shown in the app. */
export const Event = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  deviceId: z.uuid().nullable(),
  kind: EventKind,
  severity: Severity,
  status: EventStatus,
  /** Model confidence 0–1. Null for device events such as "offline". */
  confidence: z.number().min(0).max(1).nullable(),
  personName: z.string().nullable(),
  roomName: z.string(),
  occurredAt: z.iso.datetime({ offset: true }),
  notifiedAt: z.iso.datetime({ offset: true }).nullable(),
  snapshotUrl: z.url().nullable(),
  acknowledgedBy: z.string().nullable(),
  acknowledgedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Short human note, e.g. "Аяга унасан". */
  note: z.string().nullable(),
});
export type Event = z.infer<typeof Event>;

/** What a camera device sends to POST /api/v1/events. */
export const EventIngest = z.object({
  /** The same key twice means the same event; retries are safe. */
  idempotencyKey: z.string().min(8).max(100),
  kind: EventKind.exclude(["offline", "test"]),
  confidence: z.number().min(0).max(1),
  occurredAt: z.iso.datetime({ offset: true }),
  personName: z.string().max(80).nullable().optional(),
  /** JPEG snapshot as base64, only for critical moments. */
  snapshot: z.string().max(2_000_000).optional(),
});
export type EventIngest = z.infer<typeof EventIngest>;

/** Default severity for each kind; the server may raise it. */
export const severityOf: Record<EventKind, Severity> = {
  fall: "critical",
  alarm: "critical",
  scream: "warning",
  cry: "warning",
  glass: "warning",
  offline: "info",
  test: "info",
};
