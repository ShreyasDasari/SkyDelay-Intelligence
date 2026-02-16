"""
FAA NAS Status Producer — Real-Time Airport Delays & Ground Programs
Fetches current delay programs, ground stops, and ground delay programs
from the FAA National Airspace System Status API.

API: https://nasstatus.faa.gov/api/airport-status-information
Returns XML with all active delays across US airports in a single call.

Usage:
    python -m src.ingestion.faa_asws_producer --once
    python -m src.ingestion.faa_asws_producer --interval 60
"""

import json
import time
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import requests
import duckdb

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

FAA_NAS_STATUS = "https://nasstatus.faa.gov/api/airport-status-information"
DB_PATH = "data/skydelay.duckdb"


def _xml_text(element, tag: str) -> str:
    """Safely extract text from an XML element by tag name."""
    child = element.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return element.get(tag, "")


def _search_xml_text(element, tags: list[str]) -> str:
    """Try multiple tag names and return first match."""
    for tag in tags:
        result = _xml_text(element, tag)
        if result:
            return result
        # Also try case-insensitive search through all children
        for child in element:
            if child.tag.lower() == tag.lower() and child.text:
                return child.text.strip()
    return ""


def fetch_all_airport_statuses() -> list[dict]:
    """
    Fetch all airport statuses from FAA NAS Status API.
    This endpoint returns ALL airports with active delays in a single XML call.
    """
    try:
        resp = requests.get(
            FAA_NAS_STATUS,
            timeout=15,
            headers={"Accept": "application/xml"},
        )
        resp.raise_for_status()

        root = ET.fromstring(resp.text)
        records = []
        polled_at = datetime.now(timezone.utc).isoformat()

        # Walk through all elements looking for delay information
        # The XML structure can vary, so we search broadly
        for elem in root.iter():
            tag = elem.tag.lower()

            # Ground Delay Programs
            if "ground_delay" in tag or "gdp" in tag.lower():
                record = {
                    "airport_code": _search_xml_text(elem, ["ARPT", "Airport", "airport", "arpt"]),
                    "delay_type": "Ground Delay Program",
                    "delay_reason": _search_xml_text(elem, ["Reason", "reason"]),
                    "avg_delay": _search_xml_text(elem, ["Avg", "avg", "Average"]),
                    "max_delay": _search_xml_text(elem, ["Max", "max", "Maximum"]),
                    "start_time": _search_xml_text(elem, ["Start", "start", "Adv"]),
                    "end_time": _search_xml_text(elem, ["End", "end"]),
                    "has_delay": True,
                    "polled_at": polled_at,
                }
                if record["airport_code"]:
                    records.append(record)

            # Ground Stops
            elif "ground_stop" in tag:
                record = {
                    "airport_code": _search_xml_text(elem, ["ARPT", "Airport", "airport", "arpt"]),
                    "delay_type": "Ground Stop",
                    "delay_reason": _search_xml_text(elem, ["Reason", "reason"]),
                    "avg_delay": "",
                    "max_delay": "",
                    "start_time": _search_xml_text(elem, ["Start", "start"]),
                    "end_time": _search_xml_text(elem, ["End", "end"]),
                    "has_delay": True,
                    "polled_at": polled_at,
                }
                if record["airport_code"]:
                    records.append(record)

            # Arrival/Departure Delays
            elif "delay" in tag and "program" not in tag:
                airport = _search_xml_text(elem, ["ARPT", "Airport", "airport", "arpt"])
                reason = _search_xml_text(elem, ["Reason", "reason"])
                if airport and reason:
                    record = {
                        "airport_code": airport,
                        "delay_type": "Arrival/Departure Delay",
                        "delay_reason": reason,
                        "avg_delay": _search_xml_text(elem, ["Avg", "avg", "Min", "min"]),
                        "max_delay": _search_xml_text(elem, ["Max", "max"]),
                        "start_time": _search_xml_text(elem, ["Start", "start"]),
                        "end_time": _search_xml_text(elem, ["End", "end"]),
                        "has_delay": True,
                        "polled_at": polled_at,
                    }
                    records.append(record)

        # Deduplicate by airport_code + delay_type
        seen = set()
        unique_records = []
        for r in records:
            key = (r["airport_code"], r["delay_type"], r["delay_reason"])
            if key not in seen:
                seen.add(key)
                unique_records.append(r)

        # If no delays at all, record that the NAS is operating normally
        if not unique_records:
            unique_records.append({
                "airport_code": "NAS",
                "delay_type": "No Active Delays",
                "delay_reason": "National Airspace System operating normally",
                "avg_delay": "",
                "max_delay": "",
                "start_time": "",
                "end_time": "",
                "has_delay": False,
                "polled_at": polled_at,
            })

        delays_count = sum(1 for r in unique_records if r["has_delay"])
        log.info(f"Fetched {len(unique_records)} records from FAA NAS Status. "
                 f"Active delays: {delays_count}")
        return unique_records

    except requests.RequestException as e:
        log.warning(f"FAA NAS Status API error: {e}")
        return []
    except ET.ParseError as e:
        log.warning(f"Failed to parse FAA XML response: {e}")
        return []


def save_to_duckdb(results: list[dict], db_path: str = DB_PATH):
    """Save FAA delay status to DuckDB."""
    if not results:
        return

    import pandas as pd
    df = pd.DataFrame(results)

    con = duckdb.connect(db_path)
    con.execute("""
        CREATE TABLE IF NOT EXISTS raw_faa_airport_status (
            airport_code VARCHAR,
            delay_type VARCHAR,
            delay_reason VARCHAR,
            avg_delay VARCHAR,
            max_delay VARCHAR,
            start_time VARCHAR,
            end_time VARCHAR,
            has_delay BOOLEAN,
            polled_at VARCHAR
        )
    """)

    con.execute("INSERT INTO raw_faa_airport_status SELECT * FROM df")
    count = con.execute("SELECT count(*) FROM raw_faa_airport_status").fetchone()[0]
    log.info(f"Saved {len(df)} records. Total in DB: {count:,}")
    con.close()


def save_to_json(results: list[dict]):
    """Save snapshot to JSON backup."""
    out_dir = Path("data/faa_snapshots/")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filepath = out_dir / f"faa_snapshot_{ts}.json"
    with open(filepath, "w") as f:
        json.dump(results, f, indent=2)
    log.info(f"Saved snapshot: {filepath}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch FAA NAS delay status")
    parser.add_argument("--interval", type=int, default=60, help="Poll interval in seconds")
    parser.add_argument("--once", action="store_true", help="Poll once and exit")
    args = parser.parse_args()

    if args.once:
        results = fetch_all_airport_statuses()
        save_to_duckdb(results)
        save_to_json(results)
    else:
        log.info(f"Starting continuous polling every {args.interval}s. Ctrl+C to stop.")
        while True:
            results = fetch_all_airport_statuses()
            save_to_duckdb(results)
            save_to_json(results)
            time.sleep(args.interval)