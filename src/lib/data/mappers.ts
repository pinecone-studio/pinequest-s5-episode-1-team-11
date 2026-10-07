import { Device, Event, Household, WatchedPerson } from "@/contracts";
import type {
  DeviceRow,
  EventRow,
  HouseholdRow,
  WatchedPersonRow,
} from "@/lib/supabase/database.types";

export function mapDevice(row: DeviceRow) {
  return Device.parse({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    roomName: row.room_name,
    kind: row.kind,
    status: row.status,
    lastSeenAt: row.last_seen_at,
    settings: row.settings,
    createdAt: row.created_at,
  });
}
export function mapEvent(
  row: EventRow,
  acknowledgedBy: string | null = null,
  snapshotUrl: string | null = null,
) {
  return Event.parse({
    id: row.id,
    householdId: row.household_id,
    deviceId: row.device_id,
    kind: row.kind,
    severity: row.severity,
    status: row.status,
    confidence: row.confidence,
    personName: row.person_name,
    roomName: row.room_name,
    occurredAt: row.occurred_at,
    notifiedAt: row.notified_at,
    snapshotUrl,
    acknowledgedBy,
    acknowledgedAt: row.acknowledged_at,
    note: row.note,
  });
}
export function mapHousehold(row: HouseholdRow) {
  return Household.parse({ id: row.id, name: row.name, ownerId: row.owner_id });
}
export function mapWatchedPerson(row: WatchedPersonRow) {
  return WatchedPerson.parse({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    kind: row.kind,
    age: row.age,
    notes: row.notes,
    emergencyPhone: row.emergency_phone,
  });
}
