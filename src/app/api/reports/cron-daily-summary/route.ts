import { NextResponse } from "next/server";
import { currentHourCT, runDailySummary } from "@/lib/cron/runner";

/**
 * Daily cron tick. Vercel Cron is registered against this path in
 * vercel.json with `0 22 * * *` (= 5:00 PM CT during CDT, 4:00 PM CT
 * during CST). Hobby tier limits us to one fire per day; the runner
 * gates each template only on the KV `enabled` toggle. When we move
 * to Pro the schedule flips to `0 * * * *` and the runtime hour-of-day
 * check in runner.ts wakes back up.
 *
 * The route name is kept (`cron-daily-summary`) for backwards-compat
 * with the existing Vercel Cron registration; the dispatch logic is
 * generic and extends to additional templates as they're added.
 *
 * Auth: Vercel cron requests carry `Authorization: Bearer ${CRON_SECRET}`.
 * The dashboard's "Send preview now" button does NOT call this route —
 * it goes through a server action that invokes the runner directly,
 * so this endpoint stays auth-gated.
 */

export const maxDuration = 120;

export async function GET(req: Request) {
  return wrap(req);
}
export async function POST(req: Request) {
  return wrap(req);
}

async function wrap(req: Request): Promise<Response> {
  try {
    return await tick(req);
  } catch (err) {
    console.error("[cron-tick] uncaught:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}

async function tick(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not set." },
      { status: 412 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const hour = currentHourCT();
  console.log(`[cron-tick] hour=${hour} CT`);

  // One result per template. Today only daily-summary exists; future
  // templates push into this array.
  const results: Record<string, unknown> = {};
  results["daily-summary"] = await runDailySummary();

  return NextResponse.json({ ok: true, hour, results });
}
