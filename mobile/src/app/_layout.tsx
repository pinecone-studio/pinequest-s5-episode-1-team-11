import { Stack } from "expo-router";
import { useFonts } from "expo-font";
// Per-weight imports keep the other weights out of the bundle.
import { Onest_500Medium } from "@expo-google-fonts/onest/500Medium";
import { Onest_600SemiBold } from "@expo-google-fonts/onest/600SemiBold";
import { Onest_700Bold } from "@expo-google-fonts/onest/700Bold";
import { Geologica_600SemiBold } from "@expo-google-fonts/geologica/600SemiBold";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { HouseholdProvider } from "../providers/HouseholdProvider";
import { CriticalAlert } from "../components/CriticalAlert";
import { PushSetup } from "../components/PushSetup";
import { Onboarding, useOnboarding } from "../components/Onboarding";
import { colors, Loading, Problem, Screen, styles } from "../components/ui";
import { View } from "react-native";

function Routes({ authenticated }: { authenticated: boolean }) {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="events/[id]" />
        <Stack.Screen name="devices/index" />
        <Stack.Screen name="devices/new" />
        <Stack.Screen name="devices/[id]" />
        <Stack.Screen name="people" />
        <Stack.Screen name="household" />
        <Stack.Screen name="live/[id]" />
        <Stack.Screen name="monitor" />
      </Stack.Protected>
    </Stack>
  );
}
function RootNavigator() {
  const { session, loading, error, retry } = useAuth();
  const onboarding = useOnboarding();
  if (loading || onboarding.seen === null) return <Loading />;
  if (error)
    return (
      <Screen>
        <View style={styles.content}>
          <Problem text={error} retry={retry} />
        </View>
      </Screen>
    );
  if (!session && !onboarding.seen)
    return <Onboarding done={onboarding.done} />;
  if (!session) return <Routes authenticated={false} />;
  return (
    <HouseholdProvider key={session.user.id}>
      <Routes authenticated />
      <CriticalAlert />
      <PushSetup />
    </HouseholdProvider>
  );
}
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Geologica_600SemiBold,
  });
  // A font that fails to load falls back to the system font rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
