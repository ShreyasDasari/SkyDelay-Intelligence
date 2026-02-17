import { NextResponse } from "next/server";
import { getRouteEconomics } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minFlights = parseInt(searchParams.get("minFlights") || "100");
    const causes = searchParams.get("causes")?.split(",") || ["Weather", "Carrier", "NAS/ATC", "Late Aircraft"];

    const routes = await getRouteEconomics(minFlights, causes);
    return NextResponse.json({ routes });
  } catch (err) {
    console.error("[v0] routes error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
