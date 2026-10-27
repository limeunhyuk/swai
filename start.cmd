@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js, then open this file again.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173 in your browser after the Local message appears.
echo Close this window or press Ctrl+C to stop the local server.
node scripts\serve.mjs
pause
