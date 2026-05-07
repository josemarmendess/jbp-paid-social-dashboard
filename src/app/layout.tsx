import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { PaidSocialDataProvider } from "@/components/PaidSocialDataProvider";
import { fetchPaidSocialData } from "@/lib/fetchData";
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

/**
 * Data is fetched once at the layout level and passed into a Client Provider.
 * Every page below reads from useState/useMemo against this in-memory copy —
 * navigating between routes does NOT trigger a re-fetch (the layout is shared
 * across all routes and is rendered once per session). The fetch itself is
 * cached at two layers (Vercel Data Cache + "use cache"), so even on
 * cold-start the cost is paid at most once every 30 minutes.
 *
 * fetchPaidSocialData never throws — null means "couldn't load"; pages render
 * an error banner from the provider's `error` field in that case.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const data = await fetchPaidSocialData();
  // The ErrorBanner already prefixes "Failed to load data." — pass only the
  // tail so we don't get double-prefix in the rendered message.
  const error = data === null ? "Try refreshing." : null;

  return (
    <html
      lang="en"
      className={`${barlow.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full bg-jbp-cream text-[color:var(--color-text-primary)]">
        <PaidSocialDataProvider data={data} error={error}>
          <AppShell>{children}</AppShell>
        </PaidSocialDataProvider>
      </body>
    </html>
  );
}
