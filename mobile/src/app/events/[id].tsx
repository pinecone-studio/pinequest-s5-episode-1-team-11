import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
} from "react-native";
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
import {
  Button,
  Card,
  colors,
  EventActions,
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
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={colors.primary}
            onRefresh={() => setAttempt((n) => n + 1)}
          />
        }
      >
        <Button
          title="Буцах"
          secondary
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
        />
        {loading && <ActivityIndicator color={colors.primary} />}
        {error && (
          <Problem text={error} retry={() => setAttempt((n) => n + 1)} />
        )}
        {event && (
          <>
            <Text style={styles.title}>{kindLabel[event.kind]}</Text>
            <Text style={styles.muted}>
              {[event.person_name, event.room_name]
                .filter(Boolean)
                .join(" · ") || "Байршил тодорхойгүй"}
            </Text>
            <Snapshot
              key={`${event.id}:${event.snapshot_path}`}
              path={event.snapshot_path}
            />
            <Card>
              <Text style={styles.text}>
                Илэрсэн: {dateLabel(event.occurred_at)}
              </Text>
              <Text style={styles.text}>
                Түвшин: {severityLabel[event.severity]}
              </Text>
              <Text style={styles.text}>
                Төлөв: {statusLabel[event.status]}
              </Text>
              {event.confidence != null && (
                <Text style={styles.text}>
                  Итгэлцүүр: {Math.round(event.confidence * 100)}%
                </Text>
              )}
              {event.acknowledged_at && (
                <Text style={styles.muted}>
                  Харсан: {dateLabel(event.acknowledged_at)}
                </Text>
              )}
              {event.note && <Text style={styles.muted}>{event.note}</Text>}
            </Card>
            <EventActions key={event.id} event={event} onUpdated={setSaved} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
