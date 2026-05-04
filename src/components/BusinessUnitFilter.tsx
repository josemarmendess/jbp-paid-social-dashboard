"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BusinessUnitFilterProps {
  options: string[];
  value: string;
}

export function BusinessUnitFilter({ options, value }: BusinessUnitFilterProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();

  function onChange(next: string | null) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (!next || next === "All") sp.delete("bu");
    else sp.set("bu", next);
    const query = sp.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return (
    <Select value={value || "All"} onValueChange={onChange}>
      <SelectTrigger
        className="min-w-[140px]"
        aria-label="Business Unit"
        data-pending={pending ? "true" : undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All services</SelectItem>
        {options.map((bu) => (
          <SelectItem key={bu} value={bu}>
            {bu}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
