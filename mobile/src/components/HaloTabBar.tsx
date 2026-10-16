import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ComponentProps } from "react";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useData } from "../providers/HouseholdProvider";
import { haptic, SlidingPill, springs } from "./motion";
import { colors, fonts } from "./ui";

const tabs = {
  index: { label: "Нүүр", icon: "home" },
  events: { label: "Үйл явдал", icon: "notifications" },
  family: { label: "Гэр бүл", icon: "people" },
} as const;
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export function HaloTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const unread = useData().events.filter((event) => event.status === "new").length;
  return (
    <View
      style={[local.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View
        style={local.bar}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <SlidingPill
          index={state.index}
          count={state.routes.length}
          width={width}
          inset={6}
          radius={29}
        />
        {state.routes.map((route, index) => {
          const tab = tabs[route.name as keyof typeof tabs];
          if (!tab) return null;
          const selected = state.index === index;
          const badge = route.name === "events" && unread > 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={badge ? `${tab.label}, ${unread} шинэ` : tab.label}
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented) {
                  haptic.tick();
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={local.tab}
            >
              <TabIcon name={tab.icon} selected={selected} />
              <Text style={[local.label, selected && { color: colors.text }]}>
                {tab.label}
              </Text>
              {badge && <Text style={local.badge}>{unread > 99 ? "99+" : unread}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The selected icon pops in on a bouncy spring, as in the prototype. */
function TabIcon({
  name,
  selected,
}: {
  name: (typeof tabs)[keyof typeof tabs]["icon"];
  selected: boolean;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (selected)
      scale.set(
        withSequence(withTiming(0.72, { duration: 0 }), withSpring(1, springs.bouncy)),
      );
  }, [selected, scale]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={motion}>
      <Ionicons
        name={selected ? name : `${name}-outline`}
        size={24}
        color={selected ? colors.primary : colors.muted}
      />
    </Animated.View>
  );
}
const local = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
  },
  bar: {
    flexDirection: "row",
    height: 70,
    padding: 8,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassStrong,
    boxShadow: "0px 20px 40px -24px rgba(2,6,23,0.9)",
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  badge: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.dangerButton,
    color: "#000000",
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
});
