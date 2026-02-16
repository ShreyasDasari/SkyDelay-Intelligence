"""
OpenSky Network Producer — Live Aircraft Position Data
Polls the OpenSky REST API for real-time aircraft state vectors (ADS-B data).
Stores snapshots in DuckDB for analysis.

API docs: https://openskynetwork.github.io/opensky-api/rest.html

Rate limits:
  - Anonymous: 100 calls/day (10 second resolution)
  - Authenticated: 4,000 calls/day (5 second resolution)

Usage:
    python -m src.ingestion.opensky_producer --once
    python -m src.ingestion.opensky_producer --interval 30
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

OPENSKY_API = "https://opensky-network.org/api/states/all"
DB_PATH = "data/skydelay.duckdb"

# Bounding box for Continental US
US_BOUNDS = {
    "lamin": 24.396308,   # South (Key West)
    "lamax": 49.384358,   # North (Canadian border)
    "lomin": -125.0,      # West (Pacific coast)
    "lomax": -66.93457,   # East (Atlantic coast)
}


def fetch_aircraft_states(bbox: dict = None) -> list[dict]:
    """
    Fetch current aircraft state vectors from OpenSky.
    Returns list of aircraft with position, velocity, altitude.
    """
    params = bbox or US_BOUNDS

    try:
        resp = requests.get(OPENSKY_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if not data or "states" not in data or data["states"] is None:
            log.warning("No aircraft states returned")
            return []

        timestamp = data.get("time", int(time.time()))

        # Parse state vectors into dicts
        # Columns: https://openskynetwork.github.io/opensky-api/rest.html
        columns = [
            "icao24", "callsign", "origin_country", "time_position",
            "last_contact", "longitude", "latitude", "baro_altitude",
            "on_ground", "velocity", "true_track", "vertical_rate",
            "sensors", "geo_altitude", "squawk", "spi", "position_source",
        ]

        # Some responses have 18 columns (added "category" field)
        aircraft = []
        for state in data["states"]:
            row = {}
            for i, col in enumerate(columns):
                if i < len(state):
                    row[col] = state[i]
            row["snapshot_time"] = timestamp
            row["polled_at"] = datetime.now(timezone.utc).isoformat()

            # Clean callsign (strip whitespace)
            if row.get("callsign"):
                row["callsign"] = row["callsign"].strip()

            # Only keep aircraft with valid positions
            if row.get("latitude") is not None and row.get("longitude") is not None:
                aircraft.append(row)

        log.info(f"Fetched {len(aircraft)} aircraft over Continental US "
                 f"(timestamp: {timestamp})")
        return aircraft

    except requests.exceptions.Timeout:
        log.warning("OpenSky API timeout — retrying next cycle")
        return []
    except requests.RequestException as e:
        log.warning(f"OpenSky API error: {e}")
        return []


def save_to_duckdb(aircraft: list[dict], db_path: str = DB_PATH):
    """Save aircraft snapshot to DuckDB."""
    if not aircraft:
        return

    import pandas as pd
    df = pd.DataFrame(aircraft)

    # Keep only the columns we need
    keep_cols = [
        "icao24", "callsign", "origin_country", "longitude", "latitude",
        "baro_altitude", "geo_altitude", "on_ground", "velocity",
        "true_track", "vertical_rate", "snapshot_time", "polled_at",
    ]
    df = df[[c for c in keep_cols if c in df.columns]]

    con = duckdb.connect(db_path)

    # Create table if not exists
    con.execute("""
        CREATE TABLE IF NOT EXISTS raw_opensky_positions (
            icao24 VARCHAR,
            callsign VARCHAR,
            origin_country VARCHAR,
            longitude DOUBLE,
            latitude DOUBLE,
            baro_altitude DOUBLE,
            geo_altitude DOUBLE,
            on_ground BOOLEAN,
            velocity DOUBLE,
            true_track DOUBLE,
            vertical_rate DOUBLE,
            snapshot_time BIGINT,
            polled_at VARCHAR
        )
    """)

    con.execute("INSERT INTO raw_opensky_positions SELECT * FROM df")
    count = con.execute("SELECT count(*) FROM raw_opensky_positions").fetchone()[0]
    log.info(f"Saved {len(df)} records. Total in DB: {count:,}")
    con.close()


def save_to_json(aircraft: list[dict]):
    """Save snapshot as JSON file (backup)."""
    out_dir = Path("data/opensky_snapshots/")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filepath = out_dir / f"opensky_{ts}.json"
    with open(filepath, "w") as f:
        json.dump(aircraft, f)
    log.info(f"Saved JSON snapshot: {filepath}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Poll OpenSky Network for aircraft positions")
    parser.add_argument("--interval", type=int, default=30,
                        help="Poll interval in seconds (min 10 for anonymous)")
    parser.add_argument("--once", action="store_true", help="Poll once and exit")
    parser.add_argument("--json-only", action="store_true", help="Save JSON only, skip DuckDB")
    args = parser.parse_args()

    if args.once:
        aircraft = fetch_aircraft_states()
        if not args.json_only:
            save_to_duckdb(aircraft)
        save_to_json(aircraft)
    else:
        log.info(f"Starting continuous polling every {args.interval}s. Ctrl+C to stop.")
        while True:
            aircraft = fetch_aircraft_states()
            if not args.json_only:
                save_to_duckdb(aircraft)
            save_to_json(aircraft)
            time.sleep(args.interval)