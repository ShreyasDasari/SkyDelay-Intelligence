"""
SkyDelay Intelligence MCP Server
Exposes aviation delay economics to ANY AI agent via Model Context Protocol.

This is the 2026 differentiator — your project data becomes a reusable tool
that Claude Desktop, ChatGPT, Cursor, or any MCP-compatible client can query.

Install: pip install fastmcp duckdb
Run:     python -m src.mcp_server.server

Test locally:
    fastmcp dev src/mcp_server/server.py

Configure in Claude Desktop (claude_desktop_config.json):
{
    "mcpServers": {
        "skydelay": {
            "command": "python",
            "args": ["-m", "src.mcp_server.server"],
            "cwd": "/path/to/SkyDelay-Intelligence"
        }
    }
}
"""

import sys
import os
from datetime import datetime
from pathlib import Path

import duckdb
from fastmcp import FastMCP

# Ensure project root is in path for imports
PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
sys.path.insert(0, PROJECT_ROOT)
DB_PATH = os.path.join(PROJECT_ROOT, "data", "skydelay.duckdb")

from src.processing.cascade_calculator import calculate_cascade_impact

# ── Initialize MCP Server ──────────────────────────────────
mcp = FastMCP(
    "SkyDelay Intelligence"
)


def _get_con():
    """Get a read-only DuckDB connection."""
    return duckdb.connect(DB_PATH, read_only=True)


# ══════════════════════════════════════════════════════════════
# TOOL 1: Airport Delay Summary
# ══════════════════════════════════════════════════════════════
@mcp.tool()
def get_airport_delay_summary(airport_code: str, date: str = "") -> dict:
    """
    Get comprehensive delay summary for a US airport.

    Returns average delay, percentage of flights delayed, delay causes breakdown,
    cancellation rate, and economic impact estimate.

    Args:
        airport_code: 3-letter IATA airport code (e.g., ORD, JFK, ATL, DFW, LAX)
        date: Optional date in YYYY-MM-DD format. Defaults to most recent data.

    Returns:
        Dictionary with delay metrics, cause breakdown, and economic estimates.
    """
    con = _get_con()

    if not date:
        date = con.execute(
            "SELECT max(flight_date) FROM mart_delay_economics"
        ).fetchone()[0]

    result = con.execute("""
        SELECT
            airport,
            flight_date,
            total_departures,
            avg_dep_delay_min,
            pct_delayed_15,
            flights_delayed_15,
            pct_cancelled,
            est_total_economic_impact,
            avg_weather_delay,
            avg_carrier_delay,
            avg_nas_delay,
            avg_late_aircraft_delay,
            weather_delays,
            carrier_delays,
            nas_delays,
            late_aircraft_delays,
            rolling_7day_avg_delay,
            rolling_7day_pct_delayed
        FROM mart_delay_economics
        WHERE airport = ? AND flight_date = ?
    """, [airport_code.upper(), date]).fetchdf()

    con.close()

    if result.empty:
        return {
            "error": f"No data found for {airport_code} on {date}",
            "suggestion": "Try a different date or airport code. "
                          "Data covers Sep-Nov 2025. "
                          "Valid airports: ORD, ATL, JFK, DFW, LAX, DEN, EWR, BOS, SFO, MIA"
        }

    row = result.iloc[0]
    return {
        "airport": row["airport"],
        "date": row["flight_date"],
        "total_departures": int(row["total_departures"]),
        "avg_departure_delay_minutes": float(row["avg_dep_delay_min"]),
        "pct_flights_delayed_15plus": float(row["pct_delayed_15"]),
        "flights_delayed": int(row["flights_delayed_15"]),
        "pct_cancelled": float(row["pct_cancelled"]),
        "estimated_economic_impact_usd": float(row["est_total_economic_impact"]),
        "delay_causes": {
            "weather_delays": int(row["weather_delays"]),
            "carrier_delays": int(row["carrier_delays"]),
            "nas_atc_delays": int(row["nas_delays"]),
            "late_aircraft_delays": int(row["late_aircraft_delays"]),
        },
        "avg_delay_by_cause_minutes": {
            "weather": float(row["avg_weather_delay"]) if row["avg_weather_delay"] else None,
            "carrier": float(row["avg_carrier_delay"]) if row["avg_carrier_delay"] else None,
            "nas_atc": float(row["avg_nas_delay"]) if row["avg_nas_delay"] else None,
            "late_aircraft": float(row["avg_late_aircraft_delay"]) if row["avg_late_aircraft_delay"] else None,
        },
        "trends": {
            "rolling_7day_avg_delay": float(row["rolling_7day_avg_delay"]) if row["rolling_7day_avg_delay"] else None,
            "rolling_7day_pct_delayed": float(row["rolling_7day_pct_delayed"]) if row["rolling_7day_pct_delayed"] else None,
        },
        "methodology": "FAA/NEXTOR II Total Delay Impact Study (inflation-adjusted 2025)",
    }


# ══════════════════════════════════════════════════════════════
# TOOL 2: Cascade Impact Simulator
# ══════════════════════════════════════════════════════════════
@mcp.tool()
def simulate_cascade_impact(airport_code: str, delay_minutes: int, date: str = "") -> dict:
    """
    Simulate the cascading economic impact of a delay at a hub airport.

    When a hub airport experiences delays, connecting flights downstream are also
    affected. This tool calculates the ripple effect — how many flights, passengers,
    and dollars are impacted.

    Args:
        airport_code: 3-letter IATA hub airport code (e.g., ORD, ATL, DFW)
        delay_minutes: Trigger delay duration in minutes (15-240)
        date: Optional date for historical simulation (YYYY-MM-DD). Defaults to most recent.

    Returns:
        Cascade analysis with affected flights, passengers, and economic impact.
    """
    con = _get_con()

    if not date:
        date = con.execute(
            "SELECT max(flight_date) FROM mart_delay_economics"
        ).fetchone()[0]

    result = calculate_cascade_impact(
        con, airport_code.upper(), date, float(delay_minutes)
    )
    con.close()

    return {
        "airport": result.origin_airport,
        "trigger_delay_minutes": result.trigger_delay_minutes,
        "analysis_date": date,
        "impact": {
            "directly_affected_flights": result.directly_affected_flights,
            "cascade_affected_flights": result.cascade_affected_flights,
            "total_flights_affected": result.directly_affected_flights + result.cascade_affected_flights,
            "total_passengers_impacted": result.total_affected_passengers,
        },
        "economic_cost": {
            "passenger_delay_cost_usd": result.estimated_passenger_cost,
            "airline_operations_cost_usd": result.estimated_airline_cost,
            "total_economic_impact_usd": result.total_economic_impact,
        },
        "cascade_destinations": result.affected_destinations[:15],
        "interpretation": (
            f"A {delay_minutes}-minute delay at {airport_code.upper()} on {date} "
            f"would cascade to {result.cascade_affected_flights} downstream flights, "
            f"affecting {result.total_affected_passengers:,} passengers with an "
            f"estimated total economic impact of ${result.total_economic_impact:,.0f}."
        ),
        "methodology": "FAA/NEXTOR II cost model. Passenger: $0.74/min. Airline ops: $68.48/min/flight. Load factor: 87%.",
    }


# ══════════════════════════════════════════════════════════════
# TOOL 3: Hub Vulnerability Ranking
# ══════════════════════════════════════════════════════════════
@mcp.tool()
def get_hub_vulnerability_ranking(top_n: int = 15) -> dict:
    """
    Get the cascade vulnerability ranking for major US hub airports.

    Ranks airports by their susceptibility to cascading delays based on
    delay frequency, late aircraft propagation, route count, and airline diversity.

    Args:
        top_n: Number of airports to return (default 15, max 50)

    Returns:
        Ranked list of airports with vulnerability scores and economic impact.
    """
    con = _get_con()
    n = min(max(1, top_n), 50)

    result = con.execute(f"""
        SELECT
            airport,
            vulnerability_rank,
            cascade_vulnerability_score,
            avg_delay_min,
            avg_pct_delayed,
            avg_pct_cancelled,
            max_routes_served,
            max_airlines,
            avg_late_aircraft_delay,
            avg_daily_economic_impact,
            total_economic_impact,
            operating_days,
            total_departures
        FROM mart_cascade_vulnerability
        ORDER BY vulnerability_rank
        LIMIT {n}
    """).fetchdf()

    con.close()

    airports = []
    for _, row in result.iterrows():
        airports.append({
            "rank": int(row["vulnerability_rank"]),
            "airport": row["airport"],
            "vulnerability_score": float(row["cascade_vulnerability_score"]),
            "avg_delay_minutes": float(row["avg_delay_min"]),
            "pct_delayed": float(row["avg_pct_delayed"]),
            "routes_served": int(row["max_routes_served"]),
            "airlines_operating": int(row["max_airlines"]),
            "avg_late_aircraft_delay_min": float(row["avg_late_aircraft_delay"]) if row["avg_late_aircraft_delay"] else None,
            "avg_daily_economic_impact_usd": float(row["avg_daily_economic_impact"]),
            "total_3month_economic_impact_usd": float(row["total_economic_impact"]),
            "total_departures": int(row["total_departures"]),
        })

    return {
        "ranking": airports,
        "data_period": "September - November 2025",
        "total_airports_analyzed": len(result),
        "methodology": "Composite score: 30% delay rate + 10% late aircraft delay + 5% route count + airline diversity factor",
    }


# ══════════════════════════════════════════════════════════════
# TOOL 4: Route Economics
# ══════════════════════════════════════════════════════════════
@mcp.tool()
def get_costliest_routes(top_n: int = 20, delay_cause: str = "") -> dict:
    """
    Get the most economically costly routes in terms of delay impact.

    Args:
        top_n: Number of routes to return (default 20, max 50)
        delay_cause: Optional filter by dominant cause — 'Weather', 'Carrier', 'NAS/ATC', or 'Late Aircraft'

    Returns:
        Ranked list of routes with flight counts, delay rates, and cost estimates.
    """
    con = _get_con()
    n = min(max(1, top_n), 50)

    where_clause = ""
    params = []
    if delay_cause:
        where_clause = "WHERE dominant_delay_cause = ?"
        params.append(delay_cause)

    result = con.execute(f"""
        SELECT
            route_id, origin_airport, dest_airport,
            origin_city, dest_city, airline_iata,
            total_flights, delayed_flights, pct_delayed,
            avg_dep_delay, est_total_economic_impact,
            est_cost_per_flight, dominant_delay_cause
        FROM mart_route_economics
        {where_clause}
        ORDER BY est_total_economic_impact DESC
        LIMIT {n}
    """, params).fetchdf()

    con.close()

    routes = []
    for _, row in result.iterrows():
        routes.append({
            "route": row["route_id"],
            "origin": f"{row['origin_airport']} ({row['origin_city']})",
            "destination": f"{row['dest_airport']} ({row['dest_city']})",
            "airline": row["airline_iata"],
            "total_flights": int(row["total_flights"]),
            "pct_delayed": float(row["pct_delayed"]),
            "avg_delay_minutes": float(row["avg_dep_delay"]),
            "total_economic_impact_usd": float(row["est_total_economic_impact"]),
            "cost_per_flight_usd": float(row["est_cost_per_flight"]),
            "dominant_delay_cause": row["dominant_delay_cause"],
        })

    return {
        "routes": routes,
        "filter_applied": delay_cause or "None",
        "data_period": "September - November 2025",
    }


# ══════════════════════════════════════════════════════════════
# TOOL 5: Current Weather at Airport
# ══════════════════════════════════════════════════════════════
@mcp.tool()
def get_airport_weather(airport_code: str) -> dict:
    """
    Get the most recent weather observation (METAR) for an airport.

    Args:
        airport_code: 3-letter IATA airport code (e.g., ORD, JFK, ATL)

    Returns:
        Current weather conditions including wind, visibility, ceiling, and flight category.
    """
    con = _get_con()

    # Try both IATA and ICAO format
    iata = airport_code.upper()
    icao = f"K{iata}" if len(iata) == 3 else iata

    result = con.execute("""
        SELECT * FROM raw_weather_observations
        WHERE iata_code = ? OR station_id = ?
        ORDER BY polled_at DESC
        LIMIT 1
    """, [iata, icao]).fetchdf()

    con.close()

    if result.empty:
        return {
            "error": f"No weather data found for {airport_code}",
            "suggestion": "Weather data is only available for airports that have been polled. "
                          "Run: python -m src.ingestion.noaa_weather_producer --once"
        }

    row = result.iloc[0]
    return {
        "airport": iata,
        "station_id": row["station_id"],
        "observation_time": row["observation_time"],
        "conditions": {
            "wind_direction_deg": float(row["wind_direction_deg"]) if row["wind_direction_deg"] else None,
            "wind_speed_knots": float(row["wind_speed_kt"]) if row["wind_speed_kt"] else None,
            "wind_gust_knots": float(row["wind_gust_kt"]) if row["wind_gust_kt"] else None,
            "visibility_miles": float(row["visibility_miles"]) if row["visibility_miles"] else None,
            "temperature_celsius": float(row["temperature_c"]) if row["temperature_c"] else None,
            "dewpoint_celsius": float(row["dewpoint_c"]) if row["dewpoint_c"] else None,
            "ceiling_feet": float(row["ceiling_ft"]) if row["ceiling_ft"] else None,
            "cloud_cover": row["cloud_cover"],
            "weather": row["weather_string"] or "No significant weather",
        },
        "flight_category": row["flight_category"],
        "flight_category_meaning": {
            "VFR": "Visual Flight Rules — clear skies, good visibility",
            "MVFR": "Marginal VFR — reduced visibility, some restrictions",
            "IFR": "Instrument Flight Rules — low visibility, potential delays",
            "LIFR": "Low IFR — very poor visibility, likely delays/diversions",
        }.get(row["flight_category"], "Unknown"),
        "raw_metar": row["raw_metar"],
    }


# ══════════════════════════════════════════════════════════════
# TOOL 6: Pipeline Health Status
# ══════════════════════════════════════════════════════════════
@mcp.tool()
def get_pipeline_health() -> dict:
    """
    Check the health status of all data sources in the SkyDelay pipeline.

    Returns row counts, freshness timestamps, and data quality indicators
    for each table in the database.
    """
    con = _get_con()

    tables = {
        "raw_bts_flights": {"freshness_col": "flightdate", "type": "batch"},
        "raw_opensky_positions": {"freshness_col": "polled_at", "type": "streaming"},
        "raw_weather_observations": {"freshness_col": "polled_at", "type": "streaming"},
        "raw_faa_airport_status": {"freshness_col": "polled_at", "type": "streaming"},
        "mart_delay_economics": {"freshness_col": "flight_date", "type": "derived"},
        "mart_cascade_vulnerability": {"freshness_col": None, "type": "derived"},
        "mart_route_economics": {"freshness_col": None, "type": "derived"},
    }

    health = []
    for table, meta in tables.items():
        try:
            count = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            freshness = None
            if meta["freshness_col"]:
                freshness = con.execute(
                    f"SELECT max({meta['freshness_col']}) FROM {table}"
                ).fetchone()[0]

            health.append({
                "table": table,
                "row_count": count,
                "latest_record": str(freshness) if freshness else "N/A",
                "source_type": meta["type"],
                "status": "healthy" if count > 0 else "empty",
            })
        except Exception as e:
            health.append({
                "table": table,
                "row_count": 0,
                "latest_record": "N/A",
                "source_type": meta["type"],
                "status": f"error: {str(e)}",
            })

    con.close()

    healthy = sum(1 for h in health if h["status"] == "healthy")
    return {
        "overall_status": "healthy" if healthy == len(health) else "degraded",
        "healthy_sources": f"{healthy}/{len(health)}",
        "tables": health,
        "checked_at": datetime.now().isoformat(),
    }


# ── Run Server ──────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()