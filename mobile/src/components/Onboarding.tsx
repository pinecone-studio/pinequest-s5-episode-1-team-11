import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { Button, colors, Screen, styles } from "./ui";

const SEEN_KEY = "halo.onboardingSeen";
const slides = [
  {
    icon: "videocam-outline",
    title: "Гэртээ ганцаараа ч ганцаардахгүй",
    text: "Гэрийн камер ахмад настан, хүүхдээ алсаас тайван харахад тусална.",
  },
  {
    icon: "pulse-outline",
    title: "Аюулыг өөрөө таньна",
    text: "Унах, орилох, удаан уйлах, шил хагарах, галын дохиог AI илрүүлнэ.",
  },
  {
    icon: "notifications-outline",
    title: "Хэдхэн секундэд мэдэгдэнэ",
    text: "Гэр бүлийн бүх гишүүнд дохио очно. Нэг нь «Харлаа» гэвэл бусад нь тайвширна.",
  },
  {
    icon: "lock-closed-outline",
    title: "Видео хадгалагдахгүй",
    text: "Камерын урсгалыг Halo-гийн сервер шууд шинжилдэг, бичлэг хадгалдаггүй. Зөвхөн аюултай агшны зураг танд ирнэ.",
  },
] as const;

/** First launch only, like the web's onboarding before sign-in. */
export function useOnboarding() {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(SEEN_KEY)
      .then((value) => setSeen(value === "1"))
      .catch(() => setSeen(true));
  }, []);
  return {
    seen,
    done: () => {
      setSeen(true);
      void AsyncStorage.setItem(SEEN_KEY, "1");
    },
  };
}

export function Onboarding({ done }: { done: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;
  return (
    <Screen>
      <View
        style={[styles.content, { flex: 1, justifyContent: "center", gap: 20 }]}
      >
        <Ionicons name={slide.icon} size={56} color={colors.primary} />
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.text}>{slide.text}</Text>
        <Text
          style={styles.muted}
          accessibilityLabel={`${index + 1}/${slides.length}`}
        >
          {slides.map((_, dot) => (dot === index ? "●" : "○")).join(" ")}
        </Text>
        <Button
          title={last ? "Эхлэх" : "Цааш"}
          onPress={() => (last ? done() : setIndex(index + 1))}
        />
        {!last && <Button title="Алгасах" textOnly onPress={done} />}
      </View>
    </Screen>
  );
}
