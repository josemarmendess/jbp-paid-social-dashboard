"use client";

import { useState } from "react";
import { Calendar, Download, Link as LinkIcon, Mail } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ServiceViewToggle } from "@/components/ServiceViewToggle";

/**
 * Reports — placeholder for Phase C+. The buttons surface intent (PDF
 * export, share link, email schedule) but currently show a toast-style
 * "coming soon" notice. We expose them now so when JBP picks an output
 * channel we know which surfaces to wire first.
 */
export default function ReportsPage() {
  const [toast, setToast] = useState<string | null>(null);

  function notify(label: string) {
    setToast(`${label} — coming in a future release.`);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/95 px-6 backdrop-blur-sm">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            Dashboard / Reports
          </span>
          <h1
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 22, lineHeight: 1.1 }}
          >
            Reports
          </h1>
        </div>
        <ServiceViewToggle view="combined" />
      </header>

      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-6 px-6 py-8 sm:px-8">
        <section className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-6">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Distribution
          </h2>
          <p className="mt-1 text-[12px] text-[color:var(--color-text-secondary)]">
            JBP team typically pastes the Overview into Slack, but here are the
            channels we&apos;ll wire when you pick the format.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ActionCard
              icon={<Download className="h-4 w-4" />}
              title="Generate PDF"
              description="Snapshot the Overview as a printable PDF for sharing offline."
              onClick={() => notify("PDF export")}
            />
            <ActionCard
              icon={<LinkIcon className="h-4 w-4" />}
              title="Share link"
              description="One-click signed URL that opens this dashboard at the same filters."
              onClick={() => notify("Share link")}
            />
            <ActionCard
              icon={<Mail className="h-4 w-4" />}
              title="Email schedule"
              description="Daily / weekly digest delivered to one or more team mailboxes."
              onClick={() => notify("Email schedule")}
            />
          </div>
        </section>

        <section className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-6">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Recent runs
          </h2>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-jbp-cream)]/40 p-4">
            <Calendar
              className="h-4 w-4 text-[color:var(--color-text-tertiary)]"
              aria-hidden="true"
            />
            <p className="text-[12px] text-[color:var(--color-text-secondary)]">
              No reports generated yet. Once any of the actions above ship,
              every run lands here with timestamps and re-share buttons.
            </p>
          </div>
        </section>

        <section>
          <EmptyState
            title="Reports coming soon"
            description="We're working on this. In the meantime, the Overview page is the source of truth for daily share-outs."
            mascotSize={220}
          />
        </section>

        {toast ? (
          <div
            role="status"
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[color:var(--color-border-strong)] bg-[color:var(--color-text-primary)] px-4 py-2 text-[12px] font-medium text-white shadow-xl"
          >
            {toast}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4 text-left transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(26,15,11,0.06)]"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--color-jbp-blue)]/10 text-[color:var(--color-jbp-blue)]">
        {icon}
      </span>
      <span className="text-[14px] font-semibold text-[color:var(--color-text-primary)]">
        {title}
      </span>
      <span className="text-[12px] leading-relaxed text-[color:var(--color-text-secondary)]">
        {description}
      </span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-jbp-blue)]">
        Coming soon →
      </span>
    </button>
  );
}
