import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { sortedEvents } from "../lib/events";
import type { Device, HaloEvent, Household } from "../lib/types";
import { useAuth } from "./AuthProvider";

type HomesValue = {
  households: Household[];
  household: Household | null;
  name: string;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  retry: () => void;
  saveProfileName: (name: string) => Promise<void>;
  saveHouseholdName: (name: string) => Promise<void>;
};
const HomesContext = createContext<HomesValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      const members = await supabase
        .from("household_members")
        .select("*")
        .eq("user_id", userId);
      if (members.error) throw members.error;
      const ids = [...new Set((members.data ?? []).map((m) => m.household_id))];
      const homes = ids.length
        ? await supabase
            .from("households")
            .select("*")
            .in("id", ids)
            .order("name")
        : { data: [] as Household[], error: null };
      if (homes.error) throw homes.error;
      const profile = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (!alive) return;
      const list = homes.data ?? [];
      setHouseholds(list);
      setSelected((id) =>
        list.some((h) => h.id === id) ? id : (list[0]?.id ?? null),
      );
      setName(profile.data?.name ?? "");
    }
    void load()
      .catch(() => {
        if (alive) {
          setHouseholds([]);
          setSelected(null);
          setError("Гэр бүлийн мэдээллийг ачаалж чадсангүй.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId, attempt]);

  const household = households.find((h) => h.id === selected) ?? null;
  return (
    <HomesContext.Provider
      value={{
        households,
        household,
        name,
        saveProfileName: async (value) => {
          const next = value.trim();
          if (!next) throw new Error("Нэрээ оруулна уу.");
          if ([...next].length > 60)
            throw new Error("Нэр 60 тэмдэгтээс ихгүй байна.");
          const result = await supabase
            .from("profiles")
            .update({ name: next })
            .eq("id", userId)
            .select("*")
            .maybeSingle();
          if (result.error)
            throw new Error(
              "Нэр хадгалагдсангүй. Холболт болон өөрийн профайл шинэчлэх эрхээ шалгана уу.",
            );
          if (!result.data)
            throw new Error(
              "Өөрийн профайлыг шинэчилж чадсангүй. Бүртгэлээс гараад дахин нэвтэрч шалгана уу.",
            );
          setName(result.data.name ?? "");
        },
        saveHouseholdName: async (value) => {
          const next = value.trim();
          if (!next) throw new Error("Гэр бүлийн нэрээ оруулна уу.");
          if ([...next].length > 60)
            throw new Error("Гэр бүлийн нэр 60 тэмдэгтээс ихгүй байна.");
          if (!household || household.owner_id !== userId)
            throw new Error("Гэр бүлийн эзэн нэрийг өөрчилнө.");
          const result = await supabase
            .from("households")
            .update({ name: next })
            .eq("id", household.id)
            .eq("owner_id", userId)
            .select("*")
            .maybeSingle();
          if (result.error || !result.data)
            throw new Error(
              "Гэр бүлийн нэр хадгалагдсангүй. Холболт болон шинэчлэх эрхээ шалгана уу.",
            );
          const saved = result.data;
          setHouseholds((old) =>
            old.map((home) => (home.id === saved.id ? saved : home)),
          );
        },
        loading,
        error,
        select: (id) => {
          if (households.some((h) => h.id === id)) setSelected(id);
        },
        retry: () => {
          setLoading(true);
          setError(null);
          setAttempt((n) => n + 1);
        },
      }}
    >
      <DataProvider
        key={household?.id ?? "no-household"}
        householdId={household?.id ?? null}
      >
        {children}
      </DataProvider>
    </HomesContext.Provider>
  );
}

type DataValue = {
  devices: Device[];
  events: HaloEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  realtimeError: string | null;
  checkedAt: string | null;
  refresh: () => Promise<void>;
  applyEvent: (event: HaloEvent) => void;
  critical: HaloEvent | null;
  dismissCritical: (id: string) => void;
};
const DataContext = createContext<DataValue | null>(null);

function DataProvider({
  householdId,
  children,
}: {
  householdId: string | null;
  children: ReactNode;
}) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<HaloEvent[]>([]);
  const [loading, setLoading] = useState(!!householdId);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alive = useRef(true);
  const request = useRef(0);
  const version = useRef(0);
  const changes = useRef(
    new Map<string, { version: number; event: HaloEvent }>(),
  );

  const applyEvent = useCallback(
    (event: HaloEvent) => {
      if (!alive.current || event.household_id !== householdId) return;
      changes.current.set(event.id, { version: ++version.current, event });
      if (changes.current.size > 200) {
        const oldest = changes.current.keys().next().value;
        if (oldest) changes.current.delete(oldest);
      }
      setEvents((old) =>
        sortedEvents([event, ...old.filter((e) => e.id !== event.id)]),
      );
    },
    [householdId],
  );

  const load = useCallback(async () => {
    if (!householdId || !alive.current) return;
    const ticket = ++request.current;
    const startedAt = version.current;
    try {
      const [deviceResult, eventResult] = await Promise.all([
        supabase
          .from("devices")
          .select("*")
          .eq("household_id", householdId)
          .order("name"),
        supabase
          .from("events")
          .select("*")
          .eq("household_id", householdId)
          .order("occurred_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(100),
      ]);
      if (deviceResult.error) throw deviceResult.error;
      if (eventResult.error) throw eventResult.error;
      if (!alive.current || ticket !== request.current) return;
      const merged = new Map((eventResult.data ?? []).map((e) => [e.id, e]));
      // Keep INSERT/UPDATE received while the initial query was in flight.
      changes.current.forEach((change) => {
        if (change.version > startedAt)
          merged.set(change.event.id, change.event);
      });
      setCheckedAt(new Date().toISOString());
      setDevices(deviceResult.data ?? []);
      setEvents(sortedEvents([...merged.values()]));
      setError(null);
    } catch {
      if (alive.current && ticket === request.current)
        setError(
          "Өгөгдөл шинэчлэгдсэнгүй. Холболтоо шалгаад дахин оролдоно уу.",
        );
    } finally {
      if (alive.current && ticket === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [householdId]);

  const refresh = useCallback(async () => {
    if (!householdId || !alive.current) return;
    setRefreshing(true);
    await load();
  }, [householdId, load]);

  useEffect(() => {
    alive.current = true;
    if (!householdId)
      return () => {
        alive.current = false;
      };
    const channel = supabase
      .channel(`household:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => applyEvent(payload.new as HaloEvent),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => applyEvent(payload.new as HaloEvent),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "devices",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => {
        if (!alive.current) return;
        if (status === "SUBSCRIBED") {
          setRealtimeError(null);
          void refresh();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeError(
            "Шууд дохионы холболт тасарсан. Дахин холбогдохыг хүлээж байна.",
          );
        }
      });
    void Promise.resolve().then(load);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      alive.current = false;
      listener.remove();
      void supabase.removeChannel(channel);
    };
  }, [householdId, applyEvent, refresh, load]);

  const critical =
    [...events]
      .reverse()
      .find(
        (e) =>
          e.severity === "critical" &&
          e.status === "new" &&
          !dismissed.has(e.id),
      ) ?? null;
  return (
    <DataContext.Provider
      value={{
        devices,
        events,
        loading,
        refreshing,
        error,
        realtimeError,
        checkedAt,
        refresh,
        applyEvent,
        critical,
        dismissCritical: (id) => setDismissed((old) => new Set([...old, id])),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useHomes() {
  const value = useContext(HomesContext);
  if (!value) throw new Error("HouseholdProvider байхгүй байна.");
  return value;
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider байхгүй байна.");
  return value;
}
