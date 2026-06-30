"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Filter,
  TrendingUp,
  Map,
  Image as ImageIcon,
  FileText,
  History as HistoryIcon,
  Settings as SettingsIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/performance", label: "Performance", Icon: BarChart3 },
  { href: "/funnel", label: "Funnel", Icon: Filter },
  { href: "/pipeline", label: "Pipeline", Icon: TrendingUp },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/geography", label: "Geography", Icon: Map },
  { href: "/creatives", label: "Creatives", Icon: ImageIcon },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  // Persist URL filters across page nav so the global date/BU filters don't reset
  // when the user clicks a nav item.
  const qsString = searchParams?.toString() ?? "";
  const qs = qsString ? `?${qsString}` : "";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col border-r border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)] lg:flex"
      aria-label="Primary"
    >
      <div className="flex h-16 items-center border-b border-[color:var(--color-border-subtle)] px-5">
        <Link href={`/${qs}`} className="block transition-opacity hover:opacity-80">
          <span
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.01em" }}
          >
            Paid Social
            <span className="ml-1 text-[color:var(--color-text-tertiary)]" style={{ fontWeight: 400 }}>
              Dashboard
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={`${item.href}${qs}`}
              aria-current={active ? "page" : undefined}
              className={[
                "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] no-underline",
                "transition-[background-color,color,transform] duration-150",
                active
                  ? "bg-[color:var(--color-surface-hover)] font-medium text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)] hover:translate-x-[1px]",
              ].join(" ")}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[color:var(--color-jbp-red)]"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-[color:var(--color-jbp-red)] opacity-0 transition-opacity duration-150 group-hover:opacity-60"
                />
              )}
              <item.Icon
                className="h-4 w-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-3 text-[10px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
        Demo mode
      </div>
    </aside>
  );
}

