import { Card, CardContent } from "@/components/ui/card";
import { formatInt } from "@/lib/format";

interface CarryoverPipelineCardProps {
  count: number;
}

export function CarryoverPipelineCard({ count }: CarryoverPipelineCardProps) {
  return (
    <Card className="gap-2">
      <CardContent className="flex flex-col gap-3 py-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Carryover Pipeline
        </span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatInt(count)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Last month leads still pending
        </span>
      </CardContent>
    </Card>
  );
}
