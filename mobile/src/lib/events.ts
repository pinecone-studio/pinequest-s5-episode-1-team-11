import { supabase } from "./supabase";
import type { HaloEvent } from "./types";

export const kindLabel: Record<HaloEvent["kind"], string> = {
  fall: "Унасан байж магадгүй",
  scream: "Орилох дуу",
  cry: "Уйлах дуу",
  glass: "Шил хагарах дуу",
  alarm: "Аюулын дохио",
  offline: "Камер салсан",
  test: "Туршилтын дохио",
};
export const statusLabel: Record<HaloEvent["status"], string> = {
  new: "Шинэ",
  acknowledged: "Харсан",
  false_alarm: "Хуурамч",
  resolved: "Шийдсэн",
};
export const severityLabel: Record<HaloEvent["severity"], string> = {
  critical: "Яаралтай",
  warning: "Анхааруулга",
  info: "Мэдээлэл",
};
export function dateLabel(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Огноо тодорхойгүй"
    : date.toLocaleString("mn-MN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}
export function sortedEvents(rows: HaloEvent[]) {
  return [...rows]
    .sort(
      (a, b) =>
        Date.parse(b.occurred_at) - Date.parse(a.occurred_at) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 100);
}
export async function getEvent(id: string, householdId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Дохио олдсонгүй эсвэл хандах эрхгүй байна.");
  return data;
}
export async function setEventStatus(
  id: string,
  householdId: string,
  userId: string,
  status: "acknowledged" | "false_alarm",
) {
  const patch =
    status === "acknowledged"
      ? {
          status,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        }
      : { status };
  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .eq("household_id", householdId)
    .eq("status", "new")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Дохионы төлөв өөрчлөгдсөн эсвэл шинэчлэх эрхгүй байна. Дахин ачаална уу.",
    );
  }
  return data;
}
