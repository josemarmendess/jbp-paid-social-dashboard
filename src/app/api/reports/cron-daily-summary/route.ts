import { NextResponse } from "next/server";
import {
  computePivotMetrics,
  type BusinessUnit,
} from "@/lib/aggregate";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPivotPeriods } from "@/lib/periods";
import { CANONICAL_SERVICES } from "@/lib/serviceTaxonomy";
import { postMessage, resolveChannel } from "@/lib/slack";

/**
 * Daily Summary cron — invoked by Vercel Cron at 19:00 America/Chicago
 * (configured in vercel.json). Builds a Slack-mrkdwn message with
 * yesterday's KPIs per service and posts it to the configured channel.
 *
 * For now this sends a TEXT-formatted summary, not the full image. The
 * image flow uses html-to-image which only runs in the browser; rendering
 * server-side requires Satori/@vercel/og + a flex-only refactor of the
 * report layout. Defer until requested.
 *
 * Env required:
 *   SLACK_BOT_TOKEN          — same bot token as the manual Send button
 *   SLACK_DAILY_CHANNEL      — destination for the cron (channel ID
 *                              preferred; falls back to SLACK_REVIEW_CHANNEL)
 *   CRON_SECRET              — Vercel injects this on cron invocations.
 *                              Required so manual hits to this URL get a 401.
 *
 * Schedule: vercel.json registers the cron at "0 0 * * *" (00:00 UTC).
 * That's 19:00 America/Chicago during CDT (Mar–Nov). During CST it lands
 * at 18:00 CT — adjust the cron expression in November if exact 19:00
 * year-round is required.
 */

// Allow GET (Vercel cron) and POST (manual debug). Both share the same
// auth + body so you can curl the endpoint to test before the schedule
// fires.
export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  // Vercel cron requests carry `Authorization: Bearer ${CRON_SECRET}`.
  // Reject anything else so the public can't trigger sends.
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "CRON_SECRET not set — refusing to run unauthenticated.",
      },
      { status: 412 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const destination =
    process.env.SLACK_DAILY_CHANNEL || process.env.SLACK_REVIEW_CHANNEL;
  if (!token || !destination) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing SLACK_BOT_TOKEN or destination (SLACK_DAILY_CHANNEL / SLACK_REVIEW_CHANNEL).",
      },
      { status: 412 },
    );
  }

  const data = await fetchPaidSocialData();
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "fetchPaidSocialData returned null" },
      { status: 502 },
    );
  }

  const periods = getPivotPeriods();
  const yesterday = periods.find((p) => p.key === "yesterday");
  if (!yesterday) {
    return NextResponse.json(
      { ok: false, error: "no yesterday period definition" },
      { status: 500 },
    );
  }

  const dateLabel = formatDate.format(new Date());
  const yLabel = formatDate.format(
    new Date(`${yesterday.range.startStr}T12:00:00Z`),
  );

  const services: Array<{ key: string; label: string; bu: BusinessUnit }> = [
    { key: "all", label: "All services", bu: [] },
    ...CANONICAL_SERVICES.map((s) => ({
      key: s,
      label: s,
      bu: [s] as BusinessUnit,
    })),
  ];

  const lines: string[] = [];
  lines.push(
    `:bar_chart: *Daily Summary — KPIs per service · ${dateLabel} CT*`,
  );
  lines.push(`_Yesterday's numbers (${yLabel}) — auto-sent by JBP Dashboard_`);
  lines.push("");

  for (const svc of services) {
    const m = computePivotMetrics(
      data.meta_insights,
      data.servicetitan_social_leads,
      yesterday.range,
      svc.bu,
    );
    lines.push(`*${svc.label}*`);
    lines.push(`  • Spend: ${money(m.spend)}`);
    lines.push(`  • Leads: ${m.leads.toLocaleString("en-US")}`);
    lines.push(`  • CPL: ${moneyOrDash(m.costPerLead, true)}`);
    lines.push(`  • Booked: ${m.bookedJobs.toLocaleString("en-US")}`);
    lines.push(`  • CPB: ${moneyOrDash(m.costPerBookedJob, true)}`);
    lines.push(`  • Sales Revenue: ${money(m.revenue)}`);
    lines.push(
      `  • Spend / Revenue: ${pctOrDash(m.spendOnRevenue)}`,
    );
    lines.push(
      `  • Avg Sale: ${moneyOrDash(m.averageSaleValue, false)}`,
    );
    lines.push(`  • Cancel Rate: ${pctOrDash(m.cancellationRate)}`);
    lines.push("");
  }

  try {
    const channelId = await resolveChannel(token, destination);
    const result = await postMessage(token, channelId, lines.join("\n"));
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: `Slack: ${result.error ?? "unknown"}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, sent: dateLabel });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "send failed" },
      { status: 502 },
    );
  }
}

const formatDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function moneyOrDash(n: number | null, precise: boolean): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return precise
    ? "$" + n.toFixed(2)
    : "$" + Math.round(n).toLocaleString("en-US");
}

function pctOrDash(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(1) + "%";
}
