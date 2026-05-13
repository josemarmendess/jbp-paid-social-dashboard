import "server-only";
import { fetchPaidSocialDataDirect } from "@/lib/fetchData";
import { renderDailySummaryImage } from "@/lib/reports/renderImage";
import { DAILY_SUMMARY_DEFAULT_CONFIG } from "@/lib/reportTemplates";
import {
  completeUpload,
  getUploadUrl,
  postBlocks,
  resolveChannel,
  sanitizeFilename,
  uploadBytesToSlack,
} from "@/lib/slack";
import {
  getCronConfig,
  setCronConfig,
  setPreviewBuffer,
  type CronConfig,
} from "./storage";

/**
 * Per-template runners. Each runner does the full preview-to-DM flow
 * end-to-end. The hourly cron tick decides who to invoke based on the
 * stored CronConfig + the current America/Chicago hour; the dashboard
 * "Send preview now" button calls them with `force: true` to bypass
 * the schedule check.
 *
 * On success or failure, the runner persists the result back to the
 * config (lastSentAt / lastError) so the UI can show recent status.
 */

export interface RunResult {
  ok: boolean;
  /** Filled when ok=false; undefined otherwise. */
  error?: string;
  /** Filled when ok=true; the human-readable date label that was used. */
  sent?: string;
  /** Filled when the runner is intentionally skipped (e.g. wrong hour). */
  skipped?: string;
}

const formatDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Current hour in America/Chicago as 0–23. Used by the tick handler
 * to decide which templates are due this hour.
 */
export function currentHourCT(now: Date = new Date()): number {
  // Intl.DateTimeFormat gives us a locale-formatted hour; pull just the
  // hour and parse. `hour: "numeric"` + `hourCycle: "h23"` makes the
  // string a clean 0–23.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Math.max(0, Math.min(23, Number(h)));
}

/**
 * Daily Summary runner. Renders the PNG, uploads to the reviewer's
 * DM, and posts the Approve/Cancel button card. `force=true` bypasses
 * the schedule + enabled check for manual "Send now".
 */
export async function runDailySummary(
  opts: { force?: boolean } = {},
): Promise<RunResult> {
  const templateId = "daily-summary" as const;
  const config = await getCronConfig(templateId);

  if (!opts.force) {
    if (!config.enabled) {
      return { ok: true, skipped: "disabled" };
    }
    // Note: hour-of-day gating lives in vercel.json (Hobby tier only
    // supports one-fire-per-day crons). Once we upgrade to Pro the
    // schedule moves to `0 * * * *` and we re-enable the runtime hour
    // check via `currentHourCT() !== config.hourCT`.
  }

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return await persist(templateId, config, {
      ok: false,
      error: "SLACK_BOT_TOKEN not set on Vercel.",
    });
  }
  const reviewer =
    config.reviewerChannel || process.env.SLACK_REVIEW_CHANNEL;
  const targetChannel =
    config.targetChannel || process.env.SLACK_DAILY_CHANNEL;
  if (!reviewer) {
    return await persist(templateId, config, {
      ok: false,
      error:
        "No reviewer channel — set SLACK_REVIEW_CHANNEL env or fill the dashboard field.",
    });
  }
  if (!targetChannel) {
    return await persist(templateId, config, {
      ok: false,
      error:
        "No target channel — set SLACK_DAILY_CHANNEL env or fill the dashboard field.",
    });
  }

  const data = await fetchPaidSocialDataDirect();
  if (!data) {
    return await persist(templateId, config, {
      ok: false,
      error: "fetchPaidSocialDataDirect returned null",
    });
  }

  const dateLabel = formatDate.format(new Date());
  // Use the operator's most recently saved customizer state (mirrored
  // to KV by saveDailySummaryReportConfigAction). Falls back to the
  // built-in default when no save has happened yet.
  const reportConfig = config.reportConfig ?? DAILY_SUMMARY_DEFAULT_CONFIG;
  const filename = sanitizeFilename(reportConfig.title) + ".png";

  let buffer: Buffer;
  try {
    buffer = await renderDailySummaryImage(data, reportConfig);
  } catch (err) {
    return await persist(templateId, config, {
      ok: false,
      error: `render failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Cache the exact bytes so the Approve handler can re-upload them
  // verbatim to the target channel — guarantees the operator's
  // approved version IS what the team receives, with no data drift
  // or config mismatch in the interim.
  await setPreviewBuffer(templateId, buffer);

  try {
    const reviewerCh = await resolveChannel(token, reviewer);
    const upload = await getUploadUrl(token, filename, buffer.byteLength);
    if (!upload.ok) {
      return await persist(templateId, config, {
        ok: false,
        error: `Slack getUploadURLExternal: ${upload.error ?? "unknown"}`,
      });
    }
    await uploadBytesToSlack(upload.upload_url, buffer);
    const complete = await completeUpload(
      token,
      upload.file_id,
      filename,
      reviewerCh,
      `:hourglass_flowing_sand: *${reportConfig.title} preview · ${dateLabel} CT*\nApprove below to forward to <#${targetChannel}>.`,
    );
    if (!complete.ok) {
      return await persist(templateId, config, {
        ok: false,
        error: `Slack completeUploadExternal: ${complete.error ?? "unknown"}`,
      });
    }

    const buttonValue = JSON.stringify({
      target: targetChannel,
      title: reportConfig.title,
      dateLabel,
    });
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Send this to <#${targetChannel}>?`,
        },
      },
      {
        type: "actions",
        block_id: "daily_summary_review",
        elements: [
          {
            type: "button",
            action_id: "approve_daily_summary",
            style: "primary",
            text: { type: "plain_text", text: "Approve & Send" },
            value: buttonValue,
          },
          {
            type: "button",
            action_id: "cancel_daily_summary",
            style: "danger",
            text: { type: "plain_text", text: "Cancel" },
            value: buttonValue,
          },
        ],
      },
    ];
    const posted = await postBlocks(
      token,
      reviewerCh,
      blocks,
      `Daily Summary preview ready — approve to send to channel.`,
    );
    if (!posted.ok) {
      return await persist(templateId, config, {
        ok: false,
        error: `Slack chat.postMessage: ${posted.error ?? "unknown"}`,
      });
    }
    return await persist(templateId, config, { ok: true, sent: dateLabel });
  } catch (err) {
    return await persist(templateId, config, {
      ok: false,
      error: err instanceof Error ? err.message : "send failed",
    });
  }
}

/**
 * Write the result back to KV so the dashboard can show "last sent at"
 * and "last error". Returns the same result so callers can `return await persist(...)`.
 */
async function persist(
  templateId: "daily-summary",
  prior: CronConfig,
  result: RunResult,
): Promise<RunResult> {
  if (result.skipped) return result;
  const next: CronConfig = {
    ...prior,
    lastSentAt: result.ok ? new Date().toISOString() : prior.lastSentAt,
    lastError: result.ok ? null : (result.error ?? "unknown error"),
  };
  await setCronConfig(templateId, next);
  return result;
}
