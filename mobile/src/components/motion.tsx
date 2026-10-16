import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// The prototype's springs (stiffness k, damping c, mass 1). Reanimated skips them under Reduce Motion.
export const springs = {
  snappy: { stiffness: 600, damping: 38, mass: 1 },
  smooth: { stiffness: 300, damping: 32, mass: 1 },
  bouncy: { stiffness: 520, damping: 22, mass: 1 },
};

export const haptic = {
  tick: () => void Haptics.selectionAsync().catch(() => {}),
  done: () =>
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {}),
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Settles on press and springs back, like the web's `tap`. Keeps the caller's style function. */
export function MotionPressable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        scale.set(withTiming(0.975, { duration: 110 }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        scale.set(withSpring(1, springs.bouncy));
        onPressOut?.(event);
      }}
      style={[
        typeof style === "function" ? style({ pressed, hovered: false }) : style,
        motion,
      ]}
    />
  );
}

/** A page block that rises into place 40 ms after the one above (the web's `enter-stagger`). */
export function Rise({
  index = 0,
  style,
  children,
}: {
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInUp.delay(Math.min(index, 6) * 40)
        .springify()
        .stiffness(springs.smooth.stiffness)
        .damping(springs.smooth.damping)}
    >
      {children}
    </Animated.View>
  );
}

/** The pill behind the selected segment: springs over and stretches on the way (tab bar, filters). */
export function SlidingPill({
  index,
  count,
  width,
  inset,
  radius,
}: {
  index: number;
  count: number;
  width: number;
  inset: number;
  radius: number;
}) {
  const segment = Math.max(0, (width - inset * 2) / count);
  const x = useSharedValue(index * segment);
  const stretch = useSharedValue(1);
  const last = useRef(index);
  useEffect(() => {
    const moved = last.current !== index;
    last.current = index;
    x.set(moved ? withSpring(index * segment, springs.snappy) : index * segment);
    if (moved)
      stretch.set(
        withSequence(
          withTiming(1.28, { duration: 170 }),
          withTiming(1, { duration: 250 }),
        ),
      );
  }, [index, segment, x, stretch]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scaleX: stretch.get() }],
  }));
  if (!segment) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: inset,
          bottom: inset,
          left: inset,
          width: segment,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          backgroundColor: "rgba(255,255,255,0.10)",
        },
        motion,
      ]}
    />
  );
}

/** Status light. `blink` pulses it like the prototype's live indicators. */
export function Led({
  color,
  blink = false,
  size = 8,
}: {
  color: string;
  blink?: boolean;
  size?: number;
}) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!blink) return;
    opacity.set(
      withRepeat(
        withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [blink, opacity]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          boxShadow: `0px 0px 8px ${color}`,
        },
        motion,
      ]}
    />
  );
}

/** Placeholder block with the web's shimmer while data loads. */
export function Skeleton({ style }: { style: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      accessible={false}
      style={[{ backgroundColor: "rgba(255,255,255,0.08)" }, style, motion]}
    />
  );
}
