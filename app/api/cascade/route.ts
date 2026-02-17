import { NextResponse } from "next/server";
import { getCascadeAirports, getAirportDates } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const airport = searchParams.get("airport");

    if (airport) {
      const dates = await getAirportDates(airport);
      return NextResponse.json({ dates });
    }

    const airports = await getCascadeAirports();
    const dates = airports.length > 0 ? await getAirportDates(airports[0].airport) : [];
    return NextResponse.json({ airports, dates });
  } catch (err) {
    console.error("[v0] cascade error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
