import { after } from "next/server";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { renderDailySummaryImage } from "@/lib/reports/renderImage";
import { DAILY_SUMMARY_DEFAULT_CONFIG } from "@/lib/reportTemplates";
import {
  completeUpload,
  getUploadUrl,
  sanitizeFilename,
  updateMessage,
  uploadBytesToSlack,
} from "@/lib/slack";

/**
 * Slack interactivity endpoint. Receives button clicks from the Daily
 * Summary review message (posted by the cron) and either forwards the
 * approved PNG to the configured group channel or marks the review
 * cancelled.
 *
 * Slack delivers payloads as `application/x-www-form-urlencoded` with a
 * single `payload` field whose value is JSON. The raw body is signed via
 * HMAC-SHA256 over `v0:${timestamp}:${body}` with SLACK_SIGNING_SECRET —
 * we verify before parsing anything else.
 *
 * Setup:
 *   1. Slack app → Interactivity & Shortcuts → toggle ON
 *   2. Request URL = https://<deploy>/api/slack/interactive
 *   3. Vercel env: SLACK_SIGNING_SECRET (Basic Information → App Credentials)
 *
 * The handler ACKs immediately (200) and runs the heavy re-render +
 * upload via `after()` so Slack doesn't time out the 3-second window.
 */

export async function POST(req: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!signingSecret || !token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing SLACK_SIGNING_SECRET or SLACK_BOT_TOKEN — set both on Vercel.",
      },
      { status: 412 },
    );
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-slack-signature") ?? "";
  const ts = req.headers.get("x-slack-request-timestamp") ?? "";
  if (!verifySlackSignature(signingSecret, ts, rawBody, sig)) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 401 },
    );
  }

  // Slack form-encodes the payload; the actual interaction lives in the
  // `payload` field as a JSON string.
  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get("payload");
  if (!payloadRaw) {
    return NextResponse.json(
      { ok: false, error: "missing payload" },
      { status: 400 },
    );
  }

  let payload: SlackInteractionPayload;
  try {
    payload = JSON.parse(payloadRaw) as SlackInteractionPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "payload not JSON" },
      { status: 400 },
    );
  }

  if (payload.type !== "block_actions") {
    return NextResponse.json({ ok: true, ignored: payload.type });
  }
  const action = payload.actions?.[0];
  if (!action) {
    return NextResponse.json({ ok: true, ignored: "no action" });
  }

  const reviewerChannel = payload.channel?.id;
  const reviewMessageTs = payload.message?.ts;
  if (!reviewerChannel || !reviewMessageTs) {
    return NextResponse.json(
      { ok: false, error: "missing channel/ts on payload" },
      { status: 400 },
    );
  }

  let value: ButtonValue;
  try {
    value = JSON.parse(action.value) as ButtonValue;
  } catch {
    return NextResponse.json(
      { ok: false, error: "button value not JSON" },
      { status: 400 },
    );
  }

  if (action.action_id === "cancel_daily_summary") {
    await updateMessage(
      token,
      reviewerChannel,
      reviewMessageTs,
      `:x: Cancelled — ${value.title} (${value.dateLabel}) was not sent.`,
      [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:x: *Cancelled* — ${value.title} (${value.dateLabel}) was not sent.`,
          },
        },
      ],
    );
    return NextResponse.json({ ok: true, action: "cancelled" });
  }

  if (action.action_id !== "approve_daily_summary") {
    return NextResponse.json({ ok: true, ignored: action.action_id });
  }

  // Approve: ACK immediately (Slack times out at 3s) and finish the
  // upload + status update in the background so the user sees the
  // button's loading state collapse without a timeout error.
  const approverName = payload.user?.name ?? payload.user?.id ?? "approver";
  after(async () => {
    try {
      const data = await fetchPaidSocialData();
      if (!data) throw new Error("fetchPaidSocialData returned null");

      const buffer = await renderDailySummaryImage(
        data,
        DAILY_SUMMARY_DEFAULT_CONFIG,
      );
      const filename = sanitizeFilename(value.title) + ".png";
      const upload = await getUploadUrl(token, filename, buffer.byteLength);
      if (!upload.ok) {
        throw new Error(
          `Slack getUploadURLExternal: ${upload.error ?? "unknown"}`,
        );
      }
      await uploadBytesToSlack(upload.upload_url, buffer);
      const complete = await completeUpload(
        token,
        upload.file_id,
        filename,
        value.target,
        `*${value.title}* · ${value.dateLabel} CT · approved by <@${payload.user?.id ?? approverName}>`,
      );
      if (!complete.ok) {
        throw new Error(
          `Slack completeUploadExternal: ${complete.error ?? "unknown"}`,
        );
      }

      await updateMessage(
        token,
        reviewerChannel,
        reviewMessageTs,
        `:white_check_mark: Sent to <#${value.target}>.`,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:white_check_mark: *Approved* — sent to <#${value.target}> by <@${payload.user?.id ?? approverName}>.`,
            },
          },
        ],
      );
    } catch (err) {
      // Surface the failure back into the review thread so the reviewer
      // doesn't see a silent button click.
      const msg = err instanceof Error ? err.message : String(err);
      await updateMessage(
        token,
        reviewerChannel,
        reviewMessageTs,
        `:warning: Send failed: ${msg}`,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:warning: *Send failed* — ${msg}`,
            },
          },
        ],
      ).catch(() => {});
    }
  });

  // Show an immediate loading state by stripping the buttons.
  return NextResponse.json({
    replace_original: true,
    text: `:hourglass_flowing_sand: Sending to <#${value.target}>…`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:hourglass_flowing_sand: *Sending to <#${value.target}>…*`,
        },
      },
    ],
  });
}

interface SlackInteractionPayload {
  type: string;
  user?: { id?: string; name?: string };
  channel?: { id?: string };
  message?: { ts?: string };
  actions?: Array<{ action_id: string; value: string }>;
}

interface ButtonValue {
  target: string;
  title: string;
  dateLabel: string;
}

/**
 * Slack signs each request with HMAC-SHA256 over `v0:${ts}:${body}` and
 * sends the result in `X-Slack-Signature` as `v0=...`. Reject anything
 * older than 5 minutes to prevent replay.
 */
function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  if (!timestamp || !signature.startsWith("v0=")) return false;
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - tsNum);
  if (ageSeconds > 60 * 5) return false;

  const base = `v0:${timestamp}:${body}`;
  const expected = "v0=" + createHmac("sha256", signingSecret).update(base).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
