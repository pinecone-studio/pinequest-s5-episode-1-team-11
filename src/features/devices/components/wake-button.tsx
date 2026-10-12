"use client";

import { BellRingingIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { wakeDevice } from "../actions";

/** Offline camera: ask its phone, through a notification, to reopen the camera page. */
export function WakeButton({ deviceId }: { deviceId: string }) {
  const t = useTranslations("devices.offline.wake");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <Button
        loading={pending}
        className="w-fit"
        onClick={() =>
          start(async () => {
            const result = await wakeDevice(deviceId);
            if (result.ok && result.data === "sent") toast.success(t("sent"));
            else if (result.ok) toast(t("unavailable"));
            else toast.error(t("failed"));
          })
        }
      >
        <BellRingingIcon aria-hidden="true" />
        {t("button")}
      </Button>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
