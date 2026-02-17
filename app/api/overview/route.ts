import { NextResponse } from "next/server";
import {
  getOverviewKPIs,
  getTopVulnerableAirports,
  getTopEconomicImpactAirports,
  getTrendData,
  getGlobeAirports,
} from "@/lib/queries";

export async function GET() {
  try {
    const [kpis, vulnerable, economic, trend, globe] = await Promise.all([
      getOverviewKPIs(),
      getTopVulnerableAirports(12),
      getTopEconomicImpactAirports(12),
      getTrendData(),
      getGlobeAirports(),
    ]);

    return NextResponse.json({ kpis, vulnerable, economic, trend, globe });
  } catch (err) {
    console.error("[v0] overview error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
