"""
SkyDelay Self-Healing Pipeline Agent (LangGraph + Gemini)

An autonomous agent that:
1. Monitors the health of all data sources in the pipeline
2. Detects issues (stale data, missing tables, empty sources, schema drift)
3. Diagnoses the root cause using Gemini reasoning
4. Takes remediation actions (re-ingests data, rebuilds models, alerts)
5. Generates a human-readable health report

"""

import os
import sys
import json
import logging
import subprocess
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import TypedDict, Annotated

import duckdb

PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
sys.path.insert(0, PROJECT_ROOT)
DB_PATH = os.path.join(PROJECT_ROOT, "data", "skydelay.duckdb")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ── State Definition ────────────────────────────────────────
class PipelineState(TypedDict):
    """State that flows through the LangGraph agent."""
    health_checks: list[dict]
    issues_detected: list[dict]
    diagnosis: str
    actions_taken: list[dict]
    final_report: str
    iteration: int


# ══════════════════════════════════════════════════════════════
# NODE 1: Health Check — Inspect all data sources
# ══════════════════════════════════════════════════════════════
def check_pipeline_health(state: PipelineState) -> PipelineState:
    """Inspect every table in the pipeline for freshness, completeness, and schema."""
    log.info("🔍 NODE 1: Running pipeline health checks...")

    con = duckdb.connect(DB_PATH, read_only=True)
    checks = []

    # Define what we expect from each table
    expectations = {
        "raw_bts_flights": {
            "min_rows": 100000,
            "freshness_col": "flightdate",
            "freshness_max_age_hours": None,  # Batch data, no freshness requirement
            "required_columns": ["origin", "dest", "depdelayminutes", "flightdate"],
        },
        "raw_opensky_positions": {
            "min_rows": 1,
            "freshness_col": "polled_at",
            "freshness_max_age_hours": 24,
            "required_columns": ["icao24", "latitude", "longitude", "velocity"],
        },
        "raw_weather_observations": {
            "min_rows": 1,
            "freshness_col": "polled_at",
            "freshness_max_age_hours": 6,
            "required_columns": ["station_id", "temperature_c", "wind_speed_kt", "visibility_miles"],
        },
        "raw_faa_airport_status": {
            "min_rows": 1,
            "freshness_col": "polled_at",
            "freshness_max_age_hours": 2,
            "required_columns": ["airport_code", "delay_type", "has_delay"],
        },
        "stg_bts_flights": {
            "min_rows": 100000,
            "freshness_col": None,
            "freshness_max_age_hours": None,
            "required_columns": ["origin_airport", "dest_airport", "dep_delay_abs_minutes"],
        },
        "mart_delay_economics": {
            "min_rows": 1000,
            "freshness_col": None,
            "freshness_max_age_hours": None,
            "required_columns": ["airport", "est_total_economic_impact"],
        },
        "mart_cascade_vulnerability": {
            "min_rows": 10,
            "freshness_col": None,
            "freshness_max_age_hours": None,
            "required_columns": ["airport", "vulnerability_rank"],
        },
    }

    for table, expect in expectations.items():
        check = {
            "table": table,
            "status": "healthy",
            "issues": [],
            "row_count": 0,
            "latest_record": None,
        }

        try:
            # Check existence and row count
            count = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            check["row_count"] = count

            if count == 0:
                check["status"] = "critical"
                check["issues"].append("Table is EMPTY")
            elif count < expect["min_rows"]:
                check["status"] = "warning"
                check["issues"].append(
                    f"Row count {count:,} below expected minimum {expect['min_rows']:,}"
                )

            # Check freshness for streaming sources
            if expect["freshness_col"] and expect["freshness_max_age_hours"]:
                latest = con.execute(
                    f"SELECT max({expect['freshness_col']}) FROM {table}"
                ).fetchone()[0]
                check["latest_record"] = str(latest)

                if latest:
                    # Parse the timestamp
                    try:
                        if "T" in str(latest):
                            latest_dt = datetime.fromisoformat(str(latest).replace("Z", "+00:00"))
                        else:
                            latest_dt = datetime.strptime(str(latest)[:19], "%Y-%m-%d %H:%M:%S")
                            latest_dt = latest_dt.replace(tzinfo=timezone.utc)

                        age_hours = (datetime.now(timezone.utc) - latest_dt).total_seconds() / 3600
                        if age_hours > expect["freshness_max_age_hours"]:
                            check["status"] = "stale"
                            check["issues"].append(
                                f"Data is {age_hours:.1f} hours old "
                                f"(max allowed: {expect['freshness_max_age_hours']}h)"
                            )
                    except (ValueError, TypeError) as e:
                        check["issues"].append(f"Could not parse freshness timestamp: {e}")

            # Check required columns exist
            columns = [row[0] for row in con.execute(
                f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"
            ).fetchall()]
            missing_cols = [c for c in expect["required_columns"] if c not in columns]
            if missing_cols:
                check["status"] = "critical"
                check["issues"].append(f"Missing columns: {missing_cols}")

            # Check for NULL concentration in key columns
            if count > 0 and expect["required_columns"]:
                first_col = expect["required_columns"][0]
                if first_col in columns:
                    null_count = con.execute(
                        f"SELECT count(*) FROM {table} WHERE {first_col} IS NULL"
                    ).fetchone()[0]
                    null_pct = (null_count / count) * 100
                    if null_pct > 20:
                        check["status"] = "warning"
                        check["issues"].append(
                            f"Column '{first_col}' has {null_pct:.1f}% NULL values"
                        )

        except Exception as e:
            check["status"] = "critical"
            check["issues"].append(f"Table error: {str(e)}")

        if not check["issues"]:
            check["issues"].append("All checks passed")

        checks.append(check)
        status_icon = {"healthy": "✅", "warning": "⚠️", "stale": "🕐", "critical": "❌"}
        log.info(f"  {status_icon.get(check['status'], '?')} {table}: "
                 f"{check['status']} ({check['row_count']:,} rows)")

    con.close()

    state["health_checks"] = checks
    state["iteration"] = state.get("iteration", 0) + 1
    return state


# ══════════════════════════════════════════════════════════════
# NODE 2: Detect Issues — Identify what needs attention
# ══════════════════════════════════════════════════════════════
def detect_issues(state: PipelineState) -> PipelineState:
    """Analyze health checks and compile a list of actionable issues."""
    log.info("🔎 NODE 2: Detecting issues...")

    issues = []
    for check in state["health_checks"]:
        if check["status"] != "healthy":
            issues.append({
                "table": check["table"],
                "severity": check["status"],
                "problems": check["issues"],
                "row_count": check["row_count"],
                "latest_record": check["latest_record"],
            })

    state["issues_detected"] = issues

    if issues:
        log.info(f"  Found {len(issues)} issue(s) requiring attention")
        for issue in issues:
            log.info(f"    - {issue['table']}: {issue['severity']} — {issue['problems']}")
    else:
        log.info("  No issues detected. Pipeline is fully healthy.")

    return state


# ══════════════════════════════════════════════════════════════
# NODE 3: Diagnose with LLM — Use Gemini to reason about issues
# ══════════════════════════════════════════════════════════════
def diagnose_with_llm(state: PipelineState) -> PipelineState:
    """Use Gemini to reason about the detected issues and recommend actions."""
    log.info("🧠 NODE 3: LLM diagnosis with Gemini...")

    issues = state["issues_detected"]

    if not issues:
        state["diagnosis"] = "Pipeline is healthy. No issues to diagnose."
        return state

    # Build context for the LLM
    issue_summary = json.dumps(issues, indent=2)

    prompt = f"""You are a senior data engineer diagnosing a data pipeline.
The pipeline ingests aviation data from 4 sources:
1. BTS Historical Flights (batch, CSV → DuckDB) — 1.7M US domestic flights
2. OpenSky Network (real-time, REST API) — live aircraft ADS-B positions
3. NOAA Aviation Weather (real-time, REST API) — METAR airport weather
4. FAA NAS Status (real-time, REST API) — ground delay programs, ground stops

The following issues were detected:
{issue_summary}

For each issue, provide:
1. ROOT CAUSE: Most likely reason for the issue
2. REMEDIATION: Specific command or action to fix it
3. PREVENTION: How to prevent this from recurring

Be specific and technical. Reference actual Python module paths like:
- python -m src.ingestion.opensky_producer --once
- python -m src.ingestion.noaa_weather_producer --once
- python -m src.ingestion.faa_asws_producer --once
- cd src/dbt_project && python run_models.py

Respond in JSON format with an array of objects, each having:
"table", "root_cause", "remediation_command", "prevention"
"""

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            state["diagnosis"] = (
                "GOOGLE_API_KEY not set. Cannot run LLM diagnosis. "
                "Set it with: export GOOGLE_API_KEY='your-key'\n"
                f"Issues found: {len(issues)} — manual review required."
            )
            log.warning("  ⚠️ GOOGLE_API_KEY not set. Skipping LLM diagnosis.")
            return state

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=api_key,
            temperature=0.1,
        )

        response = llm.invoke(prompt)
        state["diagnosis"] = response.content
        log.info("  ✅ Gemini diagnosis complete")

    except Exception as e:
        state["diagnosis"] = f"LLM diagnosis failed: {str(e)}. Manual review required."
        log.warning(f"  ⚠️ LLM diagnosis failed: {e}")

    return state


# ══════════════════════════════════════════════════════════════
# NODE 4: Auto-Remediate — Execute fixes for known issue patterns
# ══════════════════════════════════════════════════════════════
def auto_remediate(state: PipelineState) -> PipelineState:
    """Automatically fix known issues by re-running ingestion or model builds."""
    log.info("🔧 NODE 4: Auto-remediation...")

    actions = []
    issues = state["issues_detected"]

    for issue in issues:
        table = issue["table"]
        severity = issue["severity"]

        # Pattern: Stale streaming data → re-ingest
        if severity == "stale":
            if "opensky" in table:
                action = _run_remediation(
                    "Re-ingest OpenSky positions",
                    [sys.executable, "-m", "src.ingestion.opensky_producer", "--once"],
                )
                actions.append(action)

            elif "weather" in table:
                action = _run_remediation(
                    "Re-ingest NOAA weather",
                    [sys.executable, "-m", "src.ingestion.noaa_weather_producer", "--once"],
                )
                actions.append(action)

            elif "faa" in table:
                action = _run_remediation(
                    "Re-ingest FAA status",
                    [sys.executable, "-m", "src.ingestion.faa_asws_producer", "--once"],
                )
                actions.append(action)

        # Pattern: Empty derived tables → rebuild models
        elif severity == "critical" and ("mart_" in table or "stg_" in table):
            action = _run_remediation(
                "Rebuild dbt models",
                [sys.executable, "run_models.py"],
                cwd=os.path.join(PROJECT_ROOT, "src", "dbt_project"),
            )
            actions.append(action)

        # Pattern: Warning (low row count) → log but don't act
        elif severity == "warning":
            actions.append({
                "action": f"Monitor {table} — row count below expected",
                "status": "logged",
                "output": "No automatic action taken. Will check again next cycle.",
            })

    if not actions:
        actions.append({
            "action": "No remediation needed",
            "status": "skipped",
            "output": "All systems healthy.",
        })

    state["actions_taken"] = actions
    return state


def _run_remediation(description: str, cmd: list, cwd: str = None) -> dict:
    """Execute a remediation command and capture output."""
    log.info(f"  🔧 Running: {description}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=cwd or PROJECT_ROOT,
        )
        success = result.returncode == 0
        status = "success" if success else "failed"
        output = result.stdout[-500:] if result.stdout else result.stderr[-500:]
        log.info(f"    {'✅' if success else '❌'} {description}: {status}")
        return {
            "action": description,
            "command": " ".join(cmd),
            "status": status,
            "output": output,
        }
    except subprocess.TimeoutExpired:
        log.warning(f"    ⏰ {description}: timed out after 120s")
        return {
            "action": description,
            "command": " ".join(cmd),
            "status": "timeout",
            "output": "Command timed out after 120 seconds",
        }
    except Exception as e:
        log.error(f"    ❌ {description}: {e}")
        return {
            "action": description,
            "command": " ".join(cmd),
            "status": "error",
            "output": str(e),
        }


# ══════════════════════════════════════════════════════════════
# NODE 5: Generate Report — Human-readable summary
# ══════════════════════════════════════════════════════════════
def generate_report(state: PipelineState) -> PipelineState:
    """Generate a human-readable pipeline health report."""
    log.info("📋 NODE 5: Generating health report...")

    checks = state["health_checks"]
    issues = state["issues_detected"]
    actions = state["actions_taken"]

    total = len(checks)
    healthy = sum(1 for c in checks if c["status"] == "healthy")
    warnings = sum(1 for c in checks if c["status"] == "warning")
    stale = sum(1 for c in checks if c["status"] == "stale")
    critical = sum(1 for c in checks if c["status"] == "critical")

    overall = "🟢 HEALTHY" if healthy == total else "🟡 DEGRADED" if critical == 0 else "🔴 CRITICAL"

    report_lines = [
        "=" * 60,
        "SKYDELAY PIPELINE HEALTH REPORT",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "=" * 60,
        "",
        f"Overall Status: {overall}",
        f"Sources: {healthy}/{total} healthy | {warnings} warnings | {stale} stale | {critical} critical",
        "",
        "─── Table Health ───",
    ]

    status_icon = {"healthy": "✅", "warning": "⚠️", "stale": "🕐", "critical": "❌"}
    for check in checks:
        icon = status_icon.get(check["status"], "?")
        report_lines.append(
            f"  {icon} {check['table']:40s} {check['row_count']:>12,} rows  [{check['status']}]"
        )
        if check["status"] != "healthy":
            for issue in check["issues"]:
                report_lines.append(f"      → {issue}")

    if issues:
        report_lines.extend(["", "─── LLM Diagnosis ───"])
        diagnosis = state.get("diagnosis", "No diagnosis available")
        # Truncate long diagnosis
        if len(diagnosis) > 1000:
            diagnosis = diagnosis[:1000] + "..."
        report_lines.append(f"  {diagnosis}")

    if actions:
        report_lines.extend(["", "─── Actions Taken ───"])
        for action in actions:
            icon = "✅" if action["status"] == "success" else "⚠️" if action["status"] == "logged" else "❌"
            report_lines.append(f"  {icon} {action['action']}: {action['status']}")

    report_lines.extend(["", "=" * 60])

    report = "\n".join(report_lines)
    state["final_report"] = report
    print(report)

    return state


# ══════════════════════════════════════════════════════════════
# GRAPH: Wire up the LangGraph pipeline
# ══════════════════════════════════════════════════════════════
def should_remediate(state: PipelineState) -> str:
    """Decision node: should we attempt auto-remediation?"""
    issues = state.get("issues_detected", [])
    iteration = state.get("iteration", 1)

    if not issues:
        return "generate_report"
    elif iteration > 2:
        # Prevent infinite loops — max 2 remediation attempts
        log.info("  ⚠️ Max remediation attempts reached. Generating report.")
        return "generate_report"
    else:
        return "diagnose"


def build_agent_graph():
    """Build the LangGraph state machine."""
    from langgraph.graph import StateGraph, END

    graph = StateGraph(PipelineState)

    # Add nodes
    graph.add_node("check_health", check_pipeline_health)
    graph.add_node("detect_issues", detect_issues)
    graph.add_node("diagnose", diagnose_with_llm)
    graph.add_node("remediate", auto_remediate)
    graph.add_node("generate_report", generate_report)

    # Define edges
    graph.set_entry_point("check_health")
    graph.add_edge("check_health", "detect_issues")

    # Conditional: if issues found → diagnose → remediate, else → report
    graph.add_conditional_edges(
        "detect_issues",
        should_remediate,
        {
            "diagnose": "diagnose",
            "generate_report": "generate_report",
        },
    )

    graph.add_edge("diagnose", "remediate")
    graph.add_edge("remediate", "check_health")  # Re-check after remediation
    graph.add_edge("generate_report", END)

    return graph.compile()


# ══════════════════════════════════════════════════════════════
# Main Entry Point
# ══════════════════════════════════════════════════════════════
def main():
    log.info("🚀 Starting SkyDelay Pipeline Health Agent")
    log.info(f"   Database: {DB_PATH}")
    log.info(f"   Gemini API: {'configured' if os.getenv('GOOGLE_API_KEY') else 'NOT SET'}")
    log.info("")

    agent = build_agent_graph()

    initial_state: PipelineState = {
        "health_checks": [],
        "issues_detected": [],
        "diagnosis": "",
        "actions_taken": [],
        "final_report": "",
        "iteration": 0,
    }

    # Run the agent
    final_state = agent.invoke(initial_state)

    # Save report to file
    report_dir = Path(PROJECT_ROOT) / "data" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = report_dir / f"health_report_{ts}.txt"
    report_path.write_text(final_state["final_report"])
    log.info(f"\n📁 Report saved: {report_path}")


if __name__ == "__main__":
    main()