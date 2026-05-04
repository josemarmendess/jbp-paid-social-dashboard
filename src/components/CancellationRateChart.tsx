"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CancellationPoint } from "@/lib/aggregate";
import { cn } from "@/lib/utils";

interface CancellationRateChartProps {
  weekly: { current: CancellationPoint[]; previous: CancellationPoint[] };
  monthly: { current: CancellationPoint[]; previous: CancellationPoint[] };
}

type Granularity = "week" | "month";

function shortenWeekKey(k: string): string {
  // 2026-W18 -> W18
  return k.replace(/^\d{4}-/, "");
}
function shortenMonthKey(k: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m) return k;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[Number(m[2]) - 1];
}

export function CancellationRateChart({ weekly, monthly }: CancellationRateChartProps) {
  const [gran, setGran] = useState<Granularity>("week");
  const data = gran === "week" ? weekly : monthly;
  const shorten = gran === "week" ? shortenWeekKey : shortenMonthKey;

  // Zip current[i] and previous[i] by index so they align on x-axis
  const length = Math.max(data.current.length, data.previous.length);
  const merged = Array.from({ length }, (_, i) => {
    const cur = data.current[i];
    const prev = data.previous[i];
    return {
      bucket: cur ? shorten(cur.bucket) : prev ? `(prev ${shorten(prev.bucket)})` : "",
      current: cur?.rate ?? null,
      previous: prev?.rate ?? null,
    };
  });

  const empty = merged.every((d) => d.current === null && d.previous === null);
  if (empty) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Not enough data to render this chart.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-1">
        {(["week", "month"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGran(g)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              gran === g
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {g === "week" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v as number)}%`}
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => {
                if (value === null || value === undefined) return ["n/a", name];
                const n = Number(value);
                return Number.isFinite(n) ? [`${n.toFixed(1)}%`, name] : ["n/a", name];
              }}
            />
            <Legend
              verticalAlign="top"
              height={24}
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              dataKey="previous"
              name="Previous period"
              stroke="#a1a1aa"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
            <Line
              dataKey="current"
              name="Current period"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
