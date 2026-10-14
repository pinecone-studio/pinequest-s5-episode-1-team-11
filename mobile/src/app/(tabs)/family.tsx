import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../providers/AuthProvider";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import { supabase } from "../../lib/supabase";
import type { Member } from "../../lib/types";
import { dateLabel } from "../../lib/events";
import {
  Button,
  Card,
  colors,
  HouseholdPicker,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

export default function FamilyScreen() {
  const homes = useHomes();
  const data = useData();
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
    } catch {
      Alert.alert("Гарах", "Гарч чадсангүй. Дахин оролдоно уу.");
    } finally {
      setSigningOut(false);
    }
  }
  if (homes.loading) return <Loading />;
  const owner = homes.household?.owner_id === session?.user.id;
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              homes.retry();
            }}
          />
        }
      >
        <Text style={styles.title}>Гэр бүл</Text>
        <Text style={styles.muted}>Асран хамгаалагчид ба тохиргоо</Text>
        <HouseholdPicker />
        {homes.error && <Problem text={homes.error} retry={homes.retry} />}
        <Card>
          <View style={styles.row}>
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>
                {homes.name || "Миний бүртгэл"}
              </Text>
              <Text style={styles.muted}>{session?.user.email}</Text>
            </View>
          </View>
          <NameEditor
            key={`profile:${session?.user.id}`}
            label="Миний нэр"
            initial={homes.name}
            save={homes.saveProfileName}
          />
        </Card>
        {homes.household ? (
          <>
            <Card>
              <Text style={styles.heading}>{homes.household.name}</Text>
              <Text style={styles.muted}>
                {owner ? "Та гэр бүлийн эзэн" : "Та асран хамгаалагч"}
              </Text>
              {owner ? (
                <NameEditor
                  key={homes.household.id}
                  label="Гэр бүлийн нэр"
                  initial={homes.household.name}
                  save={homes.saveHouseholdName}
                />
              ) : (
                <Text style={styles.muted}>
                  Гэр бүлийн эзэн нэрийг өөрчилнө.
                </Text>
              )}
            </Card>
            <Text style={styles.heading}>Асран хамгаалагчид</Text>
            <Members
              key={homes.household.id}
              householdId={homes.household.id}
              userId={session!.user.id}
              ownName={homes.name}
            />
            <Text style={styles.heading}>Камер ба төхөөрөмж</Text>
            {data.error && (
              <Problem
                text={data.error}
                retry={() => {
                  void data.refresh();
                }}
              />
            )}
            {data.devices.map((device) => (
              <Card key={device.id}>
                <View style={styles.row}>
                  <Ionicons
                    name={
                      device.kind === "phone"
                        ? "phone-portrait-outline"
                        : device.kind === "laptop"
                          ? "laptop-outline"
                          : "videocam-outline"
                    }
                    color={colors.primary}
                    size={22}
                  />
                  <Text style={[styles.heading, { flex: 1 }]}>
                    {device.name}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      device.status !== "online" && { color: "#FBBF24" },
                    ]}
                  >
                    {device.status === "online"
                      ? "Онлайн"
                      : device.status === "pairing"
                        ? "Холбож байна"
                        : "Салсан"}
                  </Text>
                </View>
                <Text style={styles.muted}>
                  {device.room_name || "Өрөө тодорхойгүй"}
                </Text>
                <Text style={styles.muted}>
                  Сүүлийн холболт:{" "}
                  {device.last_seen_at
                    ? dateLabel(device.last_seen_at)
                    : "Тодорхойгүй"}
                </Text>
              </Card>
            ))}
            {!data.devices.length && (
              <Text style={styles.muted}>
                {data.loading ? "Ачаалж байна…" : "Төхөөрөмж нэмэгдээгүй."}
              </Text>
            )}
          </>
        ) : (
          <Card>
            <Text style={styles.heading}>Гэр бүлд холбогдоогүй байна</Text>
            <Text style={styles.muted}>
              Гэр бүлийн эзнээр өөрийгөө асран хамгаалагч болгон нэмүүлнэ үү.
            </Text>
            <Button title="Дахин шалгах" secondary onPress={homes.retry} />
          </Card>
        )}
        <Button
          title="Бүртгэлээс гарах"
          secondary
          busy={signingOut}
          onPress={() =>
            Alert.alert("Бүртгэлээс гарах", "Halo-оос гарах уу?", [
              { text: "Болих", style: "cancel" },
              {
                text: "Гарах",
                onPress: () => {
                  void logout();
                },
              },
            ])
          }
        />
      </ScrollView>
    </Screen>
  );
}

function NameEditor({
  label,
  initial,
  save,
}: {
  label: string;
  initial: string;
  save: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save(value);
      setValue(value.trim());
      setMessage("Хадгалагдлаа");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Хадгалж чадсангүй.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setMessage("");
        }}
        placeholder={label}
        placeholderTextColor={colors.muted}
        maxLength={60}
        editable={!busy}
      />
      <Button
        title="Хадгалах"
        busy={busy}
        disabled={!value.trim() || value.trim() === initial}
        onPress={() => {
          void submit();
        }}
      />
      {message ? (
        <Text accessibilityRole="alert" style={styles.badge}>
          {message}
        </Text>
      ) : null}
      {error ? <Problem text={error} /> : null}
    </View>
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
  const [list, setList] = useState<(Member & { name: string | null })[]>([]);
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
  return (
    <View style={{ gap: 10 }}>
      {list.map((member) => (
        <Card key={member.user_id}>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>
                {member.user_id === userId
                  ? ownName || "Би"
                  : member.name || "Асран хамгаалагч"}
                {member.user_id === userId ? " · Та" : ""}
              </Text>
              <Text style={styles.muted}>
                {member.role === "owner"
                  ? "Гэр бүлийн эзэн"
                  : "Асран хамгаалагч"}
              </Text>
            </View>
          </View>
        </Card>
      ))}
      {!list.length && (
        <Text style={styles.muted}>
          Харах боломжтой гишүүний мэдээлэл алга.
        </Text>
      )}
    </View>
  );
}
