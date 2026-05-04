"use client";

import { useState } from "react";
import Image from "next/image";

interface CreativeThumbProps {
  src?: string;
  alt: string;
  size?: number;
  /** Render as button when onClick is set. Receives the event so callers
   * inside row-click contexts can stopPropagation. */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Square ad-creative thumbnail with a cream-gradient + mascot fallback when
 * the image is missing or 404s. The fallback ALSO covers the (current) case
 * where the API hasn't started returning meta_ad_creatives yet.
 */
export function CreativeThumb({
  src,
  alt,
  size = 40,
  onClick,
}: CreativeThumbProps) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  const inner = showImage ? (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className="h-full w-full object-cover"
      unoptimized
    />
  ) : (
    <Fallback size={size} />
  );

  const cls = [
    "relative inline-block overflow-hidden rounded-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]",
    onClick && "cursor-zoom-in transition-transform hover:scale-[1.04]",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={`View ${alt}`}
        onClick={(e) => onClick(e)}
        className={cls}
        style={{ width: size, height: size }}
      >
        {inner}
      </button>
    );
  }
  return (
    <span className={cls} style={{ width: size, height: size }}>
      {inner}
    </span>
  );
}

function Fallback({ size }: { size: number }) {
  // Small mascot for tiny thumbs is too noisy — use the JBP wrench glyph.
  if (size <= 56) {
    return (
      <span
        className="flex h-full w-full items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, var(--color-jbp-cream) 0%, var(--color-surface-hover) 100%)",
        }}
        aria-hidden="true"
      >
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-jbp-red)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </span>
    );
  }
  // Larger fallback shows the mascot.
  return (
    <span
      className="flex h-full w-full items-end justify-center pt-2"
      style={{
        background:
          "linear-gradient(135deg, var(--color-jbp-cream) 0%, var(--color-surface-hover) 100%)",
      }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot.png"
        alt=""
        style={{ width: size * 0.7, height: "auto" }}
        className="select-none"
      />
    </span>
  );
}
