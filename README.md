# Load Testing using Apache JMeter

**Software Testing Automation Project** — B.Tech Artificial Intelligence and Data Science
Excel Engineering College (Autonomous), Komarapalayam — Nov 2026
Submitted by: **Kamal D** (730923201052) | Supervisor: R. Thilagavathi, M.E.

## About

This project load-tests a web application with Apache JMeter. Virtual users are simulated at four
load levels (Baseline, Normal, Peak, High) and the server is measured for response time, latency,
throughput and error percentage, so slow transactions and the point of degradation can be found.

The repo contains everything needed to run the full experiment on one machine:

| Part | Purpose |
|---|---|
| `sample-app/server.js` | Sample shop web app (the system under test), Node.js, no dependencies |
| `jmeter/web_load_test.jmx` | JMeter test plan |
| `jmeter/users.csv` | Test data (CSV Data Set Config) |
| `scripts/run_all.sh` / `run_all.bat` | Run all 4 load levels in non-GUI mode |
| `scripts/analyze_results.py` | Builds Summary / Aggregate style tables from the `.jtl` results |
| `results/` | Output folder for `.jtl` files, HTML dashboards and `summary.md` |

## Project structure

```
SOFTWARE-TESTING-AUTOMATION-PROJECT-/
├── sample-app/
│   ├── server.js
│   └── package.json
├── jmeter/
│   ├── web_load_test.jmx
│   └── users.csv
├── scripts/
│   ├── run_all.sh
│   ├── run_all.bat
│   └── analyze_results.py
├── results/
└── README.md
```

## Test plan design

| Element | Configuration |
|---|---|
| Test Plan | Web Application Load Test |
| Thread Group | Users / ramp-up / loops set by properties `users`, `rampup`, `loops` (default 100 users, 30 s ramp-up, 2 loops) |
| HTTP Request Defaults | host, port, protocol via `-Jhost -Jport -Jprotocol` |
| HTTP Cookie Manager | Keeps each user's login session |
| CSV Data Set Config | `users.csv` gives username, password, search term |
| Samplers | Home, Login (POST), Browse Products, Search, Product Details, Logout |
| Assertions | Response code 200 / expected response text |
| Timer | Constant Timer, think time 500 ms (`-Jthink`) |
| Listeners | Summary Report, Aggregate Report (GUI); `.jtl` + HTML dashboard (non-GUI) |

## Prerequisites

1. **Java 8+** — check with `java -version`
2. **Apache JMeter 5.6+** — download the binary zip from https://jmeter.apache.org/download_jmeter.cgi, unzip it, and add its `bin` folder to your PATH. Check with `jmeter -v`
3. **Node.js 16+** — check with `node -v` (runs the sample app)
4. **Python 3** — check with `python3 -V` (runs the result analysis)

## How to run

### Step 1 — Start the sample web application

```bash
cd sample-app
node server.js
```

You should see `Sample app running at http://localhost:3000`. Check it by opening
http://localhost:3000/health in a browser. Leave this terminal open.

### Step 2A — Run everything automatically (recommended)

Open a second terminal in the project root.

Linux / macOS / Git Bash:
```bash
bash scripts/run_all.sh
```

Windows (Command Prompt):
```bat
scripts\run_all.bat
```

This runs Baseline (10 users), Normal (50), Peak (100) and High (200), writes the results to
`results/`, and prints the summary table. Open `results/dashboard_peak/index.html` for the HTML dashboard.

### Step 2B — Run a single test in non-GUI mode

```bash
jmeter -n -t jmeter/web_load_test.jmx -Jcsv=jmeter/users.csv \
       -Jusers=100 -Jrampup=30 -Jloops=2 \
       -l results/peak.jtl -e -o results/dashboard_peak
python3 scripts/analyze_results.py results/peak.jtl
```

### Step 2C — Use the JMeter GUI (for the demo and screenshots)

1. Run `jmeter` to open the GUI.
2. File → Open → `jmeter/web_load_test.jmx`.
3. Click the **CSV Data Set Config** and set the Filename to the full path of `jmeter/users.csv`.
4. Click the green **Start** button.
5. Open **Summary Report** and **Aggregate Report** to see the metrics and take screenshots for your report.

Note: use the GUI only for small runs. For 100+ users use non-GUI mode, as the report recommends.

## Command-line properties

| Property | Default | Meaning |
|---|---|---|
| `-Jusers` | 100 | Number of virtual users |
| `-Jrampup` | 30 | Ramp-up time in seconds |
| `-Jloops` | 2 | Iterations per user |
| `-Jthink` | 500 | Think time in ms |
| `-Jhost` / `-Jport` / `-Jprotocol` | localhost / 3000 / http | Target server |
| `-Jcsv` | users.csv | Path to the CSV data file |

## Testing your own application

Start your app, then pass its host and port, for example:
`jmeter -n -t jmeter/web_load_test.jmx -Jhost=myapp.com -Jport=443 -Jprotocol=https ...`
and change the sampler paths and assertions in the `.jmx` to match your pages.

## Metrics explained

- **Response time** — time for the server to complete a request.
- **Latency** — time until the first byte of the response arrives.
- **Throughput** — requests processed per second.
- **Error %** — requests that failed or did not meet the assertion.
- **90% / 95% line** — response time under which 90% / 95% of requests completed.

## Expected behaviour

The sample app adds delay per concurrent request and returns HTTP 503 when overloaded, so results
should show response time and error % rising from Baseline to High load. Exact numbers depend on
your machine and are produced by running the test; the table in the project report is a sample.

## Tuning the sample app

Environment variables change how quickly the server degrades:

```bash
BASE_DELAY_MS=100 PENALTY_MS=6 OVERLOAD=120 PORT=3000 node server.js
```

## Troubleshooting

- `jmeter: command not found` — add JMeter's `bin` folder to PATH, or call it with its full path.
- `Connection refused` — the sample app is not running (Step 1).
- Zero samples in results — the CSV path is wrong; pass `-Jcsv=<full path to users.csv>`.
- Port in use — start the app on another port (`PORT=3001 node server.js`) and pass `-Jport=3001`.

## Future enhancements

Distributed testing, CI/CD integration (GitHub Actions), server CPU/memory monitoring,
database monitoring, correlation of dynamic values, and HTML dashboard automation.
