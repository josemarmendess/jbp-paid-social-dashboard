import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Suspense fallback={<aside className="hidden w-[224px] border-r border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)] lg:block" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[224px]">
        {children}
      </div>
    </div>
  );
}
