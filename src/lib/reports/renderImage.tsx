import "server-only";
import { ImageResponse } from "next/og";
import {
  DailySummaryImage,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
} from "./dailySummaryImage";
import {
  DAILY_SUMMARY_DEFAULT_CONFIG,
  type DailySummaryConfig,
} from "@/lib/reportTemplates";
import type { PaidSocialPayload } from "@/lib/types";

/**
 * Server-side PNG renderer for the Daily Summary report. Wraps the
 * Satori-compatible JSX in next/og's ImageResponse and returns a Buffer
 * the cron route can hand to Slack's file upload API.
 *
 * Fonts are fetched on first call from Google Fonts (the CSS endpoint with
 * a desktop User-Agent returns woff2 URLs) and cached at module scope so
 * subsequent renders within the same Lambda instance reuse them.
 */

interface FontDef {
  data: ArrayBuffer;
  name: string;
  weight: 400 | 500 | 600 | 700 | 800;
  style: "normal";
}

const FONT_REQUESTS: ReadonlyArray<{
  family: string;
  weight: FontDef["weight"];
  /** Google Fonts CSS family token, e.g. "Inter:wght@700". */
  cssToken: string;
}> = [
  { family: "Inter", weight: 600, cssToken: "Inter:wght@600" },
  { family: "Inter", weight: 700, cssToken: "Inter:wght@700" },
  { family: "Inter", weight: 800, cssToken: "Inter:wght@800" },
  { family: "Archivo", weight: 800, cssToken: "Archivo:wght@800" },
  { family: "JetBrains Mono", weight: 700, cssToken: "JetBrains+Mono:wght@700" },
];

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let fontsPromise: Promise<FontDef[]> | null = null;

async function loadFonts(): Promise<FontDef[]> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    const familyParam = FONT_REQUESTS.map((f) => `family=${f.cssToken}`).join(
      "&",
    );
    const cssUrl = `https://fonts.googleapis.com/css2?${familyParam}&display=swap`;
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": CHROME_USER_AGENT },
    });
    if (!cssRes.ok) {
      throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`);
    }
    const css = await cssRes.text();

    // Each `@font-face { … src: url(https://…) format('woff2') … }` block in
    // the CSS has the family + weight in a preceding comment-free segment.
    // We pull out every (family, weight, url) triple and match each requested
    // font against it.
    const faces = parseFontFaces(css);

    const out: FontDef[] = [];
    for (const req of FONT_REQUESTS) {
      const match = faces.find(
        (f) =>
          f.family.toLowerCase() === req.family.toLowerCase() &&
          f.weight === req.weight,
      );
      if (!match) {
        throw new Error(
          `Font face missing in Google CSS: ${req.family} ${req.weight}`,
        );
      }
      const fontRes = await fetch(match.url);
      if (!fontRes.ok) {
        throw new Error(
          `Font binary fetch failed (${match.url}): ${fontRes.status}`,
        );
      }
      out.push({
        data: await fontRes.arrayBuffer(),
        name: req.family,
        weight: req.weight,
        style: "normal",
      });
    }
    return out;
  })();
  return fontsPromise;
}

interface ParsedFace {
  family: string;
  weight: FontDef["weight"];
  url: string;
}

function parseFontFaces(css: string): ParsedFace[] {
  const out: ParsedFace[] = [];
  const blockRe = /@font-face\s*{([^}]+)}/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRe.exec(css))) {
    const block = blockMatch[1];
    const familyMatch = /font-family:\s*['"]([^'"]+)['"]/.exec(block);
    const weightMatch = /font-weight:\s*(\d+)/.exec(block);
    const urlMatch = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block);
    if (!familyMatch || !weightMatch || !urlMatch) continue;
    const weight = Number(weightMatch[1]);
    if (weight !== 400 && weight !== 500 && weight !== 600 && weight !== 700 && weight !== 800) {
      continue;
    }
    out.push({
      family: familyMatch[1],
      weight: weight as FontDef["weight"],
      url: urlMatch[1],
    });
  }
  return out;
}

/**
 * Render the Daily Summary report to a PNG buffer. Returns the bytes ready
 * to be POSTed to Slack's `files.getUploadURLExternal` workflow.
 */
export async function renderDailySummaryImage(
  data: PaidSocialPayload,
  config: DailySummaryConfig = DAILY_SUMMARY_DEFAULT_CONFIG,
  stamp?: string,
): Promise<Buffer> {
  const fonts = await loadFonts();
  const response = new ImageResponse(
    (
      <DailySummaryImage data={data} config={config} stamp={stamp} />
    ) as unknown as React.ReactElement,
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      fonts,
    },
  );
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
