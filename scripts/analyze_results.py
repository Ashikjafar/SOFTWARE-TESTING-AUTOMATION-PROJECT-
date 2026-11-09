#!/usr/bin/env python3
"""Summarise JMeter .jtl (CSV) result files into a Summary/Aggregate style table.

Usage:
    python scripts/analyze_results.py results/baseline.jtl results/normal.jtl ...
    python scripts/analyze_results.py results/*.jtl --markdown results/summary.md
"""
import argparse
import csv
import os
import statistics
import sys


def percentile(sorted_vals, p):
    if not sorted_vals:
        return 0
    k = max(0, min(len(sorted_vals) - 1, int(round(p / 100 * len(sorted_vals) + 0.5)) - 1))
    return sorted_vals[k]


def analyse(path):
    elapsed, latency, ts_start, ts_end, errors, users = [], [], None, None, 0, 0
    by_label = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            e = int(row["elapsed"])
            ts = int(row["timeStamp"])
            ok = row["success"].strip().lower() == "true"
            elapsed.append(e)
            latency.append(int(row.get("Latency") or 0))
            ts_start = ts if ts_start is None else min(ts_start, ts)
            ts_end = ts + e if ts_end is None else max(ts_end, ts + e)
            errors += 0 if ok else 1
            users = max(users, int(row.get("allThreads") or 0))
            d = by_label.setdefault(row["label"], {"e": [], "err": 0})
            d["e"].append(e)
            d["err"] += 0 if ok else 1
    n = len(elapsed)
    if n == 0:
        raise SystemExit(f"No samples found in {path}")
    duration = max((ts_end - ts_start) / 1000.0, 0.001)
    s = sorted(elapsed)
    return {
        "name": os.path.splitext(os.path.basename(path))[0],
        "users": users,
        "samples": n,
        "failed": errors,
        "avg": statistics.mean(elapsed),
        "min": s[0],
        "max": s[-1],
        "p90": percentile(s, 90),
        "p95": percentile(s, 95),
        "latency": statistics.mean(latency),
        "throughput": n / duration,
        "error_pct": errors / n * 100,
        "labels": by_label,
    }


def status(r):
    if r["error_pct"] >= 2.0 or r["avg"] >= 1500:
        return "OBSERVE"
    return "PASS"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--markdown", help="also write the tables to this markdown file")
    args = ap.parse_args()

    results = [analyse(p) for p in args.files]
    lines = []
    lines.append("| Load Level | Users | Samples | Avg (ms) | Min | Max | 90% | 95% | Latency (ms) | Throughput (req/s) | Error % | Status |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in results:
        lines.append(
            f"| {r['name']} | {r['users']} | {r['samples']} | {r['avg']:.0f} | {r['min']} | {r['max']} | "
            f"{r['p90']} | {r['p95']} | {r['latency']:.0f} | {r['throughput']:.1f} | {r['error_pct']:.2f} | {status(r)} |"
        )
    lines.append("")
    for r in results:
        lines.append(f"### Per-request breakdown: {r['name']}")
        lines.append("| Request | Samples | Avg (ms) | Max (ms) | Error % |")
        lines.append("|---|---|---|---|---|")
        for label, d in r["labels"].items():
            lines.append(f"| {label} | {len(d['e'])} | {statistics.mean(d['e']):.0f} | {max(d['e'])} | {d['err']/len(d['e'])*100:.2f} |")
        lines.append("")
    out = "\n".join(lines)
    print(out)
    if args.markdown:
        with open(args.markdown, "w", encoding="utf-8") as f:
            f.write("# Load Test Summary\n\n" + out + "\n")
        print(f"\nSaved to {args.markdown}", file=sys.stderr)


if __name__ == "__main__":
    main()
