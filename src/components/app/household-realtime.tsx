"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const allTables = ["events", "devices"] as const;

/** Refresh server-rendered household data; polling also recovers missed realtime messages. */
export function HouseholdRealtime({
  householdId,
  tables = allTables,
}: {
  householdId: string;
  tables?: readonly ("events" | "devices")[];
}) {
  const router = useRouter();
  const tableKey = tables.join(",");
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (document.hidden || pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, 250);
    };
    const channel = client.channel(`household:${householdId}:${tableKey}`);
    for (const table of tableKey.split(",")) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        refresh,
      );
    }
    channel.subscribe();
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      if (pending) clearTimeout(pending);
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void client.removeChannel(channel);
    };
  }, [householdId, router, tableKey]);
  return null;
}
