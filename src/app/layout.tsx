import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { geologica, onest } from "@/components/theme/fonts";
import { defaultPalette, isPalette, PALETTE_COOKIE } from "@/components/theme/palettes";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushAccountBoundary, ServiceWorkerRegistration } from "@/features/notifications";
import { getUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { isSupabaseConfigured } from "@/lib/env";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
    applicationName: "Halo",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Halo" },
    icons: { apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const user = isSupabaseConfigured ? await getUser() : null;
  const saved = (await cookies()).get(PALETTE_COOKIE)?.value;
  const palette = isPalette(saved) ? saved : defaultPalette;
  return (
    <html
      lang={locale}
      data-palette={palette}
      className={cn(onest.variable, geologica.variable, "h-full")}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <NextIntlClientProvider>
            {isSupabaseConfigured && <PushAccountBoundary userId={user?.id ?? null} />}
            {children}
          </NextIntlClientProvider>
          <ServiceWorkerRegistration />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
