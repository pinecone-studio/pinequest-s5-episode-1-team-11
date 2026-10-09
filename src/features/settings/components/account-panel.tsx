"use client";

import { SignOutIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/contracts";
import { signOut } from "@/features/auth/actions";
import { unsubscribeBrowserPush } from "@/features/notifications/browser";
import { routes } from "@/lib/routes";
import { deleteAccount } from "../actions";
import { revokeBrowserPush } from "../revoke-browser-push";

export function AccountPanel({ profile, demo }: { profile: Profile; demo: boolean }) {
  const t = useTranslations("settings");
  const common = useTranslations("common.actions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, deleteAction, deleting] = useActionState(deleteAccount, {});
  const [signingOut, startTransition] = useTransition();
  const [signOutError, setSignOutError] = useState("");
  useEffect(() => {
    if (!state.deleted) return;
    void (async () => {
      try {
        await unsubscribeBrowserPush();
      } catch {
        /* The deleted account no longer receives pushes. */
      }
      router.replace(routes.login);
      router.refresh();
    })();
  }, [state.deleted, router]);
  return (
    <section className="grid gap-3" aria-labelledby="account-title">
      <h2 id="account-title" className="pl-1 text-base font-bold text-muted-foreground">
        {t("account")}
      </h2>
      <div className="glass grid gap-4 rounded-lg p-5">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} />
          <p className="break-words text-md font-bold">{profile.name}</p>
        </div>
        {demo && <p className="text-sm text-muted-foreground">{t("accountDemo")}</p>}
        <Button
          variant="secondary"
          loading={signingOut}
          disabled={demo}
          onClick={() =>
            startTransition(async () => {
              setSignOutError("");
              try {
                await revokeBrowserPush();
              } catch {
                setSignOutError(t("signOutPushError"));
                return;
              }
              const result = await signOut();
              if (result?.error) setSignOutError(result.error);
            })
          }
        >
          <SignOutIcon aria-hidden="true" />
          {t("signOut")}
        </Button>
        {signOutError && (
          <p role="alert" className="text-sm text-destructive-text">
            {signOutError}
          </p>
        )}
        <AlertDialog
          open={open}
          onOpenChange={setOpen}
          title={t("deleteTitle")}
          description={t("deleteHint")}
          confirmLabel={t("deleteAccount")}
          cancelLabel={common("cancel")}
          loading={deleting}
          confirmDisabled={demo || confirmation !== "DELETE"}
          trigger={
            <Button variant="ghost" disabled={demo} className="text-destructive-text">
              <TrashIcon aria-hidden="true" />
              {t("deleteAccount")}
            </Button>
          }
          onConfirm={() =>
            startTransition(async () => {
              const form = new FormData();
              form.set("confirmation", confirmation);
              deleteAction(form);
            })
          }
        >
          <Input
            label={t("deleteConfirm")}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
          {state.error && (
            <p role="alert" className="text-sm text-destructive-text">
              {state.error}
            </p>
          )}
        </AlertDialog>
      </div>
    </section>
  );
}
