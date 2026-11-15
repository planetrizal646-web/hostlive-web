import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-loaded",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-loaded",
});

export const metadata: Metadata = {
  title: {
    default: "Hostlive \u2014 manajemen sesi live host affiliate",
    template: "%s \u00b7 Hostlive",
  },
  description: "Manajemen sesi live host affiliate: jadwal studio, durasi live, dan rekap hasil.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFF1EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0F120F" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
