import { useEffect } from "react";
import {
  AppState,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  Vibration,
  View,
  Alert,
} from "react-native";
import { dateLabel, kindLabel } from "../lib/events";
import { useData } from "../providers/HouseholdProvider";
import { Snapshot } from "./Snapshot";
import { Button, EventActions, Screen, styles } from "./ui";

export function CriticalAlert() {
  const { critical, dismissCritical } = useData();
  const id = critical?.id;
  useEffect(() => {
    if (!id) return;
    const vibrate = () =>
      Vibration.vibrate(
        Platform.OS === "ios" ? [0, 450, 450] : [0, 450, 180, 450],
        false,
      );
    if (AppState.currentState === "active") vibrate();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") vibrate();
      else Vibration.cancel();
    });
    return () => {
      listener.remove();
      Vibration.cancel();
    };
  }, [id]);
  if (!critical) return null;
  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => dismissCritical(critical.id)}
    >
      <Screen danger>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.row}>
            <Button
              title="Хаах"
              secondary
              onPress={() => dismissCritical(critical.id)}
            />
            <Text style={[styles.badge, { color: "#FFB3BB" }]}>● ЯАРАЛТАЙ</Text>
          </View>
          <Text style={styles.muted}>{dateLabel(critical.occurred_at)}</Text>
          <Text style={[styles.title, { fontSize: 34 }]}>
            {kindLabel[critical.kind]}
          </Text>
          <Text style={styles.heading}>
            {[critical.person_name, critical.room_name]
              .filter(Boolean)
              .join(" · ") || "Байршил тодорхойгүй"}
          </Text>
          <Snapshot
            key={`snapshot:${critical.id}`}
            path={critical.snapshot_path}
          />
          <Text style={styles.muted}>
            Илрүүлсэн агшин · {dateLabel(critical.occurred_at)}
          </Text>
          <EventActions key={critical.id} event={critical} />
          <Button
            title="103 руу залгах"
            secondary
            onPress={() => {
              void Linking.openURL("tel:103").catch(() =>
                Alert.alert(
                  "Дуудлага",
                  "Энэ төхөөрөмжөөс дуудлага хийх боломжгүй байна.",
                ),
              );
            }}
          />
          <Text style={styles.muted}>
            Хаах нь дохиог “Харсан” гэж тэмдэглэхгүй.
          </Text>
        </ScrollView>
      </Screen>
    </Modal>
  );
}
