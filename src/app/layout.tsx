import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { onest, unbounded } from "@/components/theme/fonts";
import { defaultPalette, isPalette, PALETTE_COOKIE } from "@/components/theme/palettes";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08181c" },
    { media: "(prefers-color-scheme: light)", color: "#f3f7f7" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const saved = (await cookies()).get(PALETTE_COOKIE)?.value;
  const palette = isPalette(saved) ? saved : defaultPalette;
  return (
    <html
      lang={locale}
      data-palette={palette}
      className={cn(onest.variable, unbounded.variable, "h-full")}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
