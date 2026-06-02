import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { getLocale } from "@/lib/i18n/locale";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-geist-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Banana Sheet",
  description: "Frictionless personal finance. Log in a tap, see it beautifully.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Banana Sheet" },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fffbf0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${notoSansThai.variable} h-full antialiased`} data-theme="light">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
