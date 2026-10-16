import { Tabs } from "expo-router";
import { HaloTabBar } from "../../components/HaloTabBar";
import { colors } from "../../components/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: colors.bg },
      }}
      tabBar={(props) => <HaloTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Нүүр" }} />
      <Tabs.Screen name="events" options={{ title: "Үйл явдал" }} />
      <Tabs.Screen name="family" options={{ title: "Гэр бүл" }} />
    </Tabs>
  );
}
