import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../style.css";

const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800"
});

const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800"
});

export const metadata: Metadata = {
  title: "NATCON 2026 — Knowledge with Purpose",
  description: "Register for the 7th Annual National Conference of The Achiever Ambassadors Islamic Foundation."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07154f"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
