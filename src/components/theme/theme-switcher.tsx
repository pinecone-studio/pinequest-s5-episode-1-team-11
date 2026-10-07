"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore, useTransition } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/cn";
import { setPalette } from "./actions";
import { type Palette, paletteSwatches, palettes } from "./palettes";

const subscribeToMount = () => () => {};

/** Систем / Харанхуй / Цайвар. */
export function ModeSelect() {
  const t = useTranslations("common.theme");
  const { theme = "dark", setTheme } = useTheme();
  // localStorage is only available in the browser. Hydrate with the same server value first.
  const mounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );
  const options = (["system", "dark", "light"] as const).map((v) => ({ value: v, label: t(v) }));
  return (
    <SegmentedControl
      label={t("mode")}
      options={options}
      value={mounted ? (theme as "system" | "dark" | "light") : "dark"}
      onValueChange={setTheme}
    />
  );
}

/** Four colour swatches: Нуур, Шөнө, Дулаан, Анхны. */
export function PaletteSelect({ value }: { value: Palette }) {
  const t = useTranslations("common.theme");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <fieldset
      className="glass m-0 grid min-w-0 grid-cols-4 gap-2 rounded-lg px-3 py-4"
      aria-busy={pending}
    >
      <legend className="sr-only">{t("palette")}</legend>
      {palettes.map((p) => {
        const [bg, accent] = paletteSwatches[p];
        return (
          <label
            key={p}
            className="group grid cursor-pointer justify-items-center gap-2 text-sm font-semibold text-muted-foreground has-checked:text-foreground"
          >
            <input
              type="radio"
              name="palette"
              value={p}
              defaultChecked={p === value}
              className="sr-only"
              onChange={() =>
                start(async () => {
                  document.documentElement.dataset.palette = p;
                  await setPalette(p);
                  router.refresh();
                })
              }
            />
            <span
              aria-hidden="true"
              className={cn(
                "relative size-[52px] rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]",
                "after:absolute after:-inset-[5px] after:rounded-full after:border-2 after:border-foreground after:opacity-0 after:transition-opacity group-has-checked:after:opacity-100 group-has-focus-visible:after:border-ring",
              )}
              style={{ background: `radial-gradient(circle, ${accent} 0 30%, ${bg} 33%)` }}
            />
            {t(p)}
          </label>
        );
      })}
    </fieldset>
  );
}

/** Монгол / English. */
export function LanguageSelect() {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <SegmentedControl
      label={t("label")}
      options={[
        { value: "mn", label: t("mn") },
        { value: "en", label: t("en") },
      ]}
      value={locale}
      onValueChange={(v) =>
        start(async () => {
          await setLocale(v);
          router.refresh();
        })
      }
    />
  );
}
