import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { HouseholdProvider } from "../providers/HouseholdProvider";
import { CriticalAlert } from "../components/CriticalAlert";
import { PushSetup } from "../components/PushSetup";
import { Loading, Problem, Screen, styles } from "../components/ui";
import { View } from "react-native";

function Routes({ authenticated }: { authenticated: boolean }) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="events/[id]" />
        <Stack.Screen name="devices/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
function RootNavigator() {
  const { session, loading, error, retry } = useAuth();
  if (loading) return <Loading />;
  if (error)
    return (
      <Screen>
        <View style={styles.content}>
          <Problem text={error} retry={retry} />
        </View>
      </Screen>
    );
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
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
