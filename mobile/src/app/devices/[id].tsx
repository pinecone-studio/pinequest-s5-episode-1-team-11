import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import type { DetectionSettings } from "../../lib/types";
import { useData } from "../../providers/HouseholdProvider";
import {
  Button,
  Card,
  colors,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

const toggles = [
  ["fall", "Уналт"],
  ["distress", "Орилох, удаан уйлах"],
  ["hazard", "Шил хагарах, галын дохио"],
] as const;

type Form = { name: string; room: string; settings: DetectionSettings };

export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("devices")
      .select("name, room_name, settings")
      .eq("id", id)
      .maybeSingle()
      .then(({ data: row, error: failed }) => {
        if (failed || !row) return setError("Төхөөрөмж олдсонгүй.");
        setForm({
          name: row.name,
          room: row.room_name ?? "",
          settings: row.settings,
        });
      });
  }, [id]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    // shortcut: last write wins if two caregivers edit at once; add a version check if that bites.
    const { data: row, error: failed } = await supabase
      .from("devices")
      .update({
        name: form.name.trim(),
        room_name: form.room.trim(),
        settings: form.settings,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    setBusy(false);
    if (failed || !row) return setError("Хадгалж чадсангүй.");
    void data.refresh();
    router.back();
  }

  function remove() {
    Alert.alert(
      "Төхөөрөмж устгах",
      "Энэ камер салж, дахин холбохдоо шинэ код хэрэгтэй болно.",
      [
        { text: "Болих", style: "cancel" },
        {
          text: "Устгах",
          style: "destructive",
          onPress: () => {
            void supabase
              .from("devices")
              .delete()
              .eq("id", id)
              .select("id")
              .maybeSingle()
              .then(({ data: row, error: failed }) => {
                if (failed || !row) return setError("Устгаж чадсангүй.");
                void data.refresh();
                router.back();
              });
          },
        },
      ],
    );
  }

  if (!form)
    return error ? (
      <Screen>
        <View style={styles.content}>
          <Problem text={error} />
        </View>
      </Screen>
    ) : (
      <Loading />
    );
  const set = (patch: Partial<DetectionSettings>) =>
    setForm({ ...form, settings: { ...form.settings, ...patch } });
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Button title="Буцах" textOnly onPress={() => router.back()} />
        <Text style={styles.title}>{form.name}</Text>
        <Card>
          <Text style={styles.muted}>Нэр</Text>
          <TextInput
            accessibilityLabel="Нэр"
            style={styles.input}
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            maxLength={60}
          />
          <Text style={styles.muted}>Өрөө</Text>
          <TextInput
            accessibilityLabel="Өрөө"
            style={styles.input}
            value={form.room}
            onChangeText={(room) => setForm({ ...form, room })}
            maxLength={60}
          />
        </Card>
        <Card>
          <Text style={styles.heading}>Юуг илрүүлэх</Text>
          {toggles.map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
              <Switch
                accessibilityLabel={label}
                value={form.settings[key]}
                onValueChange={(on) => set({ [key]: on })}
                trackColor={{ true: colors.primary }}
              />
            </View>
          ))}
        </Card>
        {error ? <Problem text={error} /> : null}
        <Button
          title="Хадгалах"
          busy={busy}
          disabled={!form.name.trim() || !form.room.trim()}
          onPress={() => void save()}
        />
        <Button title="Төхөөрөмж устгах" secondary onPress={remove} />
      </ScrollView>
    </Screen>
  );
}
