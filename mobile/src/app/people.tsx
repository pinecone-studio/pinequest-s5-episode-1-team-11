import { ScrollView, Text } from "react-native";
import { useHomes } from "../providers/HouseholdProvider";
import { WatchedPeople } from "../components/WatchedPeople";
import { BackBar, Screen, styles } from "../components/ui";

/** The web's watched people page. */
export default function PeopleScreen() {
  const { household } = useHomes();
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackBar title="Хамгаалж буй хүмүүс" />
        <Text style={styles.muted}>Асран хамгаалагчдад хэрэгтэй мэдээллийг нэг дор хадгална</Text>
        {household && <WatchedPeople householdId={household.id} />}
      </ScrollView>
    </Screen>
  );
}
