import { EmptyState } from "@/components/EmptyState";

interface StubPageProps {
  title: string;
  breadcrumb?: string;
  description?: string;
}

/**
 * Lightweight chrome-only page used while sections are still under construction.
 * Renders the same TopHeader-aligned spacing as the rest of the app and a
 * brand-correct "coming soon" empty state in the body.
 */
export function StubPage({ title, breadcrumb, description }: StubPageProps) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/95 px-6 backdrop-blur-sm">
        <div className="flex flex-col">
          {breadcrumb ? (
            <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {breadcrumb}
            </span>
          ) : null}
          <h1
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 22, lineHeight: 1.1 }}
          >
            {title}
          </h1>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-6">
        <EmptyState
          title="Coming soon"
          description={
            description ??
            "We're rolling this section out next. Bookmark it and check back shortly."
          }
        />
      </div>
    </main>
  );
}
