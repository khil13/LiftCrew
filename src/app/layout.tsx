import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import SiteAnalytics from "@/components/SiteAnalytics";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.liftcrewnj.com"),
  title: "LiftCrew",
  description: "Labor-only moving help. Book local helpers to load, unload, and pack.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "LiftCrew", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3154de",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-slate-700 antialiased">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
