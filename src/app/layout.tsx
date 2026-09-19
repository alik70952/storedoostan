import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "فروشگاه دوستان | بازی‌های PS4، PS5 و Xbox آفلاین",
    template: "%s | فروشگاه دوستان"
  },
  description: "فهرست کامل بازی‌های PlayStation 4، PlayStation 5 و Xbox آفلاین. بازی کنید، به سبک خودتان.",
  openGraph: {
    type: "website",
    siteName: "فروشگاه دوستان",
    title: "فروشگاه دوستان | بازی‌های PS4، PS5 و Xbox آفلاین",
    description: "فهرست کامل بازی‌های PlayStation 4، PlayStation 5 و Xbox آفلاین. بازی کنید، به سبک خودتان."
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#0b0e13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}