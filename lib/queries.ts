import { createClient } from "@/lib/supabase/client";
import type {
  CascadeVulnerability,
  DelayEconomics,
  RouteEconomics,
  OverviewKPIs,
  HeatmapCell,
  DelayCause,
} from "@/lib/types";

// ── Overview Page Queries ──────────────────────────────────

export async function getOverviewKPIs(): Promise<OverviewKPIs> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_overview_kpis");

  // Fallback: manual query if RPC doesn't exist
  if (error || !data) {
    const { data: raw } = await supabase
      .from("mart_delay_economics")
      .select(
        "total_departures, avg_dep_delay_min, pct_delayed_15, est_total_economic_impact"
      );

    if (!raw || raw.length === 0)
      return { total_flights: 0, avg_delay: 0, pct_delayed: 0, total_impact: 0 };

    const total_flights = raw.reduce(
      (sum, r) => sum + (r.total_departures || 0),
      0
    );
    const avg_delay =
      raw.reduce((sum, r) => sum + (r.avg_dep_delay_min || 0), 0) / raw.length;
    const pct_delayed =
      raw.reduce((sum, r) => sum + (r.pct_delayed_15 || 0), 0) / raw.length;
    const total_impact = raw.reduce(
      (sum, r) => sum + (r.est_total_economic_impact || 0),
      0
    );

    return {
      total_flights: Math.round(total_flights),
      avg_delay: Math.round(avg_delay * 10) / 10,
      pct_delayed: Math.round(pct_delayed * 10) / 10,
      total_impact: Math.round(total_impact),
    };
  }

  return data as OverviewKPIs;
}

export async function getTopVulnerableAirports(
  limit = 12
): Promise<CascadeVulnerability[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_cascade_vulnerability")
    .select("*")
    .order("vulnerability_rank", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CascadeVulnerability[];
}

export async function getTopEconomicImpactAirports(
  limit = 12
): Promise<CascadeVulnerability[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_cascade_vulnerability")
    .select("*")
    .order("total_economic_impact", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CascadeVulnerability[];
}

export async function getTrendData(
  airports: string[] = ["ORD", "ATL", "DFW", "JFK", "DEN"]
): Promise<DelayEconomics[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_delay_economics")
    .select("flight_date, airport, rolling_7day_avg_delay")
    .in("airport", airports)
    .order("flight_date", { ascending: true });

  if (error) throw error;
  return (data || []) as DelayEconomics[];
}

// ── Cascade Page Queries ───────────────────────────────────

export async function getCascadeAirports(): Promise<CascadeVulnerability[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_cascade_vulnerability")
    .select("*")
    .order("vulnerability_rank", { ascending: true })
    .limit(30);

  if (error) throw error;
  return (data || []) as CascadeVulnerability[];
}

export async function getAirportDates(airport: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_delay_economics")
    .select("flight_date")
    .eq("airport", airport)
    .order("flight_date", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data || []).map((d) => d.flight_date);
}

// ── Route Economics Queries ────────────────────────────────

export async function getRouteEconomics(
  minFlights = 100,
  causes: string[] = ["Weather", "Carrier", "NAS/ATC", "Late Aircraft"],
  limit = 30
): Promise<RouteEconomics[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_route_economics")
    .select("*")
    .gte("total_flights", minFlights)
    .in("dominant_delay_cause", causes)
    .order("est_total_economic_impact", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as RouteEconomics[];
}

// ── Delay Patterns Queries ─────────────────────────────────

export async function getHeatmapData(): Promise<HeatmapCell[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_delay_economics")
    .select("day_name, month, pct_delayed_15");

  if (error) throw error;

  // Group by day_name + month and average the pct_delayed_15
  const grouped: Record<string, { sum: number; count: number }> = {};
  (data || []).forEach((row) => {
    const key = `${row.day_name}|${row.month}`;
    if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
    grouped[key].sum += row.pct_delayed_15 || 0;
    grouped[key].count += 1;
  });

  return Object.entries(grouped).map(([key, val]) => {
    const [day_name, month] = key.split("|");
    return {
      day_name,
      month: parseInt(month),
      value: Math.round((val.sum / val.count) * 10) / 10,
    };
  });
}

export async function getDelayCauseDistribution(): Promise<DelayCause[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_delay_economics")
    .select(
      "weather_delays, carrier_delays, nas_delays, late_aircraft_delays"
    );

  if (error) throw error;

  let weather = 0,
    carrier = 0,
    nas = 0,
    lateAircraft = 0;
  (data || []).forEach((row) => {
    weather += row.weather_delays || 0;
    carrier += row.carrier_delays || 0;
    nas += row.nas_delays || 0;
    lateAircraft += row.late_aircraft_delays || 0;
  });

  return [
    { cause: "Weather", count: Math.round(weather) },
    { cause: "Carrier", count: Math.round(carrier) },
    { cause: "NAS/ATC", count: Math.round(nas) },
    { cause: "Late Aircraft", count: Math.round(lateAircraft) },
  ];
}

export async function getDailyImpact(
  airport: string
): Promise<Pick<DelayEconomics, "flight_date" | "est_total_economic_impact">[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_delay_economics")
    .select("flight_date, est_total_economic_impact")
    .eq("airport", airport)
    .order("flight_date", { ascending: true });

  if (error) throw error;
  return (data || []) as Pick<
    DelayEconomics,
    "flight_date" | "est_total_economic_impact"
  >[];
}

export async function getDateRange(): Promise<{ min: string; max: string }> {
  const supabase = createClient();

  const { data: minData } = await supabase
    .from("mart_delay_economics")
    .select("flight_date")
    .order("flight_date", { ascending: true })
    .limit(1)
    .single();

  const { data: maxData } = await supabase
    .from("mart_delay_economics")
    .select("flight_date")
    .order("flight_date", { ascending: false })
    .limit(1)
    .single();

  return {
    min: minData?.flight_date || "",
    max: maxData?.flight_date || "",
  };
}

// ── Globe data (top 26 airports for map) ───────────────────

export async function getGlobeAirports(): Promise<CascadeVulnerability[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mart_cascade_vulnerability")
    .select("*")
    .order("vulnerability_rank", { ascending: true })
    .limit(26);

  if (error) throw error;
  return (data || []) as CascadeVulnerability[];
}
