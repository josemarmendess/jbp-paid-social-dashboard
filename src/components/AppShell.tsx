import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { TabsStrip } from "@/components/TabsStrip";
import { TopBar } from "@/components/TopBar";

/**
 * App-wide chrome. Top bar + horizontal tabs at the top, page content in the
 * middle, footer at the bottom. The Suspense fallbacks shield the layout from
 * client-only hooks (TopBar reads context, TabsStrip reads searchParams) so
 * static prerender of /reports / /settings / /_not-found doesn't bail.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        background: "var(--color-jbp-cream)",
      }}
    >
      <Suspense fallback={<div style={{ height: 56 }} />}>
        <TopBar />
      </Suspense>
      <Suspense fallback={<div style={{ height: 47 }} />}>
        <TabsStrip />
      </Suspense>
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
