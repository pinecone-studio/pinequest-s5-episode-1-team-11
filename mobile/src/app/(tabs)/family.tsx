import { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../providers/AuthProvider";
import { useHomes } from "../../providers/HouseholdProvider";
import { supabase } from "../../lib/supabase";
import { unregisterPush } from "../../lib/push";
import {
  CreateHousehold,
  DeleteAccount,
  JoinFamily,
  NameEditor,
  NotificationsCard,
} from "../../components/FamilyActions";
import { Rise } from "../../components/motion";
import {
  Avatar,
  Button,
  Card,
  colors,
  Header,
  HouseholdPicker,
  ListGroup,
  ListRow,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

/** The web's Family tab (settings): cameras, watched people and caregivers start here. */
export default function FamilyScreen() {
  const homes = useHomes();
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // A failed cleanup must not block sign-out; the server prunes dead tokens anyway.
      await unregisterPush().catch(() => undefined);
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
    } catch {
      Alert.alert("Гарах", "Гарч чадсангүй. Дахин оролдоно уу.");
    } finally {
      setSigningOut(false);
    }
  }
  if (homes.loading) return <Loading />;
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            tintColor={colors.primary}
            onRefresh={homes.retry}
          />
        }
      >
        <Rise style={{ gap: 12 }}>
          <Header title="Гэр бүл" />
          <HouseholdPicker />
        </Rise>
        {homes.error && <Problem text={homes.error} retry={homes.retry} />}
        {homes.household ? (
          <Rise index={1}>
            <ListGroup>
              <ListRow
                icon="videocam-outline"
                title="Камерууд"
                description="Утас, laptop, IP камер"
                onPress={() => router.push("/devices")}
              />
              <ListRow
                icon="person-outline"
                title="Хамгаалж буй хүмүүс"
                description="Нас, онцгой анхаарах зүйл"
                onPress={() => router.push("/people")}
              />
              <ListRow
                icon="people-outline"
                title="Асран хамгаалагчид"
                description="Гишүүд, урилга"
                onPress={() => router.push("/household")}
              />
            </ListGroup>
          </Rise>
        ) : (
          <>
            <Card>
              <Text style={styles.heading}>Гэр бүлд холбогдоогүй байна</Text>
              <Text style={styles.muted}>
                Шинэ гэр бүл үүсгэх эсвэл эзнээс урилга авна уу.
              </Text>
              <Button title="Дахин шалгах" secondary onPress={homes.retry} />
            </Card>
            <JoinFamily />
            <CreateHousehold />
          </>
        )}
        <Rise index={2}>
          <NotificationsCard />
        </Rise>
        <Rise index={3} style={{ gap: 12 }}>
          <Text style={[styles.section, { marginBottom: 0 }]}>Бүртгэл</Text>
          <Card>
            <View style={styles.row}>
              <Avatar name={homes.name} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.heading}>
                  {homes.name || "Миний бүртгэл"}
                </Text>
                <Text numberOfLines={1} style={styles.muted}>
                  {session?.user.email}
                </Text>
              </View>
            </View>
            <NameEditor
              key={`profile:${session?.user.id}`}
              label="Миний нэр"
              initial={homes.name}
              save={homes.saveProfileName}
            />
            <Button
              title="Бүртгэлээс гарах"
              secondary
              busy={signingOut}
              onPress={() =>
                Alert.alert("Бүртгэлээс гарах", "Halo-оос гарах уу?", [
                  { text: "Болих", style: "cancel" },
                  { text: "Гарах", onPress: () => void logout() },
                ])
              }
            />
          </Card>
          <DeleteAccount />
        </Rise>
      </ScrollView>
    </Screen>
  );
}
