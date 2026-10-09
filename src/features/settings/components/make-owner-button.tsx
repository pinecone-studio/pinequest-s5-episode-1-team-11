"use client";

import { CrownSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { transferOwnership } from "../actions";

/** Shown to the owner next to each caregiver. */
export function MakeOwnerButton({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("settings");
  const common = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(transferOwnership, {});
  const [, startTransition] = useTransition();
  return (
    <AlertDialog
      open={open && !state.done}
      onOpenChange={setOpen}
      title={t("makeOwnerTitle", { name })}
      description={t("makeOwnerHint")}
      confirmLabel={t("makeOwner")}
      cancelLabel={common("cancel")}
      loading={pending}
      trigger={
        <Button variant="ghost" size="sm">
          <CrownSimpleIcon aria-hidden="true" />
          {t("makeOwner")}
        </Button>
      }
      onConfirm={() =>
        startTransition(() => {
          const form = new FormData();
          form.set("userId", userId);
          action(form);
        })
      }
    >
      {state.error && (
        <p role="alert" className="text-sm text-destructive-text">
          {state.error}
        </p>
      )}
    </AlertDialog>
  );
}
