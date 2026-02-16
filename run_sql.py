"""Quick SQL query runner against SkyDelay DuckDB."""
import sys
from pathlib import Path
import duckdb

con = duckdb.connect("data/skydelay.duckdb", read_only=True)

sql_dir = Path("sql")
sql_files = sorted(sql_dir.glob("*.sql"))

if len(sys.argv) < 2:
    print("Available queries:")
    for f in sql_files:
        print(f"  python run_sql.py {f.name}")
    sys.exit(0)

filepath = sql_dir / sys.argv[1]
if not filepath.exists():
    # Try matching by number prefix
    matches = [f for f in sql_files if f.name.startswith(sys.argv[1])]
    filepath = matches[0] if matches else filepath

print(f"\nRunning: {filepath.name}\n")
sql = filepath.read_text()
# Strip comment-only lines for cleaner execution
sql_clean = "\n".join(l for l in sql.split("\n") if not l.strip().startswith("--"))
print(con.execute(sql_clean).fetchdf().to_string())
con.close()