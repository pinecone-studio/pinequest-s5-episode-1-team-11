"use client";

import {
  BellIcon,
  BellRingingIcon,
  CheckIcon,
  FireIcon,
  HouseIcon,
  LinkSimpleIcon,
  SmileySadIcon,
  SpeakerHighIcon,
  UsersThreeIcon,
  VideoCameraIcon,
  WineIcon,
} from "@phosphor-icons/react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useScroll,
  useSpring,
} from "motion/react";
import { useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { FallIcon } from "@/components/domain/fall-icon";
import type { Device, Event } from "@/contracts";
import { HomeDashboard } from "@/features/home/components/home-dashboard";
import { cn } from "@/lib/cn";

const ease = [0.2, 0.8, 0.2, 1] as const;
const spring = { type: "spring", stiffness: 300, damping: 32 } as const;
const bouncy = { type: "spring", stiffness: 520, damping: 22 } as const;

/** The hero headline arrives word by word, each one rising out of a soft blur. */
export function RevealTitle({
  text,
  accent = 0,
  className,
}: {
  text: string;
  /** How many trailing words get the accent colour. */
  accent?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <MotionConfig reducedMotion="user">
      <h1 className={className} aria-label={text}>
        {words.map((word, index) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: words repeat; their order is fixed
            key={index}
            aria-hidden="true"
            className={cn(
              "inline-block whitespace-pre",
              index >= words.length - accent && "text-primary-text",
            )}
            initial={{ opacity: 0, y: "0.4em", filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...spring, delay: 0.08 * index }}
          >
            {word}{" "}
          </motion.span>
        ))}
      </h1>
    </MotionConfig>
  );
}

/** Calm → a fall is detected → the family is told → someone answers → calm again, on a loop. */
const SCENE_MS = [2800, 2600, 2400, 2600];

export function LiveDemo({
  name,
  devices,
  events,
  people,
}: {
  name: string;
  devices: Device[];
  events: Event[];
  people: number;
}) {
  const t = useTranslations("marketing.demo");
  const frame = useRef<HTMLDivElement>(null);
  const visible = useInView(frame, { margin: "-20%" });
  const [scene, setScene] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setScene((current) => (current + 1) % 4), SCENE_MS[scene]);
    return () => clearTimeout(timer);
  }, [scene, visible]);
  const alert = scene === 1 || scene === 2;
  const st = alert ? "var(--destructive-strong)" : "var(--primary)";
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={frame}
        role="img"
        aria-label={t("label")}
        className="relative mx-auto w-fit"
        initial={{ opacity: 0, y: 40, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        {/* Soft glow that turns red with the alert. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-8 -z-10 rounded-full blur-3xl"
          animate={{ backgroundColor: st, opacity: alert ? 0.45 : 0.3 }}
          transition={{ duration: 0.6 }}
        />
        <motion.div
          aria-hidden="true"
          className="@container relative aspect-[9/18.5] h-[clamp(380px,calc(100dvh-200px),580px)] overflow-hidden rounded-[44px] border-[7px] border-foreground/90 bg-background shadow-[0_40px_80px_-30px_rgb(9_9_11/0.45)]"
          animate={scene === 1 ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{ "--st": st } as CSSProperties}
        >
          <AppScreen
            name={name}
            devices={devices}
            events={events}
            people={people}
            critical={alert ? (events.find((event) => event.kind === "fall") ?? null) : null}
          />
          <div className="absolute top-[2.5cqw] left-1/2 z-10 h-[7cqw] w-[30cqw] -translate-x-1/2 rounded-full bg-foreground/90" />

          {/* The push notification drops in from the top of the screen. */}
          <AnimatePresence>
            {alert && (
              <motion.div
                className="absolute inset-x-[4cqw] top-[12cqw] z-10 flex items-center gap-[3cqw] rounded-[5cqw] border border-destructive/30 bg-card p-[3cqw] shadow-[0_16px_32px_-16px_rgb(9_9_11/0.4)]"
                initial={{ y: "-140%", opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "-140%", opacity: 0 }}
                transition={bouncy}
              >
                <motion.span
                  className="grid size-[12cqw] shrink-0 place-items-center rounded-[3.5cqw] bg-destructive text-white"
                  animate={{ rotate: [0, -14, 11, -7, 4, 0] }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <FallIcon className="size-[7cqw]" />
                </motion.span>
                <span className="grid min-w-0 text-left">
                  <span className="text-[3.4cqw] font-bold tracking-wider text-muted-foreground uppercase">
                    Halo · {t("now")}
                  </span>
                  <b className="truncate text-[4.8cqw]">{t("alertTitle")}</b>
                  <span className="truncate text-[4cqw] text-muted-foreground">
                    {t("alertWhere")}
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Someone answers: the button is pressed, then confirms. */}
          <AnimatePresence>
            {scene >= 2 && (
              <motion.div
                className="absolute inset-x-[5cqw] bottom-[24cqw] z-10"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={spring}
              >
                <motion.div
                  className={cn(
                    "relative flex min-h-[15cqw] items-center justify-center gap-[2cqw] overflow-hidden rounded-full text-[4.6cqw] font-bold",
                    scene === 3 ? "bg-card text-foreground" : "bg-primary text-primary-foreground",
                  )}
                  animate={scene === 2 ? { scale: [1, 1, 0.94, 1] } : { scale: 1 }}
                  transition={{ duration: 0.9, times: [0, 0.6, 0.75, 1] }}
                >
                  {scene === 2 && (
                    <motion.span
                      className="absolute size-12 rounded-full bg-white/40"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 0, 6], opacity: [0, 0.8, 0] }}
                      transition={{ duration: 1.2, times: [0, 0.55, 1] }}
                    />
                  )}
                  {scene === 3 && <CheckIcon weight="bold" className="size-4 text-primary-text" />}
                  {scene === 3 ? t("responded") : t("respond")}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <Float className="top-[14%] -right-28" delay={0.9} y={-8}>
          <span className="size-2 animate-blink rounded-full bg-primary" />
          {t("floatOnline")}
        </Float>
        <Float className="top-[58%] -right-36" delay={1.1} y={8}>
          <BellRingingIcon weight="duotone" className="size-4 text-primary-text" />
          {t("floatFamily")}
        </Float>
        <Float className="bottom-[10%] -left-20" delay={1.3} y={-6}>
          <CheckIcon weight="bold" className="size-4 text-primary-text" />
          {t("floatPrivate")}
        </Float>
      </motion.div>
    </MotionConfig>
  );
}

const SCREEN_WIDTH = 390;

/**
 * The real Home screen (HomeDashboard) with demo data, laid out at a phone's 390 px width and
 * scaled down to the frame, so the landing shows exactly what the app shows. Inert: no links work.
 */
function AppScreen({
  name,
  devices,
  events,
  people,
  critical,
}: {
  name: string;
  devices: Device[];
  events: Event[];
  people: number;
  critical: Event | null;
}) {
  const nav = useTranslations("common.nav");
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = size.width / SCREEN_WIDTH;
  const tabs = [
    { key: "home", Icon: HouseIcon },
    { key: "events", Icon: BellIcon },
    { key: "family", Icon: UsersThreeIcon },
  ] as const;
  return (
    <div ref={box} inert className="absolute inset-0 overflow-hidden bg-background">
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: SCREEN_WIDTH,
            height: size.height / scale,
            transform: `scale(${scale})`,
          }}
        >
          <div className="px-4 pt-12">
            <HomeDashboard
              name={name}
              householdName={undefined}
              state={critical ? "alert" : "calm"}
              critical={critical}
              devices={devices}
              events={events}
              people={people}
            />
          </div>
          <nav className="glass-strong absolute inset-x-3.5 bottom-5 grid h-[70px] grid-cols-3 rounded-[35px] p-2">
            <span className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/3)] rounded-[29px] border border-white/14 bg-white/10" />
            {tabs.map(({ key, Icon }, index) => (
              <span
                key={key}
                className={cn(
                  "relative z-10 grid content-center justify-items-center gap-1 text-xs font-bold",
                  index === 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon
                  weight={index === 0 ? "fill" : "bold"}
                  className={cn("size-6", index === 0 && "text-primary-text")}
                />
                {nav(key)}
              </span>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

/** A small fact card drifting beside the phone; hidden on narrow screens. */
function Float({
  className,
  delay,
  y,
  children,
}: {
  className: string;
  delay: number;
  y: number;
  children: ReactNode;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        "glass absolute hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap xl:flex",
        className,
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, y, 0] }}
      transition={{
        opacity: { delay, duration: 0.4 },
        scale: { ...bouncy, delay },
        y: { delay, duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
      }}
    >
      {children}
    </motion.span>
  );
}

/** What it notices, as tiles that each move the way their signal does. */
export function Detections() {
  const t = useTranslations("marketing");
  const tiles = [
    { key: "fall", wide: true },
    { key: "scream" },
    { key: "cry" },
    { key: "glass" },
    { key: "alarm" },
  ] as const;
  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="detect-title" className="grid gap-8">
        <motion.div
          className="grid max-w-2xl gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={spring}
        >
          <h2
            id="detect-title"
            className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1]"
          >
            {t("detect.title")}
          </h2>
          <p className="text-md text-muted-foreground">{t("detect.body")}</p>
        </motion.div>
        <motion.ul
          className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {tiles.map((tile) => (
            <motion.li
              key={tile.key}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1, transition: spring },
              }}
              whileHover={{ y: -4 }}
              className={cn(
                "glass grid content-between gap-6 rounded-[28px] p-5 md:p-6",
                "wide" in tile && "col-span-2 md:row-span-2",
              )}
            >
              <Motif kind={tile.key} large={"wide" in tile} />
              <div className="grid gap-1">
                <h3 className={cn("font-bold", "wide" in tile ? "text-xl" : "text-md")}>
                  {t(`signals.${tile.key}.name`)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(`detect.${tile.key}`)}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>
    </MotionConfig>
  );
}

function Motif({
  kind,
  large,
}: {
  kind: "fall" | "scream" | "cry" | "glass" | "alarm";
  large: boolean;
}) {
  const loop = { repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } as const;
  if (kind === "fall")
    return (
      <div className="relative grid h-36 place-items-center md:h-full md:min-h-48">
        <motion.span
          className="absolute bottom-6 h-1.5 w-40 rounded-full bg-destructive/20"
          animate={{ scaleX: [0.6, 0.6, 1, 1, 0.6] }}
          transition={{ duration: 4, times: [0, 0.35, 0.5, 0.85, 1], ...loop }}
        />
        <motion.span
          className="text-destructive-text"
          style={{ originX: 0.5, originY: 1 }}
          animate={{ rotate: [0, 0, 82, 82, 0], y: [0, 0, 18, 18, 0] }}
          transition={{ duration: 4, times: [0, 0.35, 0.5, 0.85, 1], ...loop }}
        >
          <FallIcon className={large ? "size-24" : "size-14"} />
        </motion.span>
      </div>
    );
  if (kind === "scream" || kind === "cry")
    return (
      <div className="flex h-14 items-center gap-1.5">
        {kind === "scream" ? (
          <SpeakerHighIcon weight="duotone" className="size-7 text-warning-text" />
        ) : (
          <SmileySadIcon weight="duotone" className="size-7 text-warning-text" />
        )}
        {[0.5, 0.9, 0.7, 1, 0.6].map((height, index) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of bars
            key={index}
            className="w-1.5 rounded-full bg-warning"
            style={{ height: `${height * 100}%` }}
            animate={{ scaleY: kind === "scream" ? [0.3, 1, 0.3] : [0.4, 0.7, 0.4] }}
            transition={{ duration: kind === "scream" ? 0.7 : 1.4, delay: index * 0.12, ...loop }}
          />
        ))}
      </div>
    );
  if (kind === "glass")
    return (
      <motion.span
        className="grid size-14 place-items-center rounded-2xl bg-warning/12 text-warning-text"
        animate={{ rotate: [0, 0, -10, 8, -4, 0, 0] }}
        transition={{ duration: 3, times: [0, 0.6, 0.68, 0.76, 0.84, 0.92, 1], ...loop }}
      >
        <WineIcon weight="duotone" className="size-8" />
      </motion.span>
    );
  return (
    <span className="relative grid size-14 place-items-center">
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-destructive"
        animate={{ scale: [0.7, 1.5], opacity: [0.6, 0] }}
        transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
      />
      <span className="grid size-14 place-items-center rounded-full bg-destructive/12 text-destructive-text">
        <FireIcon weight="duotone" className="size-8" />
      </span>
    </span>
  );
}

/** Three steps on a line that draws itself as you scroll past. */
export function Steps() {
  const t = useTranslations("marketing.steps");
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start 85%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const steps = [
    { key: "connect", Icon: LinkSimpleIcon },
    { key: "watch", Icon: VideoCameraIcon },
    { key: "review", Icon: BellRingingIcon },
  ] as const;
  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={section}
        id="how"
        aria-labelledby="steps-title"
        className="grid scroll-mt-24 gap-10"
      >
        <h2 id="steps-title" className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1]">
          {t("title")}
        </h2>
        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          <span
            aria-hidden="true"
            className="absolute top-7 bottom-7 left-7 w-0.5 rounded-full bg-hairline md:top-7 md:right-[16%] md:bottom-auto md:left-[10%] md:h-0.5 md:w-auto"
          />
          <motion.span
            aria-hidden="true"
            className="absolute top-7 bottom-7 left-7 w-0.5 origin-top rounded-full bg-primary md:hidden"
            style={{ scaleY: progress }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute top-7 right-[16%] left-[10%] hidden h-0.5 origin-left rounded-full bg-primary md:block"
            style={{ scaleX: progress }}
          />
          {steps.map(({ key, Icon }, index) => (
            <motion.li
              key={key}
              className="relative grid grid-cols-[56px_1fr] gap-4 md:grid-cols-1"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...spring, delay: index * 0.12 }}
            >
              <motion.span
                className="glass-strong relative grid size-14 place-items-center rounded-full text-primary-text"
                initial={{ scale: 0.4 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ ...bouncy, delay: 0.1 + index * 0.12 }}
              >
                <Icon weight="duotone" className="size-6" aria-hidden="true" />
                <b className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
                  {index + 1}
                </b>
              </motion.span>
              <div className="grid content-start gap-2">
                <h3 className="text-lg font-bold">{t(`${key}.title`)}</h3>
                <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                  {t(`${key}.body`)}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>
    </MotionConfig>
  );
}

/** The closing call to action: a breathing orb and one button. */
export function Closing({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        className="glass relative grid justify-items-center gap-6 overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-10 lg:py-24"
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-44 left-1/2 size-[460px] rounded-full bg-primary/20 blur-3xl"
          style={{ x: "-50%" }}
          animate={{ scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        {children}
      </motion.section>
    </MotionConfig>
  );
}
