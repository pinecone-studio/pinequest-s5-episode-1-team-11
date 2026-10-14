export type Household = { id: string; name: string; owner_id: string };
export type Member = {
  household_id: string;
  user_id: string;
  role: "owner" | "caregiver";
};
export type Profile = { id: string; name: string | null };
export type DetectionSettings = {
  watching: "child" | "elderly" | "disabled";
  sensitivity: "low" | "medium" | "high";
  fall: boolean;
  distress: boolean;
  hazard: boolean;
};
export type WatchedPerson = {
  id: string;
  household_id: string;
  name: string;
  kind: "child" | "elderly" | "disabled";
  age: number | null;
  notes: string | null;
  emergency_phone: string | null;
  created_at: string;
};
export type Device = {
  id: string;
  household_id: string;
  name: string;
  room_name: string | null;
  kind: "phone" | "laptop" | "ip_camera";
  status: "online" | "offline" | "pairing";
  last_seen_at: string | null;
  settings: DetectionSettings;
};
export type HaloEvent = {
  id: string;
  household_id: string;
  device_id: string | null;
  kind: "fall" | "scream" | "cry" | "glass" | "alarm" | "offline" | "test";
  severity: "critical" | "warning" | "info";
  status: "new" | "acknowledged" | "false_alarm" | "resolved";
  confidence: number | null;
  person_name: string | null;
  room_name: string | null;
  occurred_at: string;
  snapshot_path: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  note: string | null;
  created_at: string;
};
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
// Only the tables this client uses. Replace with generated types if available.
export type Database = {
  public: {
    Tables: {
      households: Table<Household>;
      household_members: Table<Member>;
      profiles: Table<Profile>;
      devices: Table<Device>;
      events: Table<HaloEvent>;
      watched_people: Table<WatchedPerson>;
      expo_push_tokens: Table<{
        token: string;
        user_id: string;
        created_at: string;
      }>;
    };
    Views: { [key in never]: never };
    Functions: {
      register_expo_push_token: {
        Args: { p_token: string };
        Returns: undefined;
      };
      create_household: { Args: { p_name: string }; Returns: string };
      accept_invite: { Args: { p_code: string }; Returns: string };
      transfer_household_ownership: {
        Args: { p_new_owner: string };
        Returns: string;
      };
      begin_account_cleanup: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      finish_account_cleanup: { Args: Record<string, never>; Returns: boolean };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      create_pairing: {
        Args: { p_name: string; p_room_name: string; p_kind?: string };
        Returns: {
          code: string;
          expires_at: string;
          device_id: string | null;
        }[];
      };
      create_invite: {
        Args: Record<string, never>;
        Returns: { code: string; expires_at: string }[];
      };
    };
    Enums: { [key in never]: never };
    CompositeTypes: { [key in never]: never };
  };
};
