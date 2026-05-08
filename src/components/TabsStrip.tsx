"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/performance", label: "Performance" },
  { href: "/funnel", label: "Funnel" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/history", label: "History" },
  { href: "/geography", label: "Geography" },
  { href: "/creatives", label: "Creatives" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

/**
 * Horizontal tab strip — replaces the old vertical sidebar. Active tab
 * shows a 2px red underline. Filter URL params persist across nav so
 * date/BU don't reset when the user clicks a tab.
 */
export function TabsStrip() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const qsString = searchParams?.toString() ?? "";
  const qs = qsString ? `?${qsString}` : "";

  return (
    <nav
      aria-label="Primary"
      style={{
        display: "flex",
        gap: 0,
        padding: "0 28px",
        background: "var(--color-jbp-white)",
        borderBottom: "1px solid var(--color-jbp-hairline)",
        overflowX: "auto",
      }}
    >
      {TABS.map((t) => {
        const active =
          t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={`${t.href}${qs}`}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "13px 16px",
              borderBottom: active
                ? "2px solid var(--color-jbp-red)"
                : "2px solid transparent",
              color: active
                ? "var(--color-jbp-text)"
                : "var(--color-jbp-text-2)",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.005em",
              marginBottom: -1,
              whiteSpace: "nowrap",
              textDecoration: "none",
              transition: "color .12s",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
