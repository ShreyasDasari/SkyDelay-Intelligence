"""
Lightweight dbt model runner using DuckDB directly.
Executes staging → intermediate → mart models in dependency order.
"""

import re
import logging
from pathlib import Path

import duckdb

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

DB_PATH = "../../data/skydelay.duckdb"


def read_sql(filepath: str) -> str:
    """Read a .sql file and strip Jinja blocks."""
    text = Path(filepath).read_text()
    
    # Remove {{ config(...) }} blocks (single or multi-line)
    text = re.sub(r"\{\{\s*config\(.*?\)\s*\}\}", "", text, flags=re.DOTALL)
    
    # Replace {{ ref('model_name') }} with the actual table name
    text = re.sub(r"\{\{\s*ref\(\s*['\"](\w+)['\"]\s*\)\s*\}\}", r"\1", text)
    
    # Remove any remaining empty Jinja blocks
    text = re.sub(r"\{\{.*?\}\}", "", text, flags=re.DOTALL)
    
    # Clean up extra blank lines
    text = re.sub(r"\n\s*\n\s*\n", "\n\n", text)
    
    return text.strip()


def run_model(con: duckdb.DuckDBPyConnection, name: str, filepath: str, materialized: str = "view"):
    """Execute a single model as a view or table."""
    sql = read_sql(filepath)

    # Drop existing object regardless of type
    try:
        con.execute(f"DROP VIEW IF EXISTS {name} CASCADE")
    except:
        pass
    try:
        con.execute(f"DROP TABLE IF EXISTS {name} CASCADE")
    except:
        pass

    create_type = "VIEW" if materialized == "view" else "TABLE"
    full_sql = f"CREATE {create_type} {name} AS {sql}"

    try:
        con.execute(full_sql)
        count = con.execute(f"SELECT count(*) FROM {name}").fetchone()[0]
        log.info(f"✅ {name} ({materialized}) — {count:,} rows")
    except Exception as e:
        log.error(f"❌ {name} FAILED: {e}")
        log.error(f"SQL preview:\n{full_sql[:500]}")
        raise


def main():
    con = duckdb.connect(DB_PATH)

    log.info("=" * 60)
    log.info("SKYDELAY dbt MODEL RUNNER")
    log.info("=" * 60)

    # Layer 1: Staging
    log.info("\n📦 STAGING LAYER")
    run_model(con, "stg_bts_flights",
              "models/staging/stg_bts_flights.sql", "view")
    run_model(con, "stg_opensky_positions",
              "models/staging/stg_opensky_positions.sql", "view")
    run_model(con, "stg_weather_observations",
              "models/staging/stg_weather_observations.sql", "view")
    run_model(con, "stg_faa_delays",
              "models/staging/stg_faa_delays.sql", "view")

    # Layer 2: Intermediate
    log.info("\n📦 INTERMEDIATE LAYER")
    run_model(con, "int_airport_daily_metrics",
              "models/intermediate/int_airport_daily_metrics.sql", "view")
    run_model(con, "int_route_performance",
              "models/intermediate/int_route_performance.sql", "view")

    # Layer 3: Marts
    log.info("\n📦 MARTS LAYER")
    run_model(con, "mart_delay_economics",
              "models/marts/mart_delay_economics.sql", "table")
    run_model(con, "mart_cascade_vulnerability",
              "models/marts/mart_cascade_vulnerability.sql", "table")
    run_model(con, "mart_route_economics",
              "models/marts/mart_route_economics.sql", "table")

    # Verify
    log.info("\n" + "=" * 60)
    log.info("📊 VERIFICATION")
    tables = con.execute("SHOW TABLES").fetchdf()
    log.info(f"Tables in database: {tables['name'].tolist()}")
    log.info("=" * 60)

    con.close()


if __name__ == "__main__":
    main()