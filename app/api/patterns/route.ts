import { NextResponse } from "next/server";
import { getHeatmapData, getDelayCauseDistribution } from "@/lib/queries";

export async function GET() {
  try {
    const [heatmap, causes] = await Promise.all([
      getHeatmapData(),
      getDelayCauseDistribution(),
    ]);

    return NextResponse.json({ heatmap, causes });
  } catch (err) {
    console.error("[v0] patterns error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
