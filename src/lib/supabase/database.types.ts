import type { DetectionSettings } from "@/contracts";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};
export type ProfileRow = { id: string; name: string; created_at: string };
export type HouseholdRow = { id: string; name: string; owner_id: string; created_at: string };
export type MemberRow = {
  household_id: string;
  user_id: string;
  role: "owner" | "caregiver";
  created_at: string;
};
export type DeviceRow = {
  id: string;
  household_id: string;
  name: string;
  room_name: string;
  kind: "phone" | "laptop" | "ip_camera";
  status: "online" | "offline" | "pairing";
  last_seen_at: string | null;
  settings: DetectionSettings;
  created_at: string;
};
export type EventRow = {
  id: string;
  household_id: string;
  device_id: string | null;
  idempotency_key: string | null;
  kind: "fall" | "scream" | "cry" | "glass" | "alarm" | "offline" | "test";
  severity: "critical" | "warning" | "info";
  status: "new" | "acknowledged" | "false_alarm" | "resolved";
  confidence: number | null;
  person_name: string | null;
  room_name: string;
  occurred_at: string;
  notified_at: string | null;
  snapshot_path: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  note: string | null;
  created_at: string;
};
export type WatchedPersonRow = {
  id: string;
  household_id: string;
  name: string;
  kind: "child" | "elderly" | "disabled";
  age: number | null;
  notes: string | null;
  emergency_phone: string | null;
  created_at: string;
};
export type PairingRow = {
  code: string;
  household_id: string;
  name: string;
  room_name: string;
  kind: DeviceRow["kind"];
  expires_at: string;
  device_id: string | null;
  created_at: string;
};
export type InviteRow = {
  code: string;
  household_id: string;
  invited_by: string;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
};
export type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
  created_at: string;
};

/** Matches the checked-in SQL. Replace with CLI-generated types when connecting the project. */
export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "name">;
      households: Table<HouseholdRow, "name" | "owner_id">;
      household_members: Table<MemberRow, "household_id" | "user_id" | "role">;
      devices: Table<DeviceRow, "household_id" | "name" | "room_name" | "kind">;
      events: Table<EventRow, "household_id" | "kind" | "severity" | "room_name">;
      watched_people: Table<WatchedPersonRow, "household_id" | "name" | "kind">;
      pairing_codes: Table<PairingRow, "code" | "household_id" | "name" | "room_name">;
      household_invites: Table<InviteRow, "household_id" | "invited_by">;
      push_subscriptions: Table<SubscriptionRow, "user_id" | "endpoint" | "p256dh" | "auth">;
    };
    Views: Record<string, never>;
    Functions: {
      create_household: { Args: { p_name: string }; Returns: string };
      create_pairing: {
        Args: { p_name: string; p_room_name: string; p_kind?: string };
        Returns: { code: string; expires_at: string; device_id: string | null }[];
      };
      create_invite: {
        Args: Record<string, never>;
        Returns: { code: string; expires_at: string }[];
      };
      get_invite: {
        Args: { p_code: string };
        Returns: { code: string; household_name: string; invited_by: string; expires_at: string }[];
      };
      accept_invite: { Args: { p_code: string }; Returns: string };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      claim_pairing: {
        Args: { p_code: string; p_kind: string; p_token_hash: string; p_client: string };
        Returns: {
          status: "paired" | "invalid" | "limited";
          device_id: string | null;
          household_id: string | null;
          name: string | null;
          room_name: string | null;
        }[];
      };
      authenticate_device: { Args: { p_token_hash: string }; Returns: DeviceRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
