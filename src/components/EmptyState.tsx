"use client";

import Image from "next/image";
import { useState } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Mascot dimensions in px (square). Defaults to 200. */
  mascotSize?: number;
  cta?: React.ReactNode;
}

/**
 * Branded empty/coming-soon state with the JBP plumber mascot.
 * Falls back gracefully if /mascot.png is not deployed yet.
 */
export function EmptyState({
  title,
  description,
  mascotSize = 200,
  cta,
}: EmptyStateProps) {
  const [mascotOk, setMascotOk] = useState(true);
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      {mascotOk ? (
        <Image
          src="/mascot.png"
          alt=""
          width={mascotSize}
          height={mascotSize}
          onError={() => setMascotOk(false)}
          priority
          className="select-none opacity-90"
          style={{ width: mascotSize, height: "auto" }}
        />
      ) : null}
      <h2
        className="font-display text-[color:var(--color-text-primary)]"
        style={{ fontSize: 20, letterSpacing: "0.04em" }}
      >
        {title}
      </h2>
      {description ? (
        <p className="max-w-md text-sm text-[color:var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  );
}
