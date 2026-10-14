import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import type { WatchedPerson } from "../lib/types";
import { Button, Card, colors, Problem, styles } from "./ui";

const kinds = [
  ["elderly", "Ахмад настан"],
  ["child", "Хүүхэд"],
  ["disabled", "Хөгжлийн бэрхшээлтэй"],
] as const;
type Draft = {
  id: string;
  name: string;
  kind: WatchedPerson["kind"];
  age: string;
  notes: string;
  phone: string;
};
const empty: Draft = {
  id: "",
  name: "",
  kind: "elderly",
  age: "",
  notes: "",
  phone: "",
};

/** The people this family looks after: same fields and limits as the web (and the DB checks). */
export function WatchedPeople({ householdId }: { householdId: string }) {
  const [people, setPeople] = useState<WatchedPerson[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [version, setVersion] = useState(0);
  const load = () => setVersion((value) => value + 1);
  useEffect(() => {
    let alive = true;
    void supabase
      .from("watched_people")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at")
      .then(({ data, error: failed }) => {
        if (!alive) return;
        if (failed) setError("Хүмүүсийн мэдээллийг уншиж чадсангүй.");
        else setPeople(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, [householdId, version]);

  async function save() {
    if (!draft) return;
    const age = draft.age.trim() === "" ? null : Number(draft.age);
    const phone = draft.phone.trim();
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130))
      return setError("Нас 0–130 хооронд бүхэл тоо байна.");
    if (phone && !(/^[+\d ()-]+$/.test(phone) && /\d/.test(phone)))
      return setError("Утасны дугаар буруу байна.");
    setBusy(true);
    setError("");
    const values = {
      name: draft.name.trim(),
      kind: draft.kind,
      age,
      notes: draft.notes.trim() || null,
      emergency_phone: phone || null,
    };
    const result = draft.id
      ? await supabase
          .from("watched_people")
          .update(values)
          .eq("id", draft.id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("watched_people")
          .insert({ ...values, household_id: householdId })
          .select("id")
          .single();
    setBusy(false);
    if (result.error || !result.data) return setError("Хадгалж чадсангүй.");
    setDraft(null);
    load();
  }

  function remove(person: WatchedPerson) {
    Alert.alert("Хүн хасах", `${person.name}-г жагсаалтаас хасах уу?`, [
      { text: "Болих", style: "cancel" },
      {
        text: "Хасах",
        style: "destructive",
        onPress: () => {
          void supabase
            .from("watched_people")
            .delete()
            .eq("id", person.id)
            .then(({ error: failed }) => {
              if (failed) setError("Хасаж чадсангүй.");
              else load();
            });
        },
      },
    ]);
  }

  if (draft)
    return (
      <Card>
        <Text style={styles.heading}>
          {draft.id ? "Мэдээлэл засах" : "Хүн нэмэх"}
        </Text>
        <Field
          label="Нэр"
          value={draft.name}
          max={60}
          set={(name) => setDraft({ ...draft, name })}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {kinds.map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: draft.kind === key }}
              onPress={() => setDraft({ ...draft, kind: key })}
              style={[
                styles.buttonSecondary,
                {
                  borderRadius: 22,
                  minHeight: 44,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                },
                draft.kind === key && { borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.text,
                  draft.kind === key && { color: colors.primary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Нас"
          value={draft.age}
          max={3}
          numeric
          set={(age) => setDraft({ ...draft, age })}
        />
        <Field
          label="Яаралтай үед залгах дугаар"
          value={draft.phone}
          max={30}
          phone
          set={(phone) => setDraft({ ...draft, phone })}
        />
        <Field
          label="Тэмдэглэл (эм, онцлог)"
          value={draft.notes}
          max={300}
          set={(notes) => setDraft({ ...draft, notes })}
        />
        {error ? <Problem text={error} /> : null}
        <Button
          title="Хадгалах"
          busy={busy}
          disabled={!draft.name.trim()}
          onPress={() => void save()}
        />
        <Button title="Болих" secondary onPress={() => setDraft(null)} />
      </Card>
    );
  return (
    <View style={{ gap: 10 }}>
      {people.map((person) => (
        <Card key={person.id}>
          <Text style={styles.heading}>{person.name}</Text>
          <Text style={styles.muted}>
            {kinds.find(([key]) => key === person.kind)?.[1]}
            {person.age !== null ? ` · ${person.age} настай` : ""}
          </Text>
          {person.notes ? (
            <Text style={styles.text}>{person.notes}</Text>
          ) : null}
          {person.emergency_phone ? (
            <Button
              title={`Залгах: ${person.emergency_phone}`}
              secondary
              onPress={() =>
                void Linking.openURL(`tel:${person.emergency_phone}`)
              }
            />
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Засах"
                secondary
                onPress={() =>
                  setDraft({
                    id: person.id,
                    name: person.name,
                    kind: person.kind,
                    age: person.age === null ? "" : String(person.age),
                    notes: person.notes ?? "",
                    phone: person.emergency_phone ?? "",
                  })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Хасах" secondary onPress={() => remove(person)} />
            </View>
          </View>
        </Card>
      ))}
      {error ? <Problem text={error} retry={() => void load()} /> : null}
      <Button title="Хүн нэмэх" secondary onPress={() => setDraft(empty)} />
    </View>
  );
}

function Field({
  label,
  value,
  set,
  max,
  numeric = false,
  phone = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  max: number;
  numeric?: boolean;
  phone?: boolean;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      style={styles.input}
      value={value}
      onChangeText={set}
      placeholder={label}
      placeholderTextColor={colors.muted}
      maxLength={max}
      keyboardType={numeric ? "number-pad" : phone ? "phone-pad" : "default"}
      multiline={max > 100}
    />
  );
}
