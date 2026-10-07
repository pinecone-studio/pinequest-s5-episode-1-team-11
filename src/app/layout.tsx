import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halo",
  description:
    "Гэртээ ганцаараа байгаа хүмүүсийн аюулыг камераар илрүүлж, асран хамгаалагчид шууд мэдэгдэнэ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
