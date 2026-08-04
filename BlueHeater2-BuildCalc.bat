@echo off
rem =====================================================================
rem  Blue Heater 2 - Build Calculator launcher
rem  Made by Oush Xanax scripts
rem  Opens index.html as a standalone-looking desktop app window using
rem  Edge or Chrome "--app" mode. Falls back to default browser if
rem  neither is installed. No server, no install, no dependencies.
rem =====================================================================
setlocal EnableDelayedExpansion

set "DIR=%~dp0"
set "DIR=!DIR:\=/!"
if "!DIR:~-1!"=="/" set "DIR=!DIR:~0,-1!"
set "APP_URL=file:///!DIR!/index.html"

set "EDGE_1=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_2=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME_1=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_2=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "CHROME_3=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%EDGE_1%"   ( start "" "%EDGE_1%"   --app="!APP_URL!" --window-size=1500,950 & exit /b )
if exist "%EDGE_2%"   ( start "" "%EDGE_2%"   --app="!APP_URL!" --window-size=1500,950 & exit /b )
if exist "%CHROME_1%" ( start "" "%CHROME_1%" --app="!APP_URL!" --window-size=1500,950 & exit /b )
if exist "%CHROME_2%" ( start "" "%CHROME_2%" --app="!APP_URL!" --window-size=1500,950 & exit /b )
if exist "%CHROME_3%" ( start "" "%CHROME_3%" --app="!APP_URL!" --window-size=1500,950 & exit /b )

rem Fallback: default browser (regular tab, still no server)
start "" "%~dp0index.html"
exit /b
