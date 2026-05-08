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

// Pre-woff2 Safari UA. Google Fonts content-negotiates on User-Agent and
// only serves woff2 to browsers known to support it. The Satori build
// embedded in @vercel/og 0.11.1 does NOT decode woff2 ("Unsupported
// OpenType signature wOF2"), so we ask for an older browser and Google
// hands us TTF, which Satori reads natively.
const PRE_WOFF2_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.71 (KHTML, like Gecko) Version/7.0 Safari/537.71";

let fontsPromise: Promise<FontDef[]> | null = null;

async function loadFonts(): Promise<FontDef[]> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    const familyParam = FONT_REQUESTS.map((f) => `family=${f.cssToken}`).join(
      "&",
    );
    const cssUrl = `https://fonts.googleapis.com/css2?${familyParam}&display=swap`;
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": PRE_WOFF2_USER_AGENT },
    });
    if (!cssRes.ok) {
      throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`);
    }
    const css = await cssRes.text();

    // Each `@font-face { … src: url(https://…) format('truetype') … }`
    // block has the family + weight inline. We pull out every
    // (family, weight, url) triple and match each requested font against
    // it. Google serves TTF (and sometimes WOFF) to the pre-woff2 UA;
    // both are decoded by Satori.
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
    // The pre-woff2 UA path on Google Fonts returns query-string URLs
    // without a file extension (e.g. `…/font?kit=…`) and declares the
    // format inline via `format('woff')` or `format('truetype')`. Pick
    // up either, but reject `format('woff2')` since Satori (@vercel/og
    // 0.11.1) can't decode it.
    const srcMatch =
      /src:\s*url\((https:\/\/[^)]+)\)\s*format\(['"]([^'"]+)['"]\)/.exec(block);
    if (!familyMatch || !weightMatch || !srcMatch) continue;
    if (srcMatch[2].toLowerCase() === "woff2") continue;
    const weight = Number(weightMatch[1]);
    if (weight !== 400 && weight !== 500 && weight !== 600 && weight !== 700 && weight !== 800) {
      continue;
    }
    out.push({
      family: familyMatch[1],
      weight: weight as FontDef["weight"],
      url: srcMatch[1],
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
