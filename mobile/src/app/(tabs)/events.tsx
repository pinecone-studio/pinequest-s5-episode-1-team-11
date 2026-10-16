import { haptic, Rise, SlidingPill } from "../../components/motion";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import {
  colors,
  fonts,
  HouseholdPicker,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

import { EventRow } from "../../components/EventRow";

// The web's filters (src/features/events/components/event-timeline.tsx).
const filters = [
  { id: "all", label: "Бүгд" },
  { id: "new", label: "Шинэ" },
  { id: "critical", label: "Аюултай" },
] as const;
export default function EventsScreen() {
  const homes = useHomes();
  const data = useData();
  const [filter, setFilter] = useState<string>("all");
  const [width, setWidth] = useState(0);
  if (homes.loading) return <Loading />;
  const list = data.events.filter(
    (event) =>
      filter === "all" ||
      (filter === "new" && event.status === "new") ||
      (filter === "critical" && event.severity === "critical"),
  );
  const today = new Date();
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  const dateKey = (iso: string) => {
    const date = new Date(iso);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };
  const groups = new Map<string, { title: string; data: typeof list }>();
  for (const event of list) {
    const key = dateKey(event.occurred_at);
    if (!groups.has(key))
      groups.set(key, {
        title:
          key === dateKey(today.toISOString())
            ? "Өнөөдөр"
            : key === dateKey(yesterday.toISOString())
              ? "Өчигдөр"
              : new Date(event.occurred_at).toLocaleDateString("mn-MN", {
                  month: "long",
                  day: "numeric",
                }),
        data: [],
      });
    groups.get(key)!.data.push(event);
  }
  return (
    <Screen>
      <SectionList
        sections={[...groups.values()]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyExtractor={(event) => event.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 116 }}
        refreshing={data.refreshing}
        onRefresh={() => {
          if (homes.error) homes.retry();
          else void data.refresh();
        }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            <Rise style={{ gap: 2 }}>
              <Text style={styles.title}>Үйл явдал</Text>
              <Text style={[styles.muted, { fontFamily: fonts.semibold }]}>
                Танай гэр бүлийн аюулгүй байдлын түүх
              </Text>
            </Rise>
            <HouseholdPicker />
            {homes.error && <Problem text={homes.error} retry={homes.retry} />}
            {data.error && (
              <Problem
                text={data.error}
                retry={() => {
                  void data.refresh();
                }}
              />
            )}
            {data.realtimeError && <Problem text={data.realtimeError} />}
            <Rise
              index={1}
              style={[styles.card, { flexDirection: "row", padding: 4, borderRadius: 26 }]}
            >
              <View
                accessibilityRole="tablist"
                style={{ flex: 1, flexDirection: "row" }}
                onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
              >
                <SlidingPill
                  index={filters.findIndex((item) => item.id === filter)}
                  count={filters.length}
                  width={width}
                  inset={0}
                  radius={22}
                />
                {filters.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (filter !== item.id) haptic.tick();
                      setFilter(item.id);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === item.id }}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: filter === item.id ? colors.text : colors.muted,
                        fontFamily: fonts.bold,
                        fontSize: 13,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Rise>
            <Text style={[styles.muted, { fontSize: 13, paddingLeft: 4 }]}>
              {list.length} үйл явдал
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { marginBottom: 0, paddingTop: 16, paddingBottom: 12 }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index }) => (
          <Rise key={`${filter}:${item.id}`} index={index}>
            <EventRow event={item} />
          </Rise>
        )}
        ListFooterComponent={
          <View style={{ gap: 12, paddingTop: 8 }}>
            {list.some((event) => event.status === "new") && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="hand-left-outline" size={20} color={colors.muted} />
                <Text style={[styles.muted, { flex: 1 }]}>
                  Шинэ дохиог зүүн тийш шудрахад “Харлаа” гарна
                </Text>
              </View>
            )}
            <Text style={[styles.muted, { fontSize: 13 }]}>
              Сүүлийн 100 хүртэлх үйл явдлыг харуулна.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text
            style={[styles.muted, { textAlign: "center", paddingVertical: 35 }]}
          >
            {!homes.household
              ? "Гэр бүлд холбогдоогүй байна."
              : data.loading
                ? "Ачаалж байна…"
                : "Энэ төрлийн дохио алга."}
          </Text>
        }
      />
    </Screen>
  );
}
