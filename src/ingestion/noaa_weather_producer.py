"""
NOAA Aviation Weather Producer — METAR Observations
Fetches current weather conditions at major US airports from NOAA Aviation Weather API.

METARs (Meteorological Aerodrome Reports) include: wind, visibility, ceiling,
temperature, pressure — the exact data that causes flight delays.

API: https://aviationweather.gov/api/data/metar
Free, no API key needed. Rate-limited — keep requests reasonable.

Usage:
    python -m src.ingestion.noaa_weather_producer --once
    python -m src.ingestion.noaa_weather_producer --interval 300
"""

import json
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests
import duckdb

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

METAR_API = "https://aviationweather.gov/api/data/metar"
DB_PATH = "data/skydelay.duckdb"

# Top 30 US airports by traffic — using ICAO codes (METAR uses ICAO, not IATA)
# ICAO code = 'K' + IATA code for US airports
HUB_AIRPORTS_ICAO = [
    "KATL", "KDFW", "KDEN", "KORD", "KLAX", "KCLT", "KMCO", "KLAS", "KPHX", "KMIA",
    "KSEA", "KIAH", "KJFK", "KEWR", "KSFO", "KFLL", "KMSP", "KBOS", "KDTW", "KLGA",
    "KPHL", "KSLC", "KDCA", "KSAN", "KBWI", "KTPA", "KIAD", "KMDW", "PHNL", "KPDX",
]

def _safe_number(val) -> float:
    """Convert a value to float, handling strings like '10+', 'VRB', etc."""
    if val is None:
        return None
    try:
        return float(str(val).replace("+", ""))
    except (ValueError, TypeError):
        return None

def fetch_metar(station_ids: list[str]) -> list[dict]:
    """
    Fetch current METAR observations for a list of airports.
    Returns parsed weather data for each station.
    """
    # API accepts comma-separated station IDs
    ids_str = ",".join(station_ids)

    try:
        resp = requests.get(
            METAR_API,
            params={
                "ids": ids_str,
                "format": "json",
                "taf": "false",
                "hours": 1,  # Latest observation within last hour
            },
            timeout=15,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()

        if not data:
            log.warning("No METAR data returned")
            return []

        # Parse and flatten the METAR records
        observations = []
        for metar in data:
            obs = {
                "station_id": metar.get("icaoId", ""),
                "iata_code": metar.get("icaoId", "")[1:] if metar.get("icaoId", "").startswith("K") else metar.get("icaoId", ""),
                "observation_time": metar.get("reportTime", ""),
                "raw_metar": metar.get("rawOb", ""),

                # Wind
                "wind_direction_deg": _safe_number(metar.get("wdir")),
                "wind_speed_kt": metar.get("wspd"),
                "wind_gust_kt": metar.get("wgst"),

                # Visibility
                "visibility_miles": _safe_number(metar.get("visib")),

                # Temperature & Pressure
                "temperature_c": metar.get("temp"),
                "dewpoint_c": metar.get("dewp"),
                "altimeter_inhg": metar.get("altim"),

                # Clouds
                "cloud_cover": _parse_cloud_cover(metar.get("clouds", [])),
                "ceiling_ft": _parse_ceiling(metar.get("clouds", [])),

                # Weather phenomena
                "weather_string": metar.get("wxString", ""),

                # Flight rules
                "flight_category": metar.get("fltcat", ""),

                # Metadata
                "polled_at": datetime.now(timezone.utc).isoformat(),
            }
            observations.append(obs)

        log.info(f"Fetched {len(observations)} METAR observations")
        return observations

    except requests.RequestException as e:
        log.warning(f"NOAA METAR API error: {e}")
        return []


def _parse_cloud_cover(clouds: list) -> str:
    """Extract the most significant cloud coverage from METAR clouds array."""
    if not clouds:
        return "CLR"
    # Cloud cover codes: SKC, CLR, FEW, SCT, BKN, OVC
    covers = [c.get("cover", "") for c in clouds if c.get("cover")]
    priority = {"OVC": 5, "BKN": 4, "SCT": 3, "FEW": 2, "CLR": 1, "SKC": 0}
    if covers:
        return max(covers, key=lambda x: priority.get(x, 0))
    return "CLR"


def _parse_ceiling(clouds: list) -> float:
    """Extract ceiling height (lowest BKN or OVC layer) in feet."""
    if not clouds:
        return None
    for cloud in clouds:
        cover = cloud.get("cover", "")
        if cover in ("BKN", "OVC"):
            base = cloud.get("base")
            if base is not None:
                return float(base)
    return None


def save_to_duckdb(observations: list[dict], db_path: str = DB_PATH):
    """Save weather observations to DuckDB."""
    if not observations:
        return

    import pandas as pd
    df = pd.DataFrame(observations)

    con = duckdb.connect(db_path)

    con.execute("""
        CREATE TABLE IF NOT EXISTS raw_weather_observations (
            station_id VARCHAR,
            iata_code VARCHAR,
            observation_time VARCHAR,
            raw_metar VARCHAR,
            wind_direction_deg DOUBLE,
            wind_speed_kt DOUBLE,
            wind_gust_kt DOUBLE,
            visibility_miles DOUBLE,
            temperature_c DOUBLE,
            dewpoint_c DOUBLE,
            altimeter_inhg DOUBLE,
            cloud_cover VARCHAR,
            ceiling_ft DOUBLE,
            weather_string VARCHAR,
            flight_category VARCHAR,
            polled_at VARCHAR
        )
    """)

    con.execute("INSERT INTO raw_weather_observations SELECT * FROM df")
    count = con.execute("SELECT count(*) FROM raw_weather_observations").fetchone()[0]
    log.info(f"Saved {len(df)} observations. Total in DB: {count:,}")
    con.close()


def save_to_json(observations: list[dict]):
    """Save snapshot as JSON backup."""
    out_dir = Path("data/weather_snapshots/")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filepath = out_dir / f"metar_{ts}.json"
    with open(filepath, "w") as f:
        json.dump(observations, f, indent=2)
    log.info(f"Saved JSON: {filepath}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch NOAA aviation weather (METARs)")
    parser.add_argument("--interval", type=int, default=300,
                        help="Poll interval in seconds (default: 5 min)")
    parser.add_argument("--once", action="store_true", help="Poll once and exit")
    args = parser.parse_args()

    if args.once:
        obs = fetch_metar(HUB_AIRPORTS_ICAO)
        save_to_duckdb(obs)
        save_to_json(obs)
    else:
        log.info(f"Starting weather polling every {args.interval}s. Ctrl+C to stop.")
        while True:
            obs = fetch_metar(HUB_AIRPORTS_ICAO)
            save_to_duckdb(obs)
            save_to_json(obs)
            time.sleep(args.interval)