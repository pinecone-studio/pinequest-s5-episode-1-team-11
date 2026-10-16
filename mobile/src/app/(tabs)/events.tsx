import { useState } from "react";
import { SectionList, Pressable, Text, View } from "react-native";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import {
  colors,
  HouseholdPicker,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

import { EventRow } from "../../components/EventRow";

const filters = [
  { id: "all", label: "Бүгд" },
  { id: "fall", label: "Унах" },
  { id: "sound", label: "Дуу" },
  { id: "device", label: "Төхөөрөмж" },
] as const;
export default function EventsScreen() {
  const homes = useHomes();
  const data = useData();
  const [filter, setFilter] = useState<string>("all");
  if (homes.loading) return <Loading />;
  const list = data.events.filter(
    (event) =>
      filter === "all" ||
      (filter === "fall" && event.kind === "fall") ||
      (filter === "sound" &&
        ["scream", "cry", "glass", "alarm"].includes(event.kind)) ||
      (filter === "device" && ["offline", "test"].includes(event.kind)),
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
          <View style={{ gap: 16 }}>
            <Text style={styles.title}>Үйл явдал</Text>
            <Text style={styles.muted}>
              Сүүлийн 100 дохио · Шинээс хуучин руу
            </Text>
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
            <View
              style={{
                flexDirection: "row",
                borderRadius: 25,
                backgroundColor: "#0D2830",
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 8,
                padding: 4,
              }}
            >
              {filters.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setFilter(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item.id }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 4,
                    borderRadius: 22,
                    backgroundColor:
                      filter === item.id ? "#29484D" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: filter === item.id ? colors.text : colors.muted,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.muted,
              {
                fontWeight: "700",
                fontSize: 12,
                paddingTop: 14,
                paddingBottom: 12,
              },
            ]}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <EventRow event={item} />}
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
