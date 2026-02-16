"""Test MCP server tools directly without FastMCP wrapper."""
import sys
sys.path.insert(0, ".")

import duckdb
import os

DB_PATH = "data/skydelay.duckdb"
from src.processing.cascade_calculator import calculate_cascade_impact


def test_airport_summary():
    con = duckdb.connect(DB_PATH, read_only=True)
    result = con.execute("""
        SELECT airport, flight_date, total_departures, avg_dep_delay_min, 
               pct_delayed_15, est_total_economic_impact
        FROM mart_delay_economics
        WHERE airport = 'ORD'
        ORDER BY flight_date DESC
        LIMIT 1
    """).fetchdf()
    con.close()
    print("=== Airport Delay Summary (ORD) ===")
    print(result.to_string())


def test_cascade():
    con = duckdb.connect(DB_PATH, read_only=True)
    result = calculate_cascade_impact(con, "ORD", "2025-10-15", 90)
    con.close()
    print("\n=== Cascade Impact (ORD, 90 min) ===")
    print(f"Directly affected: {result.directly_affected_flights} flights")
    print(f"Cascade affected: {result.cascade_affected_flights} flights")
    print(f"Passengers: {result.total_affected_passengers:,}")
    print(f"Total cost: ${result.total_economic_impact:,.0f}")


def test_pipeline_health():
    con = duckdb.connect(DB_PATH, read_only=True)
    tables = ["raw_bts_flights", "raw_opensky_positions", 
              "raw_weather_observations", "raw_faa_airport_status",
              "mart_delay_economics", "mart_cascade_vulnerability"]
    print("\n=== Pipeline Health ===")
    for table in tables:
        try:
            count = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            print(f"  ✅ {table:40s} {count:>12,} rows")
        except Exception as e:
            print(f"  ❌ {table:40s} ERROR: {e}")
    con.close()


def test_weather():
    con = duckdb.connect(DB_PATH, read_only=True)
    result = con.execute("""
        SELECT station_id, iata_code, temperature_c, wind_speed_kt, 
               visibility_miles, flight_category, weather_string
        FROM raw_weather_observations
        LIMIT 5
    """).fetchdf()
    con.close()
    print("\n=== Airport Weather (sample) ===")
    print(result.to_string())


if __name__ == "__main__":
    test_airport_summary()
    test_cascade()
    test_pipeline_health()
    test_weather()