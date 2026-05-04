"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FunnelMetrics } from "@/lib/aggregate";

interface FunnelChartProps {
  metrics: FunnelMetrics;
}

const intFmt = new Intl.NumberFormat("en-US");
const COLORS = ["#71717a", "#3f3f46", "#10b981", "#059669", "#047857"];

export function FunnelChart({ metrics }: FunnelChartProps) {
  const data = [
    { stage: "Impressions", value: metrics.impressions, prev: null as number | null },
    { stage: "Link Clicks", value: metrics.linkClicks, prev: metrics.impressions },
    { stage: "Leads", value: metrics.leads, prev: metrics.linkClicks },
    { stage: "Booked", value: metrics.bookedJobs, prev: metrics.leads },
    { stage: "Sold", value: metrics.soldJobs, prev: metrics.bookedJobs },
  ];
  const allZero = data.every((d) => !d.value);
  if (allZero) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Not enough data to render this chart.
      </div>
    );
  }
  const enriched = data.map((d) => ({
    ...d,
    label:
      d.prev && d.prev > 0
        ? `${intFmt.format(d.value)} · ${((d.value / d.prev) * 100).toFixed(1)}%`
        : intFmt.format(d.value),
  }));
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={enriched} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => intFmt.format(v as number)}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [intFmt.format(Number(value)), "count"]}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {enriched.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 10, fill: "currentColor", opacity: 0.7 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
