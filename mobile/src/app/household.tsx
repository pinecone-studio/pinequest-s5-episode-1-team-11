import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { useHomes } from "../providers/HouseholdProvider";
import { supabase } from "../lib/supabase";
import type { Member } from "../lib/types";
import { InviteCard, NameEditor } from "../components/FamilyActions";
import { MotionPressable as Pressable, Rise } from "../components/motion";
import {
  Avatar,
  BackBar,
  Card,
  colors,
  ListGroup,
  ListRow,
  Pill,
  Problem,
  Screen,
  styles,
} from "../components/ui";

/** The web's caregivers page: family members, ownership transfer and invites. */
export default function HouseholdScreen() {
  const homes = useHomes();
  const { session } = useAuth();
  const household = homes.household;
  const owner = household?.owner_id === session?.user.id;
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
        <BackBar title="Асран хамгаалагчид" />
        <Text style={styles.muted}>Мэдэгдэл авч, дохиог шалгах хүмүүс</Text>
        {household && session && (
          <>
            {owner && (
              <Rise>
                <Card>
                  <NameEditor
                    key={household.id}
                    label="Гэр бүлийн нэр"
                    initial={household.name}
                    save={homes.saveHouseholdName}
                  />
                </Card>
              </Rise>
            )}
            <Rise index={1} style={{ gap: 12 }}>
              <Text style={[styles.section, { marginBottom: 0 }]}>Гэр бүлийн гишүүд</Text>
              <Members
                key={household.id}
                householdId={household.id}
                userId={session.user.id}
                ownName={homes.name}
              />
            </Rise>
            {owner && (
              <Rise index={2}>
                <InviteCard />
              </Rise>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Members(props: {
  householdId: string;
  userId: string;
  ownName: string;
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <MemberList
      key={`${props.householdId}:${attempt}`}
      {...props}
      retry={() => setAttempt((value) => value + 1)}
    />
  );
}
function MemberList({
  householdId,
  userId,
  ownName,
  retry,
}: {
  householdId: string;
  userId: string;
  ownName: string;
  retry: () => void;
}) {
  const homes = useHomes();
  const owner = homes.household?.owner_id === userId;
  const [list, setList] = useState<(Member & { name: string | null })[]>([]);
  function transfer(id: string, name: string | null) {
    Alert.alert(
      "Эзний эрх шилжүүлэх",
      `${name || "Энэ асран хамгаалагч"} гэр бүлийн эзэн болно. Та асран хамгаалагч болно.`,
      [
        { text: "Болих", style: "cancel" },
        {
          text: "Шилжүүлэх",
          onPress: () => {
            void supabase
              .rpc("transfer_household_ownership", { p_new_owner: id })
              .then(({ error: failed }) => {
                if (failed) Alert.alert("Эзний эрх", "Шилжүүлж чадсангүй.");
                else homes.retry();
              });
          },
        },
      ],
    );
  }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    async function load() {
      const members = await supabase
        .from("household_members")
        .select("*")
        .eq("household_id", householdId);
      if (members.error) throw members.error;
      const ids = [
        ...new Set((members.data ?? []).map((member) => member.user_id)),
      ];
      const profiles = ids.length
        ? await supabase.from("profiles").select("*").in("id", ids)
        : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      if (alive)
        setList(
          (members.data ?? []).map((member) => ({
            ...member,
            name:
              profiles.data?.find((profile) => profile.id === member.user_id)
                ?.name ?? null,
          })),
        );
    }
    void load()
      .catch(() => {
        if (alive)
          setError(
            "Асран хамгаалагчдын мэдээллийг уншиж чадсангүй. Холболт болон гэр бүлийн мэдээлэл харах эрхээ шалгана уу.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [householdId]);
  if (loading) return <ActivityIndicator color={colors.primary} />;
  if (error) return <Problem text={error} retry={retry} />;
  if (!list.length)
    return <Text style={styles.muted}>Харах боломжтой гишүүний мэдээлэл алга.</Text>;
  return (
    <ListGroup>
      {list.map((member) => {
        const me = member.user_id === userId;
        const name = me ? ownName || "Би" : member.name || "Асран хамгаалагч";
        return (
          <ListRow
            key={member.user_id}
            leading={<Avatar name={name} />}
            title={name}
            description={me ? "Та" : undefined}
            trailing={
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Pill
                  label={member.role === "owner" ? "Эзэн" : "Асран хамгаалагч"}
                  tone={member.role === "owner" ? "ok" : "rest"}
                />
                {owner && member.role === "caregiver" && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => transfer(member.user_id, member.name)}
                    style={{ minHeight: 32, justifyContent: "center" }}
                  >
                    <Text style={styles.badge}>Эзэн болгох</Text>
                  </Pressable>
                )}
              </View>
            }
          />
        );
      })}
    </ListGroup>
  );
}
