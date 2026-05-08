import Image from "next/image";

/**
 * Site-wide footer. Tagline + timezone strapline + the optional mascot.
 * Pure presentation — never re-renders on data change.
 */
export function Footer() {
  return (
    <footer
      style={{
        padding: "14px 28px",
        borderTop: "1px solid var(--color-jbp-hairline)",
        background: "var(--color-jbp-paper)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 11,
        color: "var(--color-jbp-text-3)",
        fontFamily: "var(--font-mono)",
        letterSpacing: 0.5,
      }}
    >
      <span>America/Chicago · Meta Ads ↔ ServiceTitan attribution</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>Make a Good Call · J. Blanton Plumbing · Est. 1993</span>
        <Image
          src="/mascot.png"
          alt=""
          width={28}
          height={28}
          style={{ height: 28, width: "auto", opacity: 0.85 }}
        />
      </div>
    </footer>
  );
}
