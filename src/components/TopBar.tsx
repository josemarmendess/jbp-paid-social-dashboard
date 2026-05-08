"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FreshnessIndicator } from "@/components/FreshnessIndicator";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { RefreshButton } from "@/components/RefreshButton";

/**
 * Site-wide top bar. Logo on the left, freshness + refresh + avatar on the
 * right. Lives outside any page client so it's the same on every route and
 * doesn't re-render when the page swaps.
 */
export function TopBar() {
  const { data, error } = usePaidSocialData();
  const searchParams = useSearchParams();
  const qsString = searchParams?.toString() ?? "";
  const qs = qsString ? `?${qsString}` : "";
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        background: "var(--color-jbp-white)",
        borderBottom: "1px solid var(--color-jbp-hairline)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href={`/${qs}`}
          aria-label="Overview"
          style={{ display: "block", lineHeight: 0 }}
        >
          {logoOk ? (
            <Image
              src="/logo-jbp.png"
              alt="J. Blanton Plumbing"
              width={140}
              height={32}
              priority
              onError={() => setLogoOk(false)}
              style={{ height: 32, width: "auto", display: "block" }}
            />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--color-jbp-red)",
              }}
            >
              J.BLANTON
              <span style={{ marginLeft: 4, color: "var(--color-jbp-text)" }}>
                PLUMBING
              </span>
            </span>
          )}
        </Link>
        <span
          style={{
            width: 1,
            height: 22,
            background: "var(--color-jbp-hairline)",
          }}
        />
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--color-jbp-text-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Paid Social
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.005em",
            }}
          >
            Dashboard
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <SyncBadge generatedAt={data?.generated_at} hasError={!!error} />
        <RefreshButton />
        <UserAvatar />
      </div>
    </header>
  );
}

function SyncBadge({
  generatedAt,
  hasError,
}: {
  generatedAt: string | undefined;
  hasError: boolean;
}) {
  if (hasError) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 11,
          color: "var(--color-jbp-bad)",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--color-jbp-bad)",
            display: "inline-block",
          }}
        />
        Sync failed
      </div>
    );
  }
  if (!generatedAt) return null;
  // FreshnessIndicator carries its own tone-colored dot (fresh/ok/stale),
  // so we don't double up on a redundant green dot here.
  return <FreshnessIndicator generatedAt={generatedAt} />;
}

function UserAvatar() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        background: "var(--color-jbp-red)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.5,
        fontFamily: "var(--font-display)",
      }}
      aria-label="JM"
      title="JM"
    >
      JM
    </div>
  );
}
