import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <EmptyState
        title="404 — page not found"
        description="The plumber's been crawling the pipes but can't find that one. Head back to the dashboard."
        mascotSize={300}
        cta={
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-[color:var(--color-jbp-blue)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--color-jbp-blue-hover)]"
          >
            Back to Overview
          </Link>
        }
      />
    </main>
  );
}
