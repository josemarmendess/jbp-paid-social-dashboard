import { NextResponse } from "next/server";
import { fetchPaidSocialData } from "@/lib/fetchData";
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

/**
 * Daily Summary cron — invoked by Vercel Cron at 19:00 America/Chicago
 * (configured in vercel.json). Renders the report PNG, uploads it to the
 * reviewer's DM, and follows with an Approve/Cancel button message. Nothing
 * lands in the group channel until the reviewer clicks Approve, which is
 * handled by /api/slack/interactive.
 *
 * Env required:
 *   SLACK_BOT_TOKEN          — bot token (chat:write, chat:write.public,
 *                              files:write, im:write).
 *   SLACK_REVIEW_CHANNEL     — DM channel ID (`D…`) or user ID (`U…`/`W…`).
 *                              The cron sends the review here.
 *   SLACK_DAILY_CHANNEL      — group channel ID (`C…`/`G…`) the approved
 *                              version gets posted to. Surfaced to the user
 *                              in the review buttons; required for approval
 *                              to do anything useful.
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
  const reviewer = process.env.SLACK_REVIEW_CHANNEL;
  const targetChannel = process.env.SLACK_DAILY_CHANNEL;
  if (!token || !reviewer) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing SLACK_BOT_TOKEN or SLACK_REVIEW_CHANNEL — set both on Vercel.",
      },
      { status: 412 },
    );
  }
  if (!targetChannel) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing SLACK_DAILY_CHANNEL — needed so Approve has somewhere to send.",
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

  const dateLabel = formatDate.format(new Date());
  const config = DAILY_SUMMARY_DEFAULT_CONFIG;
  const filename = sanitizeFilename(config.title) + ".png";

  let buffer: Buffer;
  try {
    buffer = await renderDailySummaryImage(data, config);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `renderDailySummaryImage failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }

  try {
    const reviewerChannel = await resolveChannel(token, reviewer);

    const upload = await getUploadUrl(token, filename, buffer.byteLength);
    if (!upload.ok) {
      return NextResponse.json(
        { ok: false, error: `Slack getUploadURLExternal: ${upload.error ?? "unknown"}` },
        { status: 502 },
      );
    }
    await uploadBytesToSlack(upload.upload_url, buffer);
    const complete = await completeUpload(
      token,
      upload.file_id,
      filename,
      reviewerChannel,
      `:hourglass_flowing_sand: *${config.title} preview · ${dateLabel} CT*\nApprove below to forward to <#${targetChannel}>.`,
    );
    if (!complete.ok) {
      return NextResponse.json(
        { ok: false, error: `Slack completeUploadExternal: ${complete.error ?? "unknown"}` },
        { status: 502 },
      );
    }

    // Follow-up message with Approve / Cancel buttons. The button value
    // carries the target channel and the date label so the interactive
    // endpoint can re-render and post without consulting env again.
    const buttonValue = JSON.stringify({
      target: targetChannel,
      title: config.title,
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
      reviewerChannel,
      blocks,
      `Daily Summary preview ready — approve to send to channel.`,
    );
    if (!posted.ok) {
      return NextResponse.json(
        { ok: false, error: `Slack chat.postMessage: ${posted.error ?? "unknown"}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sent: dateLabel, awaiting: "approval" });
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
