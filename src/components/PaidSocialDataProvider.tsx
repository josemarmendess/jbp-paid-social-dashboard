"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PaidSocialPayload } from "@/lib/types";

/**
 * App-wide data context. Loaded once by the root layout and shared with
 * every page via this provider — so navigating between routes never
 * re-fetches the Apps Script payload, and per-page client filters work
 * against the same in-memory dataset.
 */
interface DataContextValue {
  data: PaidSocialPayload | null;
  error: string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

interface ProviderProps {
  data: PaidSocialPayload | null;
  error: string | null;
  children: ReactNode;
}

export function PaidSocialDataProvider({
  data,
  error,
  children,
}: ProviderProps) {
  return (
    <DataContext.Provider value={{ data, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function usePaidSocialData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error(
      "usePaidSocialData must be called inside <PaidSocialDataProvider>.",
    );
  }
  return ctx;
}
