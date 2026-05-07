import { NextResponse } from "next/server";
import { fetchPaidSocialData } from "@/lib/fetchData";

export async function GET() {
  const data = await fetchPaidSocialData();
  if (!data) {
    return NextResponse.json(
      { error: "Failed to load data" },
      { status: 502 },
    );
  }
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
