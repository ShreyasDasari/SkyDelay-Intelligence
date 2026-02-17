import { NextResponse } from "next/server";
import { getDailyImpact } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const airport = searchParams.get("airport") || "ORD";
    const data = await getDailyImpact(airport);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[v0] daily-impact error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
