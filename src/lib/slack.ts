import "server-only";

/**
 * Server-side Slack helpers shared by the manual Send button
 * (/api/reports/slack) and the daily cron (/api/reports/cron-daily-summary).
 *
 * Required Slack bot scopes (set on https://api.slack.com/apps → app →
 * OAuth & Permissions, then reinstall to mint a fresh token):
 *   chat:write           — post messages
 *   chat:write.public    — post to channels the bot isn't in
 *   files:write          — upload images
 *   im:write             — open DM when destination is a user ID
 */

/* ──────────────── conversations.open ──────────────── */

/**
 * Channel IDs start with `C` (public), `G` (private), or `D` (DM).
 * User IDs start with `U` (or `W` on Enterprise Grid). When the caller
 * passes a user ID we open the DM and return the resulting `D…` channel.
 */
export async function resolveChannel(
  token: string,
  destination: string,
): Promise<string> {
  if (!destination.startsWith("U") && !destination.startsWith("W")) {
    return destination;
  }
  const res = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ users: destination }),
  });
  const json = (await res.json()) as {
    ok: boolean;
    channel?: { id: string };
    error?: string;
  };
  if (!json.ok || !json.channel?.id) {
    throw new Error(
      `Slack conversations.open: ${json.error ?? "no channel returned"}` +
        (json.error === "missing_scope"
          ? " (the bot needs the im:write scope; reinstall after adding it)"
          : ""),
    );
  }
  return json.channel.id;
}

/* ──────────────── chat.postMessage ──────────────── */

export async function postMessage(
  token: string,
  channelId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: channelId,
      text,
      mrkdwn: true,
    }),
  });
  return (await res.json()) as { ok: boolean; error?: string };
}

/* ──────────────── files upload (modern API) ──────────────── */

interface UploadUrlResponse {
  ok: boolean;
  upload_url: string;
  file_id: string;
  error?: string;
}

export async function getUploadUrl(
  token: string,
  filename: string,
  bytes: number,
): Promise<UploadUrlResponse> {
  const params = new URLSearchParams();
  params.set("filename", filename);
  params.set("length", String(bytes));
  const res = await fetch(
    "https://slack.com/api/files.getUploadURLExternal",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: params.toString(),
    },
  );
  return (await res.json()) as UploadUrlResponse;
}

export async function uploadBytesToSlack(
  uploadUrl: string,
  buffer: Buffer,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    body: new Uint8Array(buffer),
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!res.ok) {
    throw new Error(`Slack upload returned ${res.status}`);
  }
}

interface CompleteUploadResponse {
  ok: boolean;
  error?: string;
}

export async function completeUpload(
  token: string,
  fileId: string,
  filename: string,
  channelId: string,
  initialComment: string,
): Promise<CompleteUploadResponse> {
  const res = await fetch(
    "https://slack.com/api/files.completeUploadExternal",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        files: [{ id: fileId, title: filename }],
        channel_id: channelId,
        initial_comment: initialComment,
      }),
    },
  );
  return (await res.json()) as CompleteUploadResponse;
}

export function sanitizeFilename(s: string): string {
  return (
    s.replace(/[^A-Za-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "report"
  );
}
