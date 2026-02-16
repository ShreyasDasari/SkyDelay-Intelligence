"""
BTS On-Time Performance Data Loader
Downloads and loads historical flight delay data from Bureau of Transportation Statistics.
Data source: https://www.transtats.bts.gov/DL_SelectFields.aspx

Usage:
    python -m src.ingestion.bts_historical_loader --year 2024 --months 1 12
"""

import os
import io
import zipfile
import logging
from pathlib import Path

import duckdb
import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

DB_PATH = os.getenv("DUCKDB_PATH", "data/skydelay.duckdb")

# BTS columns we care about (subset of 100+ available fields)
KEEP_COLS = [
    "Year", "Quarter", "Month", "DayofMonth", "DayOfWeek",
    "FlightDate", "Reporting_Airline", "IATA_CODE_Reporting_Airline",
    "Flight_Number_Reporting_Airline",
    "Origin", "OriginCityName", "OriginState",
    "Dest", "DestCityName", "DestState",
    "CRSDepTime", "DepTime", "DepDelay", "DepDelayMinutes", "DepDel15",
    "CRSArrTime", "ArrTime", "ArrDelay", "ArrDelayMinutes", "ArrDel15",
    "Cancelled", "CancellationCode", "Diverted",
    "CRSElapsedTime", "ActualElapsedTime", "AirTime", "Distance",
    "CarrierDelay", "WeatherDelay", "NASDelay",
    "SecurityDelay", "LateAircraftDelay",
]


def load_bts_csv(filepath: str, con: duckdb.DuckDBPyConnection) -> int:
    """Load a single BTS CSV file into DuckDB raw table."""
    log.info(f"Loading {filepath}")

    df = pd.read_csv(
        filepath,
        usecols=lambda c: c.strip() in KEEP_COLS,
        low_memory=False,
        encoding="latin-1",
    )
    df.columns = [c.strip().lower() for c in df.columns]

    # Basic quality checks before loading
    assert len(df) > 0, f"Empty dataframe from {filepath}"
    assert "flightdate" in df.columns, "Missing flightdate column"

    con.execute("CREATE TABLE IF NOT EXISTS raw_bts_flights AS SELECT * FROM df WHERE 1=0")
    con.execute("INSERT INTO raw_bts_flights SELECT * FROM df")

    row_count = len(df)
    log.info(f"Loaded {row_count:,} rows from {filepath}")
    return row_count


def create_indices(con: duckdb.DuckDBPyConnection):
    """Create indices for common query patterns."""
    log.info("Creating indices...")
    con.execute("CREATE INDEX IF NOT EXISTS idx_origin ON raw_bts_flights(origin)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_dest ON raw_bts_flights(dest)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_date ON raw_bts_flights(flightdate)")
    log.info("Indices created")


def print_summary(con: duckdb.DuckDBPyConnection):
    """Print summary statistics after load."""
    stats = con.execute("""
        SELECT
            count(*) as total_flights,
            count(DISTINCT origin) as unique_origins,
            count(DISTINCT dest) as unique_destinations,
            min(flightdate) as earliest_date,
            max(flightdate) as latest_date,
            round(avg(depdelayminutes), 1) as avg_dep_delay_min,
            round(sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) * 100.0 / count(*), 1)
                as pct_delayed_15plus,
            round(sum(cancelled) * 100.0 / count(*), 2) as pct_cancelled
        FROM raw_bts_flights
    """).fetchone()

    log.info("=" * 60)
    log.info(f"Total flights loaded:      {stats[0]:>12,}")
    log.info(f"Unique origin airports:    {stats[1]:>12,}")
    log.info(f"Unique dest airports:      {stats[2]:>12,}")
    log.info(f"Date range:                {stats[3]} → {stats[4]}")
    log.info(f"Avg departure delay:       {stats[5]:>12} min")
    log.info(f"% delayed 15+ min:         {stats[6]:>12}%")
    log.info(f"% cancelled:               {stats[7]:>12}%")
    log.info("=" * 60)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Load BTS on-time data into DuckDB")
    parser.add_argument("--csv-dir", default="data/bts/", help="Directory with BTS CSV files")
    args = parser.parse_args()

    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(DB_PATH)

    csv_dir = Path(args.csv_dir)
    if not csv_dir.exists():
        log.error(f"Directory {csv_dir} not found. Download BTS data from:")
        log.error("  https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FGJ")
        log.error("Select 'Prezipped File' for the month/year you want.")
        raise SystemExit(1)

    total = 0
    for f in sorted(csv_dir.glob("*.csv")):
        total += load_bts_csv(str(f), con)

    create_indices(con)
    print_summary(con)
    log.info(f"Done. Database at {DB_PATH} ({total:,} total rows)")
    con.close()