import { NextResponse } from "next/server";
import { fetchPaidSocialData } from "@/lib/fetchData";

export const revalidate = 300;

export async function GET() {
  try {
    const data = await fetchPaidSocialData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
