import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  variable: "--font-barlow",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JBP Paid Social Dashboard",
  description: "Meta Ads + ServiceTitan attribution for J. Blanton Plumbing",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full bg-jbp-cream text-[color:var(--color-text-primary)]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
