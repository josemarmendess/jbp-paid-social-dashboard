import type { StaleBooking } from "@/lib/aggregate";

interface StaleBookingsTableProps {
  rows: StaleBooking[];
}

/**
 * Stale bookings list — pending jobs created more than N days ago. Sorted
 * by daysOpen desc. Capped to 25 rows in the UI; we surface the count when
 * the underlying list is longer.
 */
export function StaleBookingsTable({ rows }: StaleBookingsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-8 text-center text-[13px] text-[color:var(--color-text-tertiary)]">
        No stale bookings. Every recent lead has progressed past the threshold.
      </div>
    );
  }
  const capped = rows.slice(0, 25);
  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-[color:var(--color-border-subtle)]">
              <Th>Job #</Th>
              <Th>Created</Th>
              <Th>Service</Th>
              <Th>Status</Th>
              <Th>Campaign</Th>
              <Th align="right">Days open</Th>
            </tr>
          </thead>
          <tbody>
            {capped.map((r) => (
              <tr
                key={String(r.jobNumber)}
                className="border-b border-[color:var(--color-border-subtle)] last:border-b-0"
              >
                <td className="px-3 py-2.5 font-mono tabular-nums">
                  {r.jobNumber}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[color:var(--color-text-secondary)]">
                  {r.creationDate}
                </td>
                <td className="px-3 py-2.5">
                  {r.businessUnit ? (
                    <span className="inline-flex items-center rounded bg-[color:var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] font-medium">
                      {r.businessUnit}
                    </span>
                  ) : (
                    <span className="text-[color:var(--color-text-tertiary)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[color:var(--color-text-secondary)]">
                  {r.status || "—"}
                </td>
                <td
                  className="max-w-[260px] truncate px-3 py-2.5 text-[color:var(--color-text-secondary)]"
                  title={r.campaignName}
                >
                  {r.campaignName || "—"}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center rounded bg-[color:var(--color-jbp-red)]/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[color:var(--color-jbp-red)]">
                    {r.daysOpen}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 25 ? (
        <div className="border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-4 py-2 text-[11px] text-[color:var(--color-text-secondary)]">
          Showing 25 of {rows.length} stale bookings.
        </div>
      ) : null}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)] ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}
