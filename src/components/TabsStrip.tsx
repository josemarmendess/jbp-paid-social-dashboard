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
 * Horizontal tab strip — primary app navigation. Active tab carries a
 * 2px red underline; inactive tabs show a 2px transparent underline
 * that fades to 60%-red on hover (preview of the active state) and
 * the label darkens. Hover CSS lives in globals.css under
 * `.tabs-strip-link` so we don't need onMouseEnter handlers in JSX.
 * Filter URL params persist across nav so date/BU don't reset when
 * the user clicks a tab.
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
            data-active={active ? "true" : undefined}
            className="tabs-strip-link no-underline"
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
