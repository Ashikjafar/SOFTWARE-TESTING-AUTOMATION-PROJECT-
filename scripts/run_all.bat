@echo off
REM Runs Baseline, Normal, Peak and High load tests (Windows).
REM Prerequisites: Java, Apache JMeter bin folder on PATH, Node.js, Python.
REM Start the sample app first in another terminal:  cd sample-app && node server.js

setlocal
set ROOT=%~dp0..
set PLAN=%ROOT%\jmeter\web_load_test.jmx
set OUT=%ROOT%\results
if "%HOST%"=="" set HOST=localhost
if "%PORT%"=="" set PORT=3000

if not exist "%OUT%" mkdir "%OUT%"

call :run baseline 10 5 5
call :run normal 50 15 3
call :run peak 100 30 2
call :run high 200 30 2

python "%ROOT%\scripts\analyze_results.py" "%OUT%\baseline.jtl" "%OUT%\normal.jtl" "%OUT%\peak.jtl" "%OUT%\high.jtl" --markdown "%OUT%\summary.md"
echo Done. Open %OUT%\dashboard_peak\index.html in a browser.
goto :eof

:run
echo === Running %1: %2 users, ramp-up %3s, %4 loops ===
if exist "%OUT%\%1.jtl" del "%OUT%\%1.jtl"
if exist "%OUT%\dashboard_%1" rmdir /s /q "%OUT%\dashboard_%1"
call jmeter -n -t "%PLAN%" -Jhost=%HOST% -Jport=%PORT% -Jcsv="%ROOT%\jmeter\users.csv" -Jusers=%2 -Jrampup=%3 -Jloops=%4 -l "%OUT%\%1.jtl" -e -o "%OUT%\dashboard_%1"
goto :eof
