#!/usr/bin/env bash
# Runs Baseline, Normal, Peak and High load tests in JMeter non-GUI mode,
# then generates the summary table and an HTML dashboard for the Peak run.
#
# Prerequisites: Java 8+, Apache JMeter on PATH (jmeter), Node.js, Python 3.
# Start the sample app first:  cd sample-app && node server.js
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLAN="$ROOT/jmeter/web_load_test.jmx"
OUT="$ROOT/results"
HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"

mkdir -p "$OUT"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "ERROR: 'jmeter' not found on PATH. Install Apache JMeter and add its bin folder to PATH." >&2
  exit 1
fi

if ! curl -s "http://$HOST:$PORT/health" >/dev/null; then
  echo "ERROR: sample app not reachable at http://$HOST:$PORT. Run: cd sample-app && node server.js" >&2
  exit 1
fi

# name  users  ramp-up(s)  loops
SCENARIOS=(
  "baseline 10 5 5"
  "normal 50 15 3"
  "peak 100 30 2"
  "high 200 30 2"
)

for s in "${SCENARIOS[@]}"; do
  read -r NAME USERS RAMP LOOPS <<<"$s"
  echo "=== Running $NAME: $USERS users, ramp-up ${RAMP}s, $LOOPS loops ==="
  rm -rf "$OUT/$NAME.jtl" "$OUT/dashboard_$NAME"
  jmeter -n -t "$PLAN" \
    -Jhost="$HOST" -Jport="$PORT" \
    -Jcsv="$ROOT/jmeter/users.csv" \
    -Jusers="$USERS" -Jrampup="$RAMP" -Jloops="$LOOPS" \
    -l "$OUT/$NAME.jtl" \
    -e -o "$OUT/dashboard_$NAME"
done

echo "=== Summary ==="
python3 "$ROOT/scripts/analyze_results.py" \
  "$OUT/baseline.jtl" "$OUT/normal.jtl" "$OUT/peak.jtl" "$OUT/high.jtl" \
  --markdown "$OUT/summary.md"

echo "Done. HTML dashboards: $OUT/dashboard_<name>/index.html"
