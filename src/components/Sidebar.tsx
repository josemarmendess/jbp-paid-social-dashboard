"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Filter,
  TrendingUp,
  Map,
  Image as ImageIcon,
  FileText,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState } from "react";

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
  { href: "/geography", label: "Geography", Icon: Map },
  { href: "/creatives", label: "Creatives", Icon: ImageIcon },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  // Logo gracefully degrades if file is missing — we render text fallback.
  const [logoOk, setLogoOk] = useState(true);

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
          {logoOk ? (
            <Image
              src="/logo-jbp.png"
              alt="J. Blanton Plumbing"
              width={180}
              height={40}
              priority
              onError={() => setLogoOk(false)}
              className="h-9 w-auto"
            />
          ) : (
            <span
              className="font-display text-[color:var(--color-jbp-red)]"
              style={{ fontSize: 22, letterSpacing: "0.04em" }}
            >
              J.BLANTON
              <span className="ml-1 text-[color:var(--color-text-primary)]">
                PLUMBING
              </span>
            </span>
          )}
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
                "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-[color:var(--color-surface-hover)] font-medium text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)]/60 hover:text-[color:var(--color-text-primary)]",
              ].join(" ")}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[color:var(--color-jbp-red)]"
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

      <SidebarMascot />

      <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-3 text-[10px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
        Made for the JBP team
      </div>
    </aside>
  );
}

/**
 * Sidebar-anchored mascot — sits just above the "Made for the JBP team"
 * footer at full opacity, gently breathing in place. Hides itself if the
 * asset is missing so the layout stays clean.
 */
function SidebarMascot() {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className="flex items-end justify-center px-2 pb-1 pt-2">
      <Image
        src="/mascot.png"
        alt=""
        width={220}
        height={260}
        onError={() => setOk(false)}
        className="block h-auto w-[140px] origin-bottom select-none [animation:jbp-pulse_3.5s_ease-in-out_infinite]"
        style={{ filter: "drop-shadow(0 4px 12px rgba(26,15,11,0.10))" }}
      />
      <style>{`
        @keyframes jbp-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.025); }
        }
      `}</style>
    </div>
  );
}
