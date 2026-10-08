import { defaultDetectionSettings } from "./device";
import type { Device, Event, Household, Member, Profile, WatchedPerson } from "./index";

/*
 * Example data used when Supabase is not configured, in tests and on /design.
 * Times are relative to `now`, so "Өнөөдөр" and "Өчигдөр" groups always have rows.
 */
export const ids = {
  me: "00000000-0000-4000-8000-000000000001",
  bat: "00000000-0000-4000-8000-000000000002",
  household: "00000000-0000-4000-8000-0000000000a1",
  living: "00000000-0000-4000-8000-0000000000d1",
  bedroom: "00000000-0000-4000-8000-0000000000d2",
  hall: "00000000-0000-4000-8000-0000000000d3",
  grandma: "00000000-0000-4000-8000-0000000000b1",
  boy: "00000000-0000-4000-8000-0000000000b2",
} as const;

const eventId = (n: number) => `00000000-0000-4000-8000-0000000000e${n}`;

export function makeFixtures(now = new Date()) {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const day = 24 * 60;

  const profile: Profile = { id: ids.me, name: "Оюунаа" };
  const household: Household = { id: ids.household, name: "Гэр", ownerId: ids.me };
  const members: Member[] = [
    { userId: ids.me, name: "Оюунаа", role: "owner", isMe: true },
    { userId: ids.bat, name: "Бат", role: "caregiver", isMe: false },
  ];
  const watchedPeople: WatchedPerson[] = [
    {
      id: ids.grandma,
      householdId: ids.household,
      name: "Дулмаа эмээ",
      kind: "elderly",
      age: 78,
      notes: "Зүрхний эм уудаг",
      emergencyPhone: "99112233",
    },
    {
      id: ids.boy,
      householdId: ids.household,
      name: "Тэмүүлэн",
      kind: "child",
      age: 4,
      notes: null,
      emergencyPhone: null,
    },
  ];
  const devices: Device[] = [
    {
      id: ids.living,
      householdId: ids.household,
      name: "Хуучин iPhone",
      roomName: "Зочны өрөө",
      kind: "phone",
      status: "online",
      lastSeenAt: ago(1),
      createdAt: ago(9 * day),
      settings: defaultDetectionSettings,
    },
    {
      id: ids.bedroom,
      householdId: ids.household,
      name: "Laptop",
      roomName: "Унтлагын өрөө",
      kind: "laptop",
      status: "online",
      lastSeenAt: ago(1),
      createdAt: ago(6 * day),
      settings: { ...defaultDetectionSettings, watching: "child" },
    },
    {
      id: ids.hall,
      householdId: ids.household,
      name: "Tapo C200",
      roomName: "Коридор",
      kind: "ip_camera",
      status: "offline",
      lastSeenAt: ago(125),
      createdAt: ago(3 * day),
      settings: defaultDetectionSettings,
    },
  ];
  const base = { householdId: ids.household, snapshotUrl: null } as const;
  const events: Event[] = [
    {
      ...base,
      id: eventId(1),
      deviceId: ids.living,
      kind: "fall",
      severity: "critical",
      status: "new",
      confidence: 0.87,
      personName: "Дулмаа эмээ",
      roomName: "Зочны өрөө",
      occurredAt: ago(3),
      notifiedAt: ago(3),
      acknowledgedBy: null,
      acknowledgedAt: null,
      note: null,
    },
    {
      ...base,
      id: eventId(2),
      deviceId: ids.living,
      kind: "glass",
      severity: "warning",
      status: "false_alarm",
      confidence: 0.64,
      personName: null,
      roomName: "Гал тогоо",
      occurredAt: ago(200),
      notifiedAt: ago(200),
      acknowledgedBy: "Оюунаа",
      acknowledgedAt: ago(198),
      note: "Аяга унасан",
    },
    {
      ...base,
      id: eventId(3),
      deviceId: ids.hall,
      kind: "offline",
      severity: "info",
      status: "resolved",
      confidence: null,
      personName: null,
      roomName: "Коридор",
      occurredAt: ago(320),
      notifiedAt: ago(318),
      acknowledgedBy: null,
      acknowledgedAt: null,
      note: "8 минутын дараа дахин холбогдсон",
    },
    {
      ...base,
      id: eventId(4),
      deviceId: ids.bedroom,
      kind: "cry",
      severity: "warning",
      status: "acknowledged",
      confidence: 0.91,
      personName: "Тэмүүлэн",
      roomName: "Унтлагын өрөө",
      occurredAt: ago(day + 60),
      notifiedAt: ago(day + 60),
      acknowledgedBy: "Бат",
      acknowledgedAt: ago(day + 58),
      note: "3 минут уйлсан",
    },
    {
      ...base,
      id: eventId(5),
      deviceId: ids.living,
      kind: "alarm",
      severity: "critical",
      status: "resolved",
      confidence: 0.95,
      personName: null,
      roomName: "Гал тогоо",
      occurredAt: ago(3 * day),
      notifiedAt: ago(3 * day),
      acknowledgedBy: "Оюунаа",
      acknowledgedAt: ago(3 * day - 1),
      note: "Хоол түлэгдсэн",
    },
  ];
  return { profile, household, members, watchedPeople, devices, events };
}

export type Fixtures = ReturnType<typeof makeFixtures>;
