import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "./colors";
import { haptic } from "./motion";

type OrbState = "calm" | "warning" | "alert" | "empty";

const tint = {
  calm: colors.primaryButton,
  warning: colors.warningButton,
  alert: "#DC2626",
  empty: colors.muted,
};
// The web's radial core, color-mix with the background precomputed. The middle stays bright so
// the dark number on it keeps its contrast.
const core = {
  calm: "radial-gradient(circle at 34% 28%, #EFF6FF 0%, #60A5FA 30%, #3B82F6 72%, #1D3255 100%)",
  warning:
    "radial-gradient(circle at 34% 28%, #FFFBEB 0%, #F59E0B 30%, #D97706 72%, #3E3120 100%)",
  alert:
    "radial-gradient(circle at 34% 28%, #FEE2E2 0%, #EF4444 22%, #DC2626 45%, #991B1B 100%)",
};
const ease = Easing.inOut(Easing.sin);

/**
 * Home's glowing orb. Calm breathes over 6 s with an 8 s sonar ring, alert beats like a heart.
 * Tapping it re-checks every room. Decorative: the heading next to it says the same thing.
 */
export function StatusOrb({
  state,
  onCheck,
  children,
}: {
  state: OrbState;
  onCheck?: () => void;
  children: ReactNode;
}) {
  const beat = useSharedValue(1);
  const sonar = useSharedValue(0);
  const shock = useSharedValue(1);
  // Plain effect, not focus: onboarding shows the orb outside any navigator.
  useEffect(() => {
    if (state === "empty") return;
    beat.set(
      withRepeat(
        state === "alert"
          ? withSequence(
              withTiming(1.08, { duration: 170 }),
              withTiming(0.99, { duration: 170 }),
              withTiming(1.05, { duration: 170 }),
              withTiming(1, { duration: 330 }),
              withTiming(1, { duration: 360 }),
            )
          : withSequence(
              withTiming(1.03, { duration: 3000, easing: ease }),
              withTiming(0.95, { duration: 3000, easing: ease }),
            ),
        -1,
      ),
    );
    sonar.set(
      withRepeat(
        withTiming(1, {
          duration: state === "alert" ? 1200 : 8000,
          easing: Easing.out(Easing.quad),
        }),
        -1,
      ),
    );
    return () => {
      cancelAnimation(beat);
      cancelAnimation(sonar);
      beat.set(1);
      sonar.set(0);
    };
  }, [state, beat, sonar]);
  const coreMotion = useAnimatedStyle(() => ({
    transform: [{ scale: beat.get() }],
  }));
  const ringMotion = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - sonar.get()),
    transform: [{ scale: 0.62 + 0.46 * sonar.get() }],
  }));
  const shockMotion = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - shock.get()),
    transform: [{ scale: 0.6 + 1.3 * shock.get() }],
  }));
  const color = tint[state];
  return (
    <Pressable
      accessible={!!onCheck}
      accessibilityRole="button"
      accessibilityLabel="Бүх өрөөг одоо шалгах"
      disabled={!onCheck}
      onPress={() => {
        haptic.tick();
        shock.set(0);
        shock.set(
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
        );
        onCheck?.();
      }}
      style={local.area}
    >
      <Animated.View
        style={[
          local.ring,
          { inset: 0, borderWidth: 2, borderColor: color },
          shockMotion,
        ]}
      />
      {state !== "empty" && (
        <Animated.View
          style={[local.ring, { borderColor: color }, ringMotion]}
        />
      )}
      <Animated.View
        style={[
          local.core,
          state === "empty"
            ? {
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "rgba(255,255,255,0.28)",
              }
            : {
                // Solid colour first: the number stays readable even where the gradient is not drawn.
                backgroundColor: color,
                experimental_backgroundImage: core[state],
                boxShadow: `0px 0px 70px -6px ${color}`,
              },
          coreMotion,
        ]}
      />
      <View style={local.center}>{children}</View>
    </Pressable>
  );
}
export const orbInk = {
  calm: colors.onPrimary,
  warning: colors.onWarning,
  alert: "#FFFFFF",
  empty: colors.muted,
};
const local = StyleSheet.create({
  area: {
    width: 196,
    height: 196,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  ring: {
    position: "absolute",
    inset: 6,
    borderRadius: 98,
    borderWidth: 1.5,
    opacity: 0,
  },
  core: { position: "absolute", inset: 34, borderRadius: 64 },
  center: { alignItems: "center", gap: 2 },
});
