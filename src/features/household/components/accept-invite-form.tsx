"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptHouseholdInvite } from "../actions";

export function AcceptInviteForm({ code }: { code: string }) {
  const t = useTranslations("household");
  const [state, action, pending] = useActionState(acceptHouseholdInvite, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="code" value={code} />

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive-text">
          {state.error}
        </p>
      )}

      <Button type="submit" block loading={pending}>
        {t("joinHousehold")}
      </Button>
    </form>
  );
}
