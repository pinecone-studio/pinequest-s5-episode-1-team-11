import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import {
  colors,
  EventCard,
  HouseholdPicker,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

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
  return (
    <Screen>
      <FlatList
        data={list}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.content}
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
                backgroundColor: colors.card,
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
                      filter === item.id ? "#2B5156" : "transparent",
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
        renderItem={({ item }) => <EventCard event={item} />}
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
