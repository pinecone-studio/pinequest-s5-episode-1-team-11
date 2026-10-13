import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./ui";

const tabs = {
  index: { label: "Нүүр", icon: "home-outline" },
  events: { label: "Үйл явдал", icon: "notifications-outline" },
  family: { label: "Гэр бүл", icon: "people-outline" },
} as const;
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export function HaloTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[local.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={local.bar}>
        {state.routes.map((route, index) => {
          const tab = tabs[route.name as keyof typeof tabs];
          if (!tab) return null;
          const selected = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={({ pressed }) => [
                local.tab,
                selected && local.selected,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={21}
                color={selected ? colors.primary : colors.muted}
              />
              <Text style={[local.label, selected && { color: colors.text }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const local = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: "#11282E",
    borderWidth: 1,
    borderColor: "#30484C",
    borderRadius: 38,
    padding: 5,
  },
  tab: {
    flex: 1,
    minHeight: 53,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selected: { backgroundColor: "#294348", borderColor: "#3A5559" },
  label: { color: colors.muted, fontSize: 10, fontWeight: "700" },
});
