import authEn from "@/features/auth/messages/en.json";
import authMn from "@/features/auth/messages/mn.json";
import designEn from "@/features/design/messages/en.json";
import designMn from "@/features/design/messages/mn.json";
import type { Locale } from "./config";
import commonEn from "./messages/en.json";
import commonMn from "./messages/mn.json";

/*
 * Every feature keeps its own texts in src/features/<feature>/messages/{mn,en}.json
 * and reads them with useTranslations("<feature>"). Register new feature files here.
 */
const catalogs = {
  mn: { common: commonMn, design: designMn, auth: authMn },
  en: { common: commonEn, design: designEn, auth: authEn },
} satisfies Record<Locale, unknown>;

export type Messages = (typeof catalogs)["mn"];

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}
