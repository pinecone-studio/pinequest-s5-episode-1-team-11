import authEn from "@/features/auth/messages/en.json";
import authMn from "@/features/auth/messages/mn.json";
import devicesEn from "@/features/devices/messages/en.json";
import devicesMn from "@/features/devices/messages/mn.json";
import eventsEn from "@/features/events/messages/en.json";
import eventsMn from "@/features/events/messages/mn.json";
import homeEn from "@/features/home/messages/en.json";
import homeMn from "@/features/home/messages/mn.json";
import householdEn from "@/features/household/messages/en.json";
import householdMn from "@/features/household/messages/mn.json";
import liveEn from "@/features/live/messages/en.json";
import liveMn from "@/features/live/messages/mn.json";
import marketingEn from "@/features/marketing/messages/en.json";
import marketingMn from "@/features/marketing/messages/mn.json";
import monitorEn from "@/features/monitor/messages/en.json";
import monitorMn from "@/features/monitor/messages/mn.json";
import notificationsEn from "@/features/notifications/messages/en.json";
import notificationsMn from "@/features/notifications/messages/mn.json";
import onboardingEn from "@/features/onboarding/messages/en.json";
import onboardingMn from "@/features/onboarding/messages/mn.json";
import settingsEn from "@/features/settings/messages/en.json";
import settingsMn from "@/features/settings/messages/mn.json";
import type { Locale } from "./config";
import commonEn from "./messages/en.json";
import commonMn from "./messages/mn.json";

/*
 * Every feature keeps its own texts in src/features/<feature>/messages/{mn,en}.json
 * and reads them with useTranslations("<feature>"). Register new feature files here.
 */
const catalogs = {
  mn: {
    common: commonMn,
    auth: authMn,
    devices: devicesMn,
    events: eventsMn,
    home: homeMn,
    household: householdMn,
    live: liveMn,
    marketing: marketingMn,
    monitor: monitorMn,
    notifications: notificationsMn,
    onboarding: onboardingMn,
    settings: settingsMn,
  },
  en: {
    common: commonEn,
    auth: authEn,
    devices: devicesEn,
    events: eventsEn,
    home: homeEn,
    household: householdEn,
    live: liveEn,
    marketing: marketingEn,
    monitor: monitorEn,
    notifications: notificationsEn,
    onboarding: onboardingEn,
    settings: settingsEn,
  },
} satisfies Record<Locale, unknown>;

export type Messages = (typeof catalogs)["mn"];

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}
