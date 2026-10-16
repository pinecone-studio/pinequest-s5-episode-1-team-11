import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  dateLabel,
  getEvent,
  kindLabel,
  severityLabel,
  statusLabel,
} from "../../lib/events";
import type { HaloEvent } from "../../lib/types";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import { Snapshot } from "../../components/Snapshot";
import { confidenceLabel, severityTint } from "../../components/EventRow";
import { Rise } from "../../components/motion";
import {
  BackBar,
  colors,
  EventActions,
  fonts,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { household } = useHomes();
  const { events } = useData();
  const [saved, setSaved] = useState<HaloEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const householdId = household?.id;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setSaved(null);
      setError(null);
      setLoading(true);
      if (!id || !householdId) {
        setError("Дохио эсвэл гэр бүл сонгогдоогүй байна.");
        setLoading(false);
        return () => {
          alive = false;
        };
      }
      void getEvent(id, householdId)
        .then((row) => {
          if (alive) setSaved(row);
        })
        .catch(() => {
          if (alive) setError("Дохио олдсонгүй эсвэл ачаалах боломжгүй байна.");
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
      // Refresh revision intentionally reruns the focused query.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, householdId, attempt]),
  );
  const event =
    events.find((e) => e.id === id && e.household_id === householdId) ??
    (saved?.id === id && saved.household_id === householdId ? saved : null);
  const [tint, ink] = event ? severityTint[event.severity] : severityTint.info;
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40, gap: 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={colors.primary}
            onRefresh={() => setAttempt((n) => n + 1)}
          />
        }
      >
        <BackBar title={event ? kindLabel[event.kind] : "Дохио"} />
        {error && <Problem text={error} retry={() => setAttempt((n) => n + 1)} />}
        {event && (
          <>
            <Rise style={[styles.card, local.state]}>
              <View style={[local.stateIcon, { backgroundColor: `${tint}2E` }]}>
                <Ionicons
                  name={event.status === "new" ? "alert-circle-outline" : "checkmark"}
                  size={24}
                  color={event.status === "new" ? ink : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>{statusLabel[event.status]}</Text>
                <Text style={styles.muted}>
                  {event.acknowledged_at
                    ? `Харсан: ${dateLabel(event.acknowledged_at)}`
                    : `${severityLabel[event.severity]} · ${dateLabel(event.occurred_at)}`}
                </Text>
              </View>
            </Rise>
            <Rise index={1}>
              <Snapshot key={`${event.id}:${event.snapshot_path}`} path={event.snapshot_path} />
            </Rise>
            <Rise index={2} style={{ flexDirection: "row", gap: 8 }}>
              {[
                ["Итгэлцэл", confidenceLabel(event.confidence)],
                ["Түвшин", severityLabel[event.severity]],
                [
                  "Цаг",
                  new Date(event.occurred_at).toLocaleTimeString("mn-MN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ],
              ].map(([label, value]) => (
                <View key={label} style={[styles.card, local.signal]}>
                  <Text numberOfLines={1} style={local.signalLabel}>
                    {label}
                  </Text>
                  <Text numberOfLines={1} style={local.signalValue}>
                    {value}
                  </Text>
                </View>
              ))}
            </Rise>
            <Rise index={3} style={{ gap: 4, paddingLeft: 4 }}>
              <Text style={styles.muted}>
                {[event.person_name, event.room_name].filter(Boolean).join(" · ") ||
                  "Байршил тодорхойгүй"}
              </Text>
              {event.note && <Text style={styles.muted}>{event.note}</Text>}
            </Rise>
            <Rise index={4}>
              <EventActions key={event.id} event={event} onUpdated={setSaved} />
            </Rise>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
const local = StyleSheet.create({
  state: { flexDirection: "row", alignItems: "center", gap: 12 },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  signal: { flex: 1, padding: 12, borderRadius: 18, gap: 8, minWidth: 0 },
  signalLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  signalValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
});
