"use client";

import {
  ArrowRightIcon,
  BellIcon,
  CameraIcon,
  PhoneCallIcon,
  PlusIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useNow, useTimeZone, useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Device, Event } from "@/contracts";
import { EventCard } from "@/features/events/components/event-card";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import type { HomeStatus } from "../status";

const ease = [0.2, 0.8, 0.2, 1] as const;
const spring = { type: "spring", stiffness: 300, damping: 32 } as const;
const bouncy = { type: "spring", stiffness: 520, damping: 22 } as const;
const tone: Record<HomeStatus, string> = {
  calm: "var(--primary)",
  attention: "var(--warning)",
  offline: "var(--warning)",
  alert: "var(--destructive-strong)",
  empty: "var(--muted-foreground)",
};
const ink: Record<HomeStatus, string> = {
  calm: "text-primary-foreground",
  attention: "text-warning-foreground",
  offline: "text-warning-foreground",
  alert: "text-white",
  empty: "text-muted-foreground",
};

/**
 * The living Home screen: an orb that breathes with the house, rooms that light up, counts that
 * run, today's alerts on a 24-hour line and a timeline of the latest events.
 */
export function HomeDashboard({
  name,
  householdName,
  state,
  critical,
  devices,
  events,
  people,
}: {
  name: string;
  householdName?: string;
  state: HomeStatus;
  critical: Event | null;
  devices: Device[];
  events: Event[];
  people: number;
}) {
  const t = useTranslations("home");
  const timeZone = useTimeZone() ?? "Asia/Ulaanbaatar";
  const now = useNow({ updateInterval: 30_000 });
  const day = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(date);
  const today = events.filter((event) => day(new Date(event.occurredAt)) === day(now));
  const online = devices.filter((device) => device.status === "online").length;
  return (
    <MotionConfig reducedMotion="user">
      {/* Container queries: the same screen lays out by its own width, in the app or in a mock. */}
      <div className="@container grid gap-6 @5xl:gap-8">
        <header className="flex items-start justify-between gap-3 pt-2">
          <div className="grid min-w-0 gap-0.5">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="font-display text-[26px] leading-8 text-balance @5xl:text-[32px] @5xl:leading-10"
            >
              {t("greeting", { name })}
            </motion.h1>
            {householdName && (
              <p className="text-base font-semibold text-muted-foreground">{householdName}</p>
            )}
          </div>
          <Clock now={now} timeZone={timeZone} label={t("live")} />
        </header>

        <Hero state={state} online={online} critical={critical} devices={devices} />

        <Stats online={online} total={devices.length} today={today.length} people={people} />

        <Today events={today} now={now} timeZone={timeZone} />

        <Recent events={events.slice(0, 4)} />

        <p className="text-center text-sm text-muted-foreground">{t("monitorHint")}</p>
      </div>
    </MotionConfig>
  );
}

function Clock({ now, timeZone, label }: { now: Date; timeZone: string; label: string }) {
  const time = new Intl.DateTimeFormat("mn-MN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return (
    <span className="glass inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-bold tabular-nums">
      <span aria-hidden="true" className="size-2 animate-blink rounded-full bg-primary" />
      <span className="sr-only">{label}</span>
      {time}
    </span>
  );
}

function Hero({
  state,
  online,
  critical,
  devices,
}: {
  state: HomeStatus;
  online: number;
  critical: Event | null;
  devices: Device[];
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const alert = state === "alert" && critical !== null;
  const href = alert
    ? routes.alert(critical.id)
    : state === "empty"
      ? routes.newDevice
      : state === "offline"
        ? routes.devices
        : routes.events;
  return (
    <section
      data-tone={alert ? "alert" : undefined}
      style={{ "--st": tone[state] } as CSSProperties}
      className="glass relative grid gap-6 overflow-hidden rounded-[32px] p-6 @3xl:grid-cols-[220px_1fr] @3xl:items-center @3xl:gap-8 @3xl:p-8"
    >
      {/* A wash of the state colour behind everything: calm blue, amber, or red. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-[var(--st)] blur-3xl"
        animate={{ opacity: state === "empty" ? 0 : alert ? 0.22 : 0.12 }}
        transition={{ duration: 0.8 }}
      />
      <Orb state={state}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={bouncy}
            className={cn("grid justify-items-center", ink[state])}
          >
            {state === "empty" ? (
              <PlusIcon aria-hidden="true" className="size-10" />
            ) : (
              <>
                <b className="font-display text-[40px] leading-[44px] tabular-nums">
                  {alert ? "!" : <Counter value={online} pad />}
                </b>
                <span className="text-sm font-bold">
                  {alert ? t("state.alert.urgent") : common("statusRing.online")}
                </span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </Orb>
      <div className="relative grid gap-4 text-center @3xl:text-left">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={alert ? critical.id : state}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
            transition={spring}
            className="grid gap-2"
          >
            <h2 className="font-display text-[28px] leading-tight @3xl:text-[34px]">
              {alert ? common(`eventKind.${critical.kind}`) : t(`state.${state}.title`)}
            </h2>
            <p className="max-w-md text-base text-muted-foreground @3xl:max-w-none">
              {alert
                ? [critical.personName, critical.roomName].filter(Boolean).join(" · ")
                : t(`state.${state}.hint`)}
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-wrap justify-center gap-3 @3xl:justify-start">
          <Button asChild variant={alert ? "destructive" : "primary"}>
            <Link href={href}>
              {alert ? t("state.alert.view") : t(`state.${state}.action`)}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          {alert && (
            <Button asChild variant="secondary">
              <a href="tel:103">
                <PhoneCallIcon aria-hidden="true" />
                {t("state.alert.call")}
              </a>
            </Button>
          )}
        </div>
      </div>
      {devices.length > 0 && <Rooms devices={devices} label={t("rooms")} />}
    </section>
  );
}

/** Calm breathes over 6 s and sends slow ripples; an alert beats like a heart. */
function Orb({ state, children }: { state: HomeStatus; children: ReactNode }) {
  const alert = state === "alert";
  const quiet = state === "empty";
  return (
    <div aria-hidden="true" className="relative mx-auto grid size-[200px] place-items-center">
      {!quiet &&
        [0, 1, 2].map((ring) => (
          <motion.span
            key={`${state}:${ring}`}
            className="absolute inset-0 rounded-full border-[1.5px] border-[var(--st)]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.12], opacity: [0.55, 0] }}
            transition={{
              duration: alert ? 1.5 : 4.5,
              delay: ring * (alert ? 0.5 : 1.5),
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeOut",
            }}
          />
        ))}
      <motion.div
        className={cn(
          "relative grid size-[132px] place-items-center rounded-full transition-[background,box-shadow] duration-700",
          quiet
            ? "border-[1.5px] border-dashed border-foreground/30"
            : "[background:radial-gradient(circle_at_34%_28%,var(--orb-highlight)_0%,var(--st)_35%,color-mix(in_srgb,var(--st)_75%,black)_75%,color-mix(in_srgb,var(--st)_45%,black)_100%)] shadow-[0_0_56px_-12px_var(--st)]",
        )}
        animate={
          quiet ? { scale: 1 } : { scale: alert ? [1, 1.08, 0.99, 1.05, 1] : [0.97, 1.03, 0.97] }
        }
        transition={
          quiet
            ? spring
            : { duration: alert ? 1.2 : 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}

function Rooms({ devices, label }: { devices: Device[]; label: string }) {
  return (
    <motion.ul
      aria-label={label}
      className="relative -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] @3xl:col-span-2 @3xl:mx-0 @3xl:flex-wrap @3xl:px-0"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
    >
      {devices.map((device) => (
        <motion.li
          key={device.id}
          variants={{
            hidden: { opacity: 0, y: 10, scale: 0.94 },
            show: { opacity: 1, y: 0, scale: 1, transition: spring },
          }}
        >
          <Link
            href={routes.device(device.id)}
            className="tap flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-card px-4 text-sm font-bold whitespace-nowrap"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2.5 rounded-full",
                device.status === "online"
                  ? "animate-blink bg-primary"
                  : device.status === "pairing"
                    ? "bg-muted-foreground"
                    : "bg-warning",
              )}
            />
            {device.roomName}
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/** A number that runs up to its value (and moves again when it changes). */
function Counter({ value, pad = false }: { value: number; pad?: boolean }) {
  const count = useMotionValue(0);
  const text = useTransform(count, (current) =>
    Math.round(current)
      .toString()
      .padStart(pad ? 2 : 1, "0"),
  );
  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, ease });
    return () => controls.stop();
  }, [count, value]);
  return <motion.span>{text}</motion.span>;
}

function Stats({
  online,
  total,
  today,
  people,
}: {
  online: number;
  total: number;
  today: number;
  people: number;
}) {
  const t = useTranslations("home");
  const tiles = [
    { key: "online", value: online, of: total, Icon: CameraIcon, href: routes.devices },
    { key: "today", value: today, Icon: BellIcon, href: routes.events },
    { key: "people", value: people, Icon: UsersIcon, href: routes.people },
  ] as const;
  return (
    <motion.div
      className="grid grid-cols-3 gap-3"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      {tiles.map((tile) => (
        <motion.div
          key={tile.key}
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: spring },
          }}
        >
          <Link
            href={tile.href}
            aria-label={`${t(`stats.${tile.key}`)}: ${tile.value}${"of" in tile ? `/${tile.of}` : ""}`}
            className="glass tap grid h-full content-between gap-3 rounded-[22px] p-4"
          >
            <tile.Icon weight="duotone" aria-hidden="true" className="size-6 text-primary-text" />
            <span aria-hidden="true" className="grid gap-0.5">
              <b className="font-display text-[28px] leading-8 tabular-nums">
                <Counter value={tile.value} />
                {"of" in tile && <span className="text-lg text-muted-foreground">/{tile.of}</span>}
              </b>
              <span className="text-xs leading-4 font-bold text-muted-foreground">
                {t(`stats.${tile.key}`)}
              </span>
            </span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Today on a 24-hour line: the elapsed part fills in, each alert pops onto its hour. */
function Today({ events, now, timeZone }: { events: Event[]; now: Date; timeZone: string }) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const share = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(date);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return ((value("hour") * 60 + value("minute")) / 1440) * 100;
  };
  const nowAt = share(now);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={spring}
      aria-label={t("today")}
      className="glass grid gap-4 rounded-[28px] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-md font-bold">{t("today")}</h2>
        <span className="text-sm font-bold text-muted-foreground">
          {events.length ? t("todayCount", { count: events.length }) : t("todayQuiet")}
        </span>
      </div>
      <div className="relative h-14">
        <motion.div
          className="absolute inset-x-0 top-1/2 h-1.5 -mt-[3px] origin-left rounded-full bg-hairline"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
        />
        <motion.div
          className="absolute top-1/2 left-0 h-1.5 -mt-[3px] origin-left rounded-full bg-primary/50"
          style={{ width: `${nowAt}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.2, ease }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute top-0 bottom-0 w-0.5 rounded-full bg-foreground"
          style={{ left: `${nowAt}%`, x: "-50%" }}
          initial={{ opacity: 0, scaleY: 0 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ ...spring, delay: 1 }}
        />
        {events.map((event, index) => (
          <motion.span
            key={event.id}
            className="absolute top-1/2"
            style={{ left: `${share(new Date(event.occurredAt))}%`, x: "-50%", y: "-50%" }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...bouncy, delay: 0.5 + index * 0.06 }}
          >
            <Link
              href={routes.event(event.id)}
              aria-label={common(`eventKind.${event.kind}`)}
              className="grid size-7 place-items-center rounded-full"
            >
              <span
                className={cn(
                  "size-3.5 rounded-full ring-4 ring-card",
                  event.severity === "critical"
                    ? "bg-destructive"
                    : event.severity === "warning"
                      ? "bg-warning"
                      : "bg-muted-foreground",
                )}
              />
            </Link>
          </motion.span>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between text-xs font-bold text-muted-foreground tabular-nums"
      >
        {["00", "06", "12", "18", "24"].map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
    </motion.section>
  );
}

/** The latest events on a line that draws itself, each card sliding in after the one above. */
function Recent({ events }: { events: Event[] }) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  return (
    <section className="grid gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-md font-bold">{t("recentEvents")}</h2>
        <Link href={routes.events} className="text-sm font-bold text-primary-text">
          {common("actions.seeAll")}
        </Link>
      </div>
      {events.length ? (
        <ol className="relative grid gap-3 pl-7">
          <motion.span
            aria-hidden="true"
            className="absolute top-3 bottom-3 left-[13px] w-0.5 origin-top rounded-full bg-hairline"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
          />
          {events.map((event, index) => (
            <motion.li
              key={event.id}
              className="relative"
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ ...spring, delay: index * 0.08 }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-7 -left-[20px] size-3.5 rounded-full ring-4 ring-background",
                  event.severity === "critical"
                    ? "bg-destructive"
                    : event.severity === "warning"
                      ? "bg-warning"
                      : "bg-muted-foreground",
                )}
              />
              <EventCard event={event} compact />
            </motion.li>
          ))}
        </ol>
      ) : (
        <p className="glass rounded-[22px] p-5 text-center text-base text-muted-foreground">
          {t("noEvents")}
        </p>
      )}
    </section>
  );
}
