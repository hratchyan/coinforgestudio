@echo off
:: ============================================================
:: CoinForge Studio - rebuild the Windows exe + installer
:: Needs Node.js on PATH (any version >= 18).
::
:: NOTE: full compression needs ~4 GB of free *commit* memory.
:: This machine runs WITHOUT a pagefile, so if lots of apps are
:: open, 7-Zip dies with "Can't allocate required memory".
:: Fix: close big apps first, or enable a system-managed
:: pagefile (System > About > Advanced system settings >
:: Performance > Advanced > Virtual memory).
:: Low-memory fallback (bigger exe):
::   npx electron-builder --win -c.compression=store
:: ============================================================
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js not found on PATH. Install from https://nodejs.org
    pause
    exit /b 1
)
if not exist node_modules call npm install --no-audit --no-fund
npx electron-builder --win
echo.
echo Artifacts are in .\dist
pause