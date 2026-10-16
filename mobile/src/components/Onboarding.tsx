import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import Animated, { FadeInRight, FadeOutLeft, LinearTransition } from "react-native-reanimated";
import { haptic, springs } from "./motion";
import { StatusOrb } from "./StatusOrb";
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
      <View style={[styles.content, { flex: 1, justifyContent: "center" }]}>
        <Animated.View
          key={index}
          entering={FadeInRight.springify()
            .stiffness(springs.smooth.stiffness)
            .damping(springs.smooth.damping)}
          exiting={FadeOutLeft.duration(160)}
          style={{ gap: 20 }}
        >
          <StatusOrb state="calm">
            <Ionicons name={slide.icon} size={44} color={colors.onPrimary} />
          </StatusOrb>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.text}>{slide.text}</Text>
        </Animated.View>
        <View
          accessibilityLabel={`${index + 1}/${slides.length}`}
          style={{ flexDirection: "row", gap: 8 }}
        >
          {slides.map((item, dot) => (
            <Animated.View
              key={item.title}
              layout={LinearTransition.springify()
                .stiffness(springs.snappy.stiffness)
                .damping(springs.snappy.damping)}
              style={{
                height: 8,
                width: dot === index ? 24 : 8,
                borderRadius: 4,
                backgroundColor: dot === index ? colors.primaryButton : colors.border,
              }}
            />
          ))}
        </View>
        <Button
          title={last ? "Эхлэх" : "Цааш"}
          onPress={() => {
            haptic.tick();
            if (last) done();
            else setIndex(index + 1);
          }}
        />
        {!last && <Button title="Алгасах" textOnly onPress={done} />}
      </View>
    </Screen>
  );
}
